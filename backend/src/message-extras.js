import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

async function member(conversationId, userId) {
  return prisma.conversation.findFirst({ where: { id: conversationId, OR: [{ userAId: userId }, { userBId: userId }, { members: { some: { userId } } }] }, select: { id: true, userAId: true, userBId: true, isGroup: true } });
}

const messageSettingDefaults = {
  incomingCallSounds: true,
  messageSounds: true,
  autoOpenNewMessages: false,
  onlineStatus: true,
  readReceipts: true,
  typingIndicator: true,
  messagePreview: true,
  filterRequests: false,
  newMessageNotifications: true,
  whoCanMessage: "everyone",
};

const messageSettingKeys = new Set(Object.keys(messageSettingDefaults));
const allowedWhoCanMessage = new Set(["everyone", "connections", "nobody"]);

export async function registerMessageExtraRoutes(app) {
  app.get("/v1/messages/settings", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const rows = await prisma.userSetting.findMany({ where: { userId, OR: [{ key: { startsWith: "messageSetting:" } }, { key: "showOnlineStatus" }] }, select: { key: true, value: true } });
    const settings = { ...messageSettingDefaults };
    for (const row of rows) {
      if (row.key === "showOnlineStatus") {
        settings.onlineStatus = row.value === "true";
        continue;
      }
      const key = row.key.slice("messageSetting:".length);
      if (!messageSettingKeys.has(key)) continue;
      settings[key] = key === "whoCanMessage" ? row.value : row.value === "true";
    }
    return reply.send({ settings });
  });

  app.patch("/v1/messages/settings", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const { key, value } = request.body || {};
    const validValue = key === "whoCanMessage"
      ? typeof value === "string" && allowedWhoCanMessage.has(value)
      : messageSettingKeys.has(key) && typeof value === "boolean";
    if (!validValue) return reply.code(400).send({ error: "Paramètres invalides." });
    await prisma.userSetting.upsert({ where: { userId_key: { userId, key: `messageSetting:${key}` } }, update: { value: String(value) }, create: { userId, key: `messageSetting:${key}`, value: String(value) } });
    if (key === "onlineStatus") await prisma.userSetting.upsert({ where: { userId_key: { userId, key: "showOnlineStatus" } }, update: { value: String(value) }, create: { userId, key: "showOnlineStatus", value: String(value) } });
    return reply.send({ ok: true, key, value });
  });

  app.get("/v1/messages/requests", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const conversations = await prisma.conversation.findMany({ where: { isGroup: false, OR: [{ userAId: userId }, { userBId: userId }], messages: { some: { senderId: { not: userId } } } }, include: { userA: { select: { id: true, name: true, title: true, image: true } }, userB: { select: { id: true, name: true, title: true, image: true } } }, orderBy: { updatedAt: "desc" } });
    const accepted = await prisma.connection.findMany({ where: { status: "accepted", OR: conversations.flatMap((item) => [{ userAId: userId, userBId: item.userAId === userId ? item.userBId : item.userAId }, { userAId: item.userAId === userId ? item.userBId : item.userAId, userBId: userId }]) }, select: { userAId: true, userBId: true } });
    const acceptedIds = new Set(accepted.map((item) => item.userAId === userId ? item.userBId : item.userAId));
    return reply.send({ users: conversations.filter((item) => !acceptedIds.has(item.userAId === userId ? item.userBId : item.userAId)).map((item) => ({ ...(item.userAId === userId ? item.userB : item.userA), conversationId: item.id })) });
  });

  app.post("/v1/messages/requests/:id", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const action = request.body?.action;
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!["accept", "decline"].includes(action)) return reply.code(400).send({ error: "Action invalide." });
    const conversation = await prisma.conversation.findFirst({ where: { id: request.params.id, isGroup: false, OR: [{ userAId: userId }, { userBId: userId }] }, select: { userAId: true, userBId: true } });
    if (!conversation) return reply.code(404).send({ error: "Invitation introuvable." });
    const targetId = conversation.userAId === userId ? conversation.userBId : conversation.userAId;
    if (action === "decline") { await prisma.conversation.delete({ where: { id: request.params.id } }); return reply.send({ ok: true, deleted: true }); }
    const existingConnection = await prisma.connection.findFirst({ where: { OR: [{ userAId: userId, userBId: targetId }, { userAId: targetId, userBId: userId }] } });
    if (existingConnection) await prisma.connection.update({ where: { id: existingConnection.id }, data: { status: "accepted" } });
    else await prisma.connection.create({ data: { userAId: userId, userBId: targetId, status: "accepted" } });
    return reply.send({ ok: true, accepted: true });
  });

  app.get("/v1/messages/restricted", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const settings = await prisma.userSetting.findMany({ where: { userId, key: { startsWith: "restrictedUser:" }, value: "true" }, select: { key: true, updatedAt: true }, orderBy: { updatedAt: "desc" } });
    const ids = settings.map((item) => item.key.slice(15));
    const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, title: true, image: true } });
    return reply.send({ users: users.map((user) => ({ ...user, createdAt: settings.find((item) => item.key.endsWith(user.id))?.updatedAt })) });
  });

  app.post("/v1/messages/restricted", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const targetId = request.body?.userId;
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!targetId || targetId === userId) return reply.code(400).send({ error: "Utilisateur invalide." });
    await prisma.userSetting.upsert({ where: { userId_key: { userId, key: `restrictedUser:${targetId}` } }, update: { value: "true" }, create: { userId, key: `restrictedUser:${targetId}`, value: "true" } });
    return reply.send({ ok: true, userId: targetId });
  });

  app.delete("/v1/messages/restricted/:id", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    await prisma.userSetting.deleteMany({ where: { userId, key: `restrictedUser:${request.params.id}` } });
    return reply.send({ ok: true, userId: request.params.id });
  });

  app.post("/v1/presence", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.send({ ok: true, ignored: true });
    await prisma.userSetting.upsert({ where: { userId_key: { userId, key: "presenceLastSeen" } }, update: { value: String(Date.now()) }, create: { userId, key: "presenceLastSeen", value: String(Date.now()) } });
    return reply.send({ ok: true });
  });
}
