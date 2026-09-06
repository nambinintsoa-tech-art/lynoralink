import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
}

function parseAttachments(value) {
  try { return value ? JSON.parse(value) : []; } catch { return []; }
}

function parseMessageMedia(value) {
  const parsed = parseAttachments(value);
  if (Array.isArray(parsed)) return { attachments: parsed, replyTo: null };
  return { attachments: Array.isArray(parsed?.attachments) ? parsed.attachments : [], replyTo: parsed?.replyTo || null };
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export async function registerMessageRoutes(app) {
  app.get("/v1/messages", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });

    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] },
      include: {
        userA: { select: { id: true, name: true, title: true, image: true } },
        userB: { select: { id: true, name: true, title: true, image: true } },
        members: { include: { user: { select: { id: true, name: true, title: true, image: true } } } },
        messages: {
          where: { deletions: { none: { userId } } },
          orderBy: { createdAt: "asc" },
          include: { reactions: { select: { userId: true, reaction: true } } },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const pageIds = [...new Set(conversations.map((conversation) => conversation.pageId).filter(Boolean))];
    const pageSettings = pageIds.length
      ? await prisma.userSetting.findMany({ where: { userId: { in: pageIds }, key: "companyPage" }, select: { userId: true, value: true } })
      : [];
    const pages = new Map(pageSettings.map((setting) => {
      try { return [setting.userId, JSON.parse(setting.value || "{}")]; } catch { return [setting.userId, {}]; }
    }));

    return reply.send({ conversations: conversations.map((conversation) => {
      const other = conversation.userAId === userId ? conversation.userB : conversation.userA;
      const page = conversation.pageId ? pages.get(conversation.pageId) : null;
      const name = conversation.isGroup
        ? conversation.groupName || conversation.members.map((member) => member.user.name).filter(Boolean).join(", ") || "Groupe"
        : page?.name || page?.displayName || other?.name || "Utilisateur";
      const messages = conversation.messages.map((message) => {
        const media = parseMessageMedia(message.mediaData);
        const replyTo = media.replyTo ? {
          id: media.replyTo.id,
          text: media.replyTo.text || "",
          from: media.replyTo.senderId === userId ? "me" : "them",
          time: media.replyTo.createdAt ? formatTime(media.replyTo.createdAt) : "",
          deletedForEveryone: Boolean(media.replyTo.deletedForEveryone),
        } : null;
        return {
          id: message.id,
          from: message.senderId === userId ? "me" : "them",
          text: message.text,
          attachments: media.attachments,
          replyTo,
          time: formatTime(message.createdAt),
          read: Boolean(message.readAt),
          reactions: message.reactions.map((reaction) => ({ emoji: reaction.reaction, from: reaction.userId === userId ? "me" : "them" })),
          deletedForEveryone: message.deletedForEveryone,
          createdAt: message.createdAt,
        };
      });
      const lastMessage = messages[messages.length - 1];
      return {
        id: conversation.id,
        otherUserId: other?.id || null,
        pageId: conversation.pageId || null,
        name,
        title: conversation.isGroup ? "Groupe" : page ? "Page entreprise" : other?.title || "Membre LynoraLink",
        image: conversation.isGroup ? null : page?.logoUrl || page?.avatarUrl || other?.image || null,
        initials: initials(name),
        isGroup: conversation.isGroup,
        memberCount: conversation.members.length,
        members: conversation.members.map((member) => ({ id: member.user.id, name: member.user.name || "Utilisateur", title: member.user.title || "Membre LynoraLink", image: member.user.image || null, initials: initials(member.user.name || "Utilisateur") })),
        online: false,
        typing: false,
        unread: conversation.messages.filter((message) => message.senderId !== userId && !message.readAt).length,
        pinned: false,
        muted: false,
        archived: false,
        messages,
        lastMessage: lastMessage ? { id: lastMessage.id, text: lastMessage.text, time: lastMessage.time } : null,
      };
    }) });
  });

  app.post("/v1/messages", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    let conversation;

    if (body.conversationId) {
      conversation = await prisma.conversation.findFirst({ where: { id: body.conversationId, OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] } });
    } else if (body.otherUserId && body.otherUserId !== userId) {
      const otherUser = await prisma.user.findUnique({ where: { id: body.otherUserId }, select: { id: true } });
      if (!otherUser) return reply.code(404).send({ error: "Utilisateur introuvable" });
      conversation = await prisma.conversation.findFirst({ where: { OR: [{ userAId: userId, userBId: body.otherUserId }, { userAId: body.otherUserId, userBId: userId }], pageId: body.pageId || null } });
      if (!conversation) conversation = await prisma.conversation.create({ data: { userAId: userId, userBId: body.otherUserId, pageId: body.pageId || null } });
    }

    if (!conversation) return reply.code(404).send({ error: "Conversation introuvable" });
    if (body.createOnly && !text) return reply.send({ ok: true, conversationId: conversation.id });
    if (!text && !attachments.length) return reply.code(400).send({ error: "Le message est vide." });
    let replyTo = null;
    if (body.replyTo?.id) {
      replyTo = await prisma.message.findFirst({
        where: { id: String(body.replyTo.id), conversationId: conversation.id },
        select: { id: true, text: true, senderId: true, createdAt: true, deletedForEveryone: true },
      });
    }
    const mediaData = attachments.length || replyTo ? JSON.stringify({ attachments, replyTo }) : null;
    const message = await prisma.message.create({ data: { conversationId: conversation.id, senderId: userId, text, mediaData } });
    await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
    return reply.code(201).send({ ok: true, conversationId: conversation.id, message: { id: message.id, from: "me", text: message.text, attachments, replyTo: replyTo ? { id: replyTo.id, text: replyTo.text || "", from: replyTo.senderId === userId ? "me" : "them", time: formatTime(replyTo.createdAt), deletedForEveryone: replyTo.deletedForEveryone } : null, time: formatTime(message.createdAt), createdAt: message.createdAt } });
  });

  app.patch("/v1/messages", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId || !request.body?.conversationId) return reply.code(400).send({ error: "Paramètres invalides." });
    const conversationId = request.body.conversationId;
    const member = await prisma.conversation.findFirst({ where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] }, select: { id: true } });
    if (!member) return reply.code(404).send({ error: "Conversation introuvable." });
    const result = await prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, readAt: request.body.markUnread ? { not: null } : null }, data: { readAt: request.body.markUnread ? null : new Date() } });
    return reply.send({ ok: true, updated: result.count });
  });

  app.delete("/v1/messages", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const conversationId = request.query?.conversationId;
    if (!userId || !conversationId) return reply.code(400).send({ error: "Conversation manquante." });
    const member = await prisma.conversation.findFirst({ where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] }, select: { id: true } });
    if (!member) return reply.code(404).send({ error: "Conversation introuvable." });
    const messages = await prisma.message.findMany({ where: { conversationId }, select: { id: true } });
    await prisma.$transaction([
      prisma.messageDeletion.createMany({ data: messages.map((message) => ({ messageId: message.id, userId })), skipDuplicates: true }),
      prisma.userSetting.upsert({ where: { userId_key: { userId, key: `conversationDeleted:${conversationId}` } }, create: { userId, key: `conversationDeleted:${conversationId}`, value: "true" }, update: { value: "true" } }),
    ]);
    return reply.send({ ok: true, conversationId });
  });
  
  
}
