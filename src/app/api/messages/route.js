import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getSubscriptionAccess } from "@/lib/subscription";
import { getBlockedUserIds } from "@/lib/blocking";
import { callGroq } from "@/lib/groq";

function parseFaq(value) {
  try {
    const faq = JSON.parse(value || "[]");
    return Array.isArray(faq)
      ? faq.filter((item) => item && typeof item === "object" && String(item.question || "").trim() && String(item.answer || "").trim())
      : [];
  } catch { return []; }
}

function parseAutoReplyMedia(value) {
  try {
    const media = JSON.parse(value || "[]");
    return Array.isArray(media) ? media.slice(0, 3).filter((item) => item?.url && ["image", "video", "document"].includes(item.type)) : [];
  } catch { return []; }
}

function isAutoReplyWithinSchedule(rules, date = new Date()) {
  if (!Array.isArray(rules) || !rules.length) return true;
  const day = date.getDay();
  const minutes = date.getHours() * 60 + date.getMinutes();
  return rules.some((rule) => {
    if (!rule.enabled || rule.dayOfWeek !== day) return false;
    const [startHour, startMinute] = String(rule.startTime || "00:00").split(":").map(Number);
    const [endHour, endMinute] = String(rule.endTime || "23:59").split(":").map(Number);
    if (![startHour, startMinute, endHour, endMinute].every(Number.isFinite)) return false;
    const start = startHour * 60 + startMinute;
    const end = endHour * 60 + endMinute;
    return start <= end ? minutes >= start && minutes <= end : minutes >= start || minutes <= end;
  });
}

function faqTokens(value) {
  const stopWords = new Set(["avec", "comment", "dans", "pour", "quel", "quelle", "quels", "quelles", "vous", "nous", "votre", "notre", "sont", "être", "etre"]);
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/(ions?|es|ez|ent|ees|e|s)$/i, ""))
    .filter((word) => word.length > 3 && !stopWords.has(word));
}

async function generateAutoReply(page, incomingText) {
  const faq = parseFaq(page.autoReplyFaq);
  const attachments = parseAutoReplyMedia(page.autoReplyMedia);
  const formatReply = (content) => {
    const cleanContent = String(content || "")
      .replace(/\s*_?ceci est une réponse automatique\.?_?\s*/gi, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    const opening = page.autoReplyTone === "formal" ? "Bonjour," : "Bonjour !";
    return `${opening}\n\n${cleanContent}`.trim();
  };
  const fallbackContent = (() => {
    const incomingTokens = faqTokens(incomingText);
    return faq
      .map((item) => {
        const questionTokens = faqTokens(item.question);
        const matches = incomingTokens.filter((incomingToken) => questionTokens.some((questionToken) => (
          incomingToken === questionToken
          || incomingToken.startsWith(questionToken)
          || questionToken.startsWith(incomingToken)
        )));
        return { answer: item.answer, score: new Set(matches).size };
      })
      .sort((first, second) => second.score - first.score)
      .find((item) => item.score > 0)?.answer
      || page.autoReplyDefaultMessage
      || "Merci de nous avoir contactés. Nous reviendrons vers vous bientôt.";
  })();
  if (!String(incomingText || "").trim()) return { text: formatReply(fallbackContent), attachments };

  try {
    const faqContext = faq.length
      ? `\nFAQ de la page :\n${faq.map((item) => `Question : ${item.question}\nRéponse : ${item.answer}`).join("\n\n")}`
      : "";
    const content = await callGroq([
      {
        role: "system",
        content: `Tu es le répondeur d'une page entreprise. Réponds en français, avec un ton ${page.autoReplyTone === "formal" ? "formel et professionnel" : "chaleureux et professionnel"}. Structure la réponse en 2 à 4 phrases maximum, avec un paragraphe par idée si nécessaire. Utilise la FAQ si elle répond à la question et n'invente jamais de prix, délai, disponibilité ou engagement. Si tu ne connais pas la réponse, indique simplement qu'un membre de l'équipe reviendra vers la personne. Ne mets ni formule d'ouverture, ni signature, ni mention de réponse automatique.${faqContext}`,
      },
      {
        role: "user",
        content: String(incomingText).trim(),
      },
    ], { temperature: 0.4, max_tokens: 220 });
    const cleanContent = content.replace(/^\s*(bonjour[^\n]*[.!]?\s*)+/i, "").trim();
    if (cleanContent) return { text: formatReply(cleanContent), attachments };
  } catch (error) {
    console.error("Impossible de générer la réponse IA de la page :", error);
  }

  return { text: formatReply(fallbackContent), attachments };
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "L";
}

function formatMessageTime(date) {
  if (!date) return "À l'instant";
  return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

async function getMessageSetting(userId, key, fallback) {
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: `messageSetting:${key}` } },
    select: { value: true },
  });
  if (!setting) return fallback;
  return key === "whoCanMessage" ? setting.value : setting.value === "true";
}

