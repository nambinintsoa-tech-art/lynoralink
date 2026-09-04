import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const reactions = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

export async function registerStoryRoutes(app) {
  app.get("/v1/stories", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const stories = await prisma.story.findMany({ where: { expiresAt: { gt: new Date() } }, include: { author: { select: { id: true, name: true, image: true } }, reactions: true, views: { where: { userId }, select: { id: true } } }, orderBy: { createdAt: "asc" } });
    return reply.send({ stories: stories.map((story) => ({ ...story, viewed: story.views.length > 0, views: undefined })) });
  });
  app.post("/v1/stories", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {}; if (!body.text && !body.image) return reply.code(400).send({ error: "Contenu requis" });
    const story = await prisma.story.create({ data: { userId, text: String(body.text || ""), image: body.image || null, type: body.type || "text", backgroundColor: body.backgroundColor || null, privacy: body.privacy || "network", expiresAt: new Date(Date.now() + 86400000) } });
    return reply.code(201).send(story);
  });
  app.post("/v1/stories/:id/views", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    await prisma.storyView.upsert({ where: { storyId_userId: { storyId: request.params.id, userId } }, update: { viewedAt: new Date() }, create: { storyId: request.params.id, userId } }); return reply.send({ ok: true });
  });
  app.post("/v1/stories/:id/reactions", async (request, reply) => {
    const userId = await getSessionUserId(request); const reaction = String(request.body?.reaction || ""); if (!userId) return reply.code(401).send({ error: "Non authentifié" }); if (!reactions.has(reaction)) return reply.code(400).send({ error: "Réaction invalide" });
    await prisma.storyReaction.upsert({ where: { storyId_userId: { storyId: request.params.id, userId } }, update: { reaction }, create: { storyId: request.params.id, userId, reaction } }); return reply.send({ ok: true, reaction });
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
