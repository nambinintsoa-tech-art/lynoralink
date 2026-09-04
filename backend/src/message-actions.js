import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const allowedReactions = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

async function authorizedMessage(messageId, userId) {
  return prisma.message.findFirst({ where: { id: messageId, conversation: { OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] } }, select: { id: true } });
}

async function authorizedConversation(conversationId, userId) {
  return prisma.conversation.findFirst({ where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] }, select: { id: true } });
}

export async function registerMessageActionRoutes(app) {
  app.post("/v1/messages/:id/reaction", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const reaction = String(request.body?.reaction || "");
    if (!allowedReactions.has(reaction)) return reply.code(400).send({ error: "Réaction invalide." });
    const message = await authorizedMessage(request.params.id, userId);
    if (!message) return reply.code(404).send({ error: "Message introuvable." });
    const current = await prisma.messageReaction.findUnique({ where: { messageId_userId: { messageId: message.id, userId } } });
    if (current?.reaction === reaction) await prisma.messageReaction.delete({ where: { id: current.id } });
    else await prisma.messageReaction.upsert({ where: { messageId_userId: { messageId: message.id, userId } }, update: { reaction }, create: { messageId: message.id, userId, reaction } });
    return reply.send({ ok: true, reaction: current?.reaction === reaction ? null : reaction });
  });

  app.patch("/v1/messages/preferences", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const { conversationId, key, value } = request.body || {};
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!conversationId || !["pinned", "muted", "archived"].includes(key) || typeof value !== "boolean") return reply.code(400).send({ error: "Paramètres invalides." });
    if (!await authorizedConversation(conversationId, userId)) return reply.code(404).send({ error: "Conversation introuvable." });
    await prisma.userSetting.upsert({ where: { userId_key: { userId, key: `conversation:${conversationId}:${key}` } }, update: { value: String(value) }, create: { userId, key: `conversation:${conversationId}:${key}`, value: String(value) } });
    return reply.send({ ok: true, conversationId, key, value });
  });

  app.post("/v1/messages/typing", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const { conversationId, typing } = request.body || {};
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!conversationId || !await authorizedConversation(conversationId, userId)) return reply.code(404).send({ error: "Conversation introuvable." });
    const key = `typing:${conversationId}`;
    if (typing) await prisma.userSetting.upsert({ where: { userId_key: { userId, key } }, update: { value: String(Date.now()) }, create: { userId, key, value: String(Date.now()) } });
    else await prisma.userSetting.deleteMany({ where: { userId, key } });
    return reply.send({ ok: true });
  });

  app.get("/v1/messages/block", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const blocked = await prisma.removedConnection.findMany({ where: { userId }, select: { target: { select: { id: true, name: true, title: true, image: true } }, createdAt: true }, orderBy: { createdAt: "desc" } });
    return reply.send({ users: blocked.map(({ target, createdAt }) => ({ ...target, createdAt })) });
  });

  app.post("/v1/messages/block", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const { conversationId, targetUserId: requestedTargetId } = request.body || {};
    const conversation = conversationId ? await authorizedConversation(conversationId, userId) : null;
    const fullConversation = conversationId ? await prisma.conversation.findUnique({ where: { id: conversationId }, select: { userAId: true, userBId: true } }) : null;
    const targetUserId = requestedTargetId || (fullConversation?.userAId === userId ? fullConversation.userBId : fullConversation?.userAId);
    if (!targetUserId || targetUserId === userId || (conversationId && !conversation)) return reply.code(400).send({ error: "Utilisateur à bloquer introuvable." });
    if (!await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } })) return reply.code(404).send({ error: "Utilisateur à bloquer introuvable." });
    await prisma.$transaction([
      prisma.removedConnection.upsert({ where: { userId_targetId: { userId, targetId: targetUserId } }, update: { createdAt: new Date() }, create: { userId, targetId: targetUserId } }),
      prisma.connection.deleteMany({ where: { OR: [{ userAId: userId, userBId: targetUserId }, { userAId: targetUserId, userBId: userId }] } }),
    ]);
    return reply.send({ ok: true });
  });
}