async function canStartDirectConversation(senderId, recipientId) {
  const whoCanMessage = await getMessageSetting(recipientId, "whoCanMessage", "everyone");
  if (whoCanMessage === "nobody") return false;
  if (whoCanMessage !== "connections") return true;
  const connection = await prisma.connection.findFirst({
    where: {
      status: "accepted",
      OR: [
        { userAId: senderId, userBId: recipientId },
        { userAId: recipientId, userBId: senderId },
      ],
    },
    select: { id: true },
  });
  return Boolean(connection);
}

async function sendOpeningPageGreeting(conversation, pageId, recipientId) {
  if (!conversation?.pageId || conversation.pageId !== pageId || !pageId || pageId === recipientId) return null;
  const [pageSetting, activeAccountSetting, access, page] = await Promise.all([
    prisma.userSetting.findUnique({ where: { userId_key: { userId: pageId, key: "companyPage" } } }),
    prisma.userSetting.findUnique({ where: { userId_key: { userId: pageId, key: "activeAccount" } }, select: { value: true } }),
    getSubscriptionAccess(pageId),
    prisma.user.findUnique({ where: { id: pageId }, select: { name: true, autoReplyEnabled: true, autoReplyTone: true, autoReplyDefaultMessage: true, autoReplyFaq: true, autoReplyMedia: true, autoReplyRules: true } }),
  ]);
  if (!pageSetting || activeAccountSetting?.value !== "company" || !access?.isPremium || !page?.autoReplyEnabled) return null;

  const greetingReply = await generateAutoReply(page, "");
  const greeting = await prisma.message.create({
    data: { conversationId: conversation.id, senderId: pageId, text: greetingReply.text, mediaData: greetingReply.attachments.length ? JSON.stringify(greetingReply.attachments) : null },
    include: { sender: { select: { id: true, name: true } } },
  });
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
  await createNotification({
    userId: recipientId,
    senderId: pageId,
    type: "message",
    actor: page.name || "Page entreprise",
    text: greeting.text,
    title: `Message de ${page.name || "la page"}`,
    url: "/feed?view=messages",
    meta: { kind: "message", conversationId: conversation.id, automated: true },
  });
  return greeting;
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const targetUserId = req.nextUrl.searchParams.get("userId") || session?.user?.id;

  if (!session?.user?.id && !targetUserId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = targetUserId || session.user.id;
  const blockedIds = await getBlockedUserIds(prisma, session.user.id);

  const deletedConversationSettings = await prisma.userSetting.findMany({
    where: { userId, key: { startsWith: "conversationDeleted:" } },
    select: { key: true },
  });
  const deletedConversationIds = new Set(deletedConversationSettings.map((setting) => setting.key.slice("conversationDeleted:".length)));

  const conversations = (await prisma.conversation.findMany({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }],
    },
    include: {
      userA: { select: { id: true, name: true, title: true, image: true } },
      userB: { select: { id: true, name: true, title: true, image: true } },
      messages: {
        where: { deletions: { none: { userId } } },
        orderBy: { createdAt: "asc" },
        include: { sender: { select: { id: true, name: true } }, reactions: { select: { userId: true, reaction: true } } },
      },
      calls: { orderBy: { createdAt: "asc" } },
      members: {
        include: { user: { select: { id: true, name: true, title: true, image: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  })).filter((conversation) => {
    if (deletedConversationIds.has(conversation.id)) return false;
    const otherUser = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
    return !blockedIds.has(otherUser);
  });
  const participantIds = [...new Set(conversations.flatMap((conversation) => [conversation.userAId, conversation.userBId, ...(conversation.members || []).map((member) => member.userId)]).filter((id) => id && id !== userId))];
  const presenceSettings = await prisma.userSetting.findMany({
    where: { userId: { in: participantIds }, key: { in: ["presenceLastSeen", "showOnlineStatus"] } },
    select: { userId: true, key: true, value: true },
  });
  const presenceByUser = new Map();
  presenceSettings.forEach((setting) => {
    const current = presenceByUser.get(setting.userId) || {};
    current[setting.key] = setting.value;
    presenceByUser.set(setting.userId, current);
  });
  const isOnline = (id) => {
    const presence = presenceByUser.get(id);
    return presence?.showOnlineStatus !== "false"
      && Number(presence?.presenceLastSeen) >= Date.now() - 2 * 60 * 1000;
  };
  const preferenceSettings = await prisma.userSetting.findMany({
    where: { userId, key: { startsWith: "conversation:" } },
    select: { key: true, value: true },
  });
  const preferencesByConversation = new Map();
  preferenceSettings.forEach((setting) => {
    const match = setting.key.match(/^conversation:([^:]+):(pinned|muted|archived)$/);
    if (!match) return;
    const preferences = preferencesByConversation.get(match[1]) || {};
    preferences[match[2]] = setting.value === "true";
    preferencesByConversation.set(match[1], preferences);
  });
  const typingSettings = await prisma.userSetting.findMany({
    where: { userId: { in: participantIds }, key: { startsWith: "typing:" } },
    select: { userId: true, key: true, value: true },
  });
  const typingIndicatorEnabled = await getMessageSetting(userId, "typingIndicator", true);
  const typingByConversation = new Map();
  if (typingIndicatorEnabled) {
    typingSettings.forEach((setting) => {
      const conversationId = setting.key.slice("typing:".length);
      if (Number(setting.value) >= Date.now() - 5000) typingByConversation.set(conversationId, setting.userId);
    });
  }

  const pageIds = [...new Set(conversations.map((conversation) => conversation.pageId).filter(Boolean))];
  const pageSettings = pageIds.length
    ? await prisma.userSetting.findMany({ where: { userId: { in: pageIds }, key: "companyPage" }, select: { userId: true, value: true } })
    : [];
  const pagesById = new Map();
  pageSettings.forEach((setting) => {
    try {
      const page = JSON.parse(setting.value);
      if (page && typeof page === "object") pagesById.set(setting.userId, page);
    } catch {}
  });

  const payload = conversations.map((conversation) => {
    const otherUser = conversation.userAId === userId ? conversation.userB : conversation.userA;
    const page = conversation.pageId ? pagesById.get(conversation.pageId) : null;
    const displayName = page?.name || otherUser?.name || "Utilisateur";
    const displayImage = page?.logoUrl || page?.avatarUrl || page?.image || otherUser?.image || null;
    const groupMembers = conversation.members || [];
    const groupName = conversation.groupName || groupMembers.map((member) => member.user.name).filter(Boolean).join(", ");
    const callMessages = conversation.calls.map((call) => ({
      id: `call-${call.id}`,
      from: call.callerId === userId ? "me" : "them",
      text: "",
      type: "call",
      callType: call.type,
      callStatus: call.status,
      createdAt: call.createdAt,
      time: formatMessageTime(call.createdAt),
      read: true,
    }));
    const messages = [
      ...conversation.messages.map((message) => ({
        id: message.id,
        from: message.senderId === userId ? "me" : "them",
        text: message.text,
        attachments: (() => {
          try { return message.mediaData ? JSON.parse(message.mediaData) : []; } catch { return []; }
        })(),
        time: formatMessageTime(message.createdAt),
        read: Boolean(message.readAt),
        reactions: message.reactions.map((item) => ({ emoji: item.reaction, from: item.userId === userId ? "me" : "them" })),
        deletedForEveryone: message.deletedForEveryone,
        createdAt: message.createdAt,
      })),
      ...callMessages,
    ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const lastMessage = messages[messages.length - 1];
    const unread = conversation.messages.filter((m) => m.senderId !== userId && !m.readAt).length;
    const preferences = preferencesByConversation.get(conversation.id) || {};

    return {
      id: conversation.id,
      otherUserId: otherUser?.id || null,
      pageId: conversation.pageId || null,
      name: conversation.isGroup ? groupName || "Groupe" : displayName,
      title: conversation.pageId ? "Page entreprise" : otherUser?.title || "Membre LynoraLink",
      image: conversation.isGroup ? null : displayImage,
      initials: initials(conversation.isGroup ? groupName || "Groupe" : displayName),
      isGroup: conversation.isGroup,
      memberCount: groupMembers.length,
      members: groupMembers.map((member) => ({
        id: member.user.id,
        name: member.user.name || "Utilisateur",
        title: member.user.title || "Membre LynoraLink",
        image: member.user.image || null,
        initials: initials(member.user.name || "Utilisateur"),
        online: isOnline(member.user.id),
      })),
      online: !conversation.isGroup && isOnline(otherUser?.id),
      typing: typingByConversation.get(conversation.id) === otherUser?.id,
      unread,
      pinned: preferences.pinned === true,
      muted: preferences.muted === true,
      archived: preferences.archived === true,
      messages,
      lastMessage: lastMessage ? { id: lastMessage.id, text: lastMessage.text || (lastMessage.type === "call" ? "Appel" : ""), time: lastMessage.time } : null,
    };
  });

  return NextResponse.json({ conversations: payload });
}

export async function DELETE(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const conversationId = req.nextUrl.searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ error: "Conversation manquante." }, { status: 400 });

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [{ userAId: session.user.id }, { userBId: session.user.id }, { members: { some: { userId: session.user.id } } }],
    },
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  const messages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    select: { id: true },
  });
  await prisma.$transaction([
    ...(messages.length ? [prisma.messageDeletion.createMany({
      data: messages.map((message) => ({ messageId: message.id, userId: session.user.id })),
      skipDuplicates: true,
    })] : []),
    prisma.userSetting.upsert({
      where: { userId_key: { userId: session.user.id, key: `conversationDeleted:${conversation.id}` } },
      create: { userId: session.user.id, key: `conversationDeleted:${conversation.id}`, value: "true" },
      update: { value: "true" },
    }),
  ]);
  return NextResponse.json({ ok: true, conversationId });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { conversationId, otherUserId, pageId, text, attachments = [], createOnly, groupName, participantIds } = body || {};
  let resolvedOtherUserId = otherUserId;
  const blockedIds = await getBlockedUserIds(prisma, session.user.id);
  if (resolvedOtherUserId && blockedIds.has(resolvedOtherUserId)) {
    return NextResponse.json({ error: "Cet utilisateur est bloqué." }, { status: 403 });
  }

  if (pageId) {
    const page = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: pageId, key: "companyPage" } },
    });
    if (!page) return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
    resolvedOtherUserId = pageId;
  }
  const isPageSelfConversation = Boolean(pageId && resolvedOtherUserId === session.user.id);

  if (!conversationId && !resolvedOtherUserId && !Array.isArray(participantIds)) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  if (Array.isArray(participantIds)) {
    const members = [...new Set(participantIds.filter((participantId) => participantId && participantId !== session.user.id))];
    if (!groupName?.trim() || members.length < 1) {
      return NextResponse.json({ error: "Un nom et au moins un participant sont nécessaires." }, { status: 400 });
    }
    const users = await prisma.user.findMany({ where: { id: { in: members } }, select: { id: true, name: true, image: true, title: true } });
    if (users.length !== members.length) return NextResponse.json({ error: "Participant introuvable." }, { status: 400 });
    const conversation = await prisma.conversation.create({
      data: {
        userAId: session.user.id,
        userBId: members[0],
        groupName: groupName.trim(),
        isGroup: true,
        members: { create: [session.user.id, ...members].map((userId) => ({ user: { connect: { id: userId } } })) },
      },
    });
    return NextResponse.json({
      ok: true,
      conversationId: conversation.id,
      members: [
        { id: session.user.id, name: session.user.name || "Vous", image: session.user.image || null, initials: initials(session.user.name || "Vous") },
        ...users.map((user) => ({ ...user, initials: initials(user.name || "Utilisateur") })),
      ],
    });
  }

  if (!text || typeof text !== "string" || !text.trim()) {
    if (createOnly && resolvedOtherUserId && (resolvedOtherUserId !== session.user.id || isPageSelfConversation)) {
      const existing = await prisma.conversation.findFirst({
        where: {
          OR: [
            { userAId: session.user.id, userBId: resolvedOtherUserId },
            { userAId: resolvedOtherUserId, userBId: session.user.id },
          ],
          pageId: pageId || null,
        },
        include: { messages: { select: { id: true }, take: 1 } },
      });

      if (!existing && !(await canStartDirectConversation(session.user.id, resolvedOtherUserId))) {
        return NextResponse.json({ error: "Cet utilisateur n'accepte pas les nouvelles discussions." }, { status: 403 });
      }

      const conversation = existing || await prisma.conversation.create({
        data: {
          userAId: session.user.id,
          userBId: resolvedOtherUserId,
          pageId: pageId || null,
        },
      });

      await prisma.userSetting.deleteMany({
        where: { userId: session.user.id, key: `conversationDeleted:${conversation.id}` },
      });

      const greeting = pageId && (!existing || existing.messages.length === 0)
        ? await sendOpeningPageGreeting(conversation, pageId, session.user.id)
        : null;

      return NextResponse.json({ ok: true, conversationId: conversation.id, greeting: greeting ? { id: greeting.id, text: greeting.text } : null });
    }

    return NextResponse.json({ error: "Le message est vide." }, { status: 400 });
  }

  let conversation;

  if (conversationId) {
    conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
  } else if (resolvedOtherUserId && (resolvedOtherUserId !== session.user.id || isPageSelfConversation)) {
    const existing = await prisma.conversation.findFirst({
      where: {
        OR: [
          { userAId: session.user.id, userBId: resolvedOtherUserId },
          { userAId: resolvedOtherUserId, userBId: session.user.id },
        ],
        pageId: pageId || null,
      },
    });

    if (!existing && !(await canStartDirectConversation(session.user.id, resolvedOtherUserId))) {
      return NextResponse.json({ error: "Cet utilisateur n'accepte pas les nouvelles discussions." }, { status: 403 });
    }

    conversation = existing || await prisma.conversation.create({
      data: {
        userAId: session.user.id,
        userBId: resolvedOtherUserId,
        pageId: pageId || null,
      },
    });
  }

  if (!conversation) {
    return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  await prisma.userSetting.deleteMany({
    where: { userId: session.user.id, key: `conversationDeleted:${conversation.id}` },
  });

  const message = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      text: text.trim(),
      mediaData: Array.isArray(attachments) && attachments.length ? JSON.stringify(attachments) : null,
    },
    include: { sender: { select: { id: true, name: true } } },
  });

  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  const recipientIds = conversation.isGroup
    ? (await prisma.conversationMember.findMany({
        where: { conversationId: conversation.id, userId: { not: session.user.id } },
        select: { userId: true },
      })).map((member) => member.userId)
    : [conversation.userAId, conversation.userBId].filter((userId) => userId !== session.user.id);
  await Promise.all(recipientIds.map(async (userId) => {
    const notificationsEnabled = await getMessageSetting(userId, "newMessageNotifications", true);
    if (!notificationsEnabled) return null;
    const previewEnabled = await getMessageSetting(userId, "messagePreview", true);
    return createNotification({
      userId,
      senderId: session.user.id,
      type: "message",
      actor: message.sender?.name || "Un membre",
      text: previewEnabled ? message.text : "Vous avez reçu un nouveau message.",
      title: `Nouveau message de ${message.sender?.name || "un membre"}`,
      url: "/feed?view=messages",
      meta: { kind: "message", conversationId: conversation.id },
    });
  }));
  broadcastRealtimeEvent({ userIds: [session.user.id, ...recipientIds], type: "messages", payload: { conversationId: conversation.id, from: session.user.id } });

  if (!conversation.isGroup && conversation.pageId && recipientIds.length === 1 && conversation.pageId === recipientIds[0]) {
    const pageId = recipientIds[0];
    const pageSetting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: pageId, key: "companyPage" } },
    });
    const activeAccountSetting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: pageId, key: "activeAccount" } },
      select: { value: true },
    });
    const access = pageSetting ? await getSubscriptionAccess(pageId) : null;
    if (pageSetting && activeAccountSetting?.value === "company" && access?.isPremium) {
      const page = await prisma.user.findUnique({
        where: { id: pageId },
        select: { autoReplyEnabled: true, autoReplyTone: true, autoReplyDefaultMessage: true, autoReplyFaq: true, autoReplyMedia: true, autoReplyRules: true },
      });
      try {
        if (page?.autoReplyEnabled && isAutoReplyWithinSchedule(page.autoReplyRules)) {
        const autoReply = await generateAutoReply(page, message.text);
        const reply = await prisma.message.create({
          data: { conversationId: conversation.id, senderId: pageId, text: autoReply.text, mediaData: autoReply.attachments?.length ? JSON.stringify(autoReply.attachments) : null },
        });
        await prisma.message.update({ where: { id: message.id }, data: { readAt: new Date() } });
        await prisma.notification.updateMany({
          where: {
            userId: pageId,
            type: "message",
            read: false,
            meta: { contains: conversation.id },
          },
          data: { read: true },
        });
        await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
        await createNotification({
          userId: session.user.id,
          senderId: pageId,
          type: "message",
          actor: "Répondeur automatique",
          text: reply.text,
          title: "Réponse automatique de la page",
          url: "/feed?view=messages",
          meta: { kind: "message", conversationId: conversation.id, automated: true },
        });
      }
      } catch (error) {
        console.error("Répondeur automatique indisponible :", error);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    message: {
      id: message.id,
      from: "me",
      text: message.text,
      attachments: (() => {
        try { return message.mediaData ? JSON.parse(message.mediaData) : []; } catch { return []; }
      })(),
      time: formatMessageTime(message.createdAt),
    },
    conversationId: conversation.id,
  });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { conversationId, markUnread = false } = body || {};
  if (!conversationId) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const readReceiptsEnabled = await getMessageSetting(session.user.id, "readReceipts", true);
  if (!readReceiptsEnabled) return NextResponse.json({ ok: true, updated: 0 });

  try {
    const result = await prisma.message.updateMany({
      where: { conversationId, senderId: { not: session.user.id }, readAt: markUnread ? { not: null } : null },
      data: { readAt: markUnread ? null : new Date() },
    });

    return NextResponse.json({ ok: true, updated: result.count });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la mise à jour des messages." }, { status: 500 });
  }
}
