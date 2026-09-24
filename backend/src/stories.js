import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";
import { sendNativePushNotification } from "./push.js";
import { broadcastRealtimeEvent } from "./realtime.js";

const reactions = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

async function createStoryNotification({ userId, senderId, type, text, meta = {} }) {
  if (!userId || !senderId || userId === senderId || !text) return;
  const sender = await prisma.user.findUnique({ where: { id: senderId }, select: { name: true, image: true } });
  const notification = await prisma.notification.create({
    data: {
      userId,
      senderId,
      type,
      actor: sender?.name || "Un utilisateur",
      initials: (sender?.name || "Un utilisateur").split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(""),
      text,
      message: text,
      meta: JSON.stringify({ ...meta, ...(sender?.image ? { avatarUrl: sender.image, actorAvatar: sender.image } : {}) }),
      read: false,
    },
  });
  broadcastRealtimeEvent({ userId, type: "notifications", payload: { notificationId: notification.id, kind: type } });
  await sendNativePushNotification(userId, { ...notification, url: "/feed?view=notifications" }).catch(() => {});
}

function normalizePrivacy(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["network", "relations", "réseau", "reseau", "connections"].includes(normalized)) return "connections";
  if (["close", "abonnés", "abonnes", "followers"].includes(normalized)) return "followers";
  if (["private", "privé", "prive"].includes(normalized)) return "private";
  return "public";
}

export async function registerStoryRoutes(app) {
  app.get("/v1/stories", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const connections = await prisma.connection.findMany({ where: { status: "accepted", OR: [{ userAId: userId }, { userBId: userId }] }, select: { userAId: true, userBId: true } });
    const connectedIds = connections.map((connection) => connection.userAId === userId ? connection.userBId : connection.userAId);
    const followedSetting = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "followedCompanyPages" } }, select: { value: true } });
    let followedPageIds = []; try { followedPageIds = JSON.parse(followedSetting?.value || "[]"); } catch {}
    const stories = await prisma.story.findMany({ where: { expiresAt: { gt: new Date() }, OR: [{ userId }, { privacy: { in: ["public", "Public", "PUBLIC"] } }, { privacy: { in: ["connections", "network"] }, userId: { in: connectedIds } }, { privacy: { in: ["followers", "close"] }, companyPageId: { in: followedPageIds.map(String) } }] }, include: { author: { select: { id: true, name: true, image: true } }, reactions: true, views: { where: { userId }, select: { id: true } } }, orderBy: { createdAt: "asc" } });
    return reply.send({ stories: stories.map((story) => ({ ...story, viewed: story.views.length > 0, views: undefined })) });
  });
  app.post("/v1/stories", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {}; if (!body.text && !body.image) return reply.code(400).send({ error: "Contenu requis" });
    const privacy = normalizePrivacy(body.privacy);
    const story = await prisma.story.create({ data: { userId, text: String(body.text || ""), image: body.image || null, type: body.type || "text", backgroundColor: body.backgroundColor || null, privacy, expiresAt: new Date(Date.now() + 86400000) } });
    if (privacy !== "private") {
      const connections = await prisma.connection.findMany({ where: { status: "accepted", OR: [{ userAId: userId }, { userBId: userId }] }, select: { userAId: true, userBId: true } });
      const recipientIds = [...new Set(connections.map((connection) => connection.userAId === userId ? connection.userBId : connection.userAId))];
      await Promise.all(recipientIds.map((recipientId) => createStoryNotification({ userId: recipientId, senderId: userId, type: "story", text: "a publié une nouvelle story.", meta: { storyId: story.id, kind: "new_story" } })));
    }
    return reply.code(201).send(story);
  });
  app.post("/v1/stories/:id/views", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    await prisma.storyView.upsert({ where: { storyId_userId: { storyId: request.params.id, userId } }, update: { viewedAt: new Date() }, create: { storyId: request.params.id, userId } }); return reply.send({ ok: true });
  });
  app.post("/v1/stories/:id/reactions", async (request, reply) => {
    const userId = await getSessionUserId(request); const reaction = String(request.body?.reaction || ""); if (!userId) return reply.code(401).send({ error: "Non authentifié" }); if (!reactions.has(reaction)) return reply.code(400).send({ error: "Réaction invalide" });
    const story = await prisma.story.findUnique({ where: { id: request.params.id }, select: { id: true, userId: true } });
    if (!story) return reply.code(404).send({ error: "Story introuvable" });
    const existing = await prisma.storyReaction.findUnique({ where: { storyId_userId: { storyId: story.id, userId } } });
    await prisma.storyReaction.upsert({ where: { storyId_userId: { storyId: story.id, userId } }, update: { reaction }, create: { storyId: story.id, userId, reaction } });
    if (existing?.reaction !== reaction) await createStoryNotification({ userId: story.userId, senderId: userId, type: "like", text: `a réagi à votre story (${reaction}).`, meta: { storyId: story.id, kind: "story_reaction", reaction } });
    return reply.send({ ok: true, reaction });
  });
  app.post("/v1/stories/:id/actions", async (request, reply) => {
    const userId = await getSessionUserId(request); const action = request.body?.action;
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    if (!["save", "share", "unfollow"].includes(action)) return reply.code(400).send({ error: "Action invalide" });
    const story = await prisma.story.findUnique({ where: { id: request.params.id }, select: { id: true, userId: true } });
    if (!story) return reply.code(404).send({ error: "Story introuvable" });
    if (action === "share") return reply.send({ ok: true, shared: true });
    if (action === "unfollow") {
      if (story.userId === userId) return reply.code(400).send({ error: "Impossible de se désabonner de soi-même" });
      await prisma.removedConnection.upsert({ where: { userId_targetId: { userId, targetId: story.userId } }, update: {}, create: { userId, targetId: story.userId } });
      return reply.send({ ok: true, unfollowed: true, targetId: story.userId });
    }
    const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "savedStories" } }, select: { value: true } });
    let savedStories = []; try { savedStories = JSON.parse(setting?.value || "[]"); } catch {}
    if (!Array.isArray(savedStories)) savedStories = [];
    const saved = !savedStories.includes(story.id);
    const nextStories = saved ? [...savedStories, story.id] : savedStories.filter((id) => id !== story.id);
    await prisma.userSetting.upsert({ where: { userId_key: { userId, key: "savedStories" } }, update: { value: JSON.stringify(nextStories) }, create: { userId, key: "savedStories", value: JSON.stringify(nextStories) } });
    return reply.send({ ok: true, saved, savedStories: nextStories });
  });
  app.delete("/v1/stories/:id", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" }); const story = await prisma.story.findUnique({ where: { id: request.params.id }, select: { userId: true } }); if (!story) return reply.code(404).send({ error: "Story introuvable" }); if (story.userId !== userId) return reply.code(403).send({ error: "Non autorisé" }); await prisma.story.delete({ where: { id: request.params.id } }); return reply.send({ ok: true });
  });
}
