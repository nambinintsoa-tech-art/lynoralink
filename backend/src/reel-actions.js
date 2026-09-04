import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const allowedReactions = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

async function getReactionCounts(reelId) {
  const reactions = await prisma.reelReaction.groupBy({
    by: ["reaction"],
    where: { reelId },
    _count: { id: true },
  });
  return Object.fromEntries(reactions.map((item) => [item.reaction, item._count.id]));
}

export async function registerReelActionRoutes(app) {
  app.get("/v1/reels/:id/reaction", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const reelId = request.params.id;
    const [userReaction, counts] = await Promise.all([
      userId ? prisma.reelReaction.findUnique({ where: { reelId_userId: { reelId, userId } }, select: { reaction: true } }) : null,
      getReactionCounts(reelId),
    ]);
    return reply.send({ reelId, userReaction: userReaction?.reaction || null, reactionCounts: counts, totalCount: Object.values(counts).reduce((total, count) => total + count, 0) });
  });

  app.post("/v1/reels/:id/reaction", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Authentification requise" });
    const reelId = request.params.id;
    const reaction = String(request.body?.reaction || "").trim();
    if (!allowedReactions.has(reaction)) return reply.code(400).send({ error: "Réaction invalide" });

    const reel = await prisma.reel.findUnique({ where: { id: reelId }, select: { id: true } });
    if (!reel) return reply.code(404).send({ error: "Reel introuvable" });
    await prisma.reelReaction.upsert({
      where: { reelId_userId: { reelId, userId } },
      create: { reelId, userId, reaction },
      update: { reaction },
    });
    const reactionCounts = await getReactionCounts(reelId);
    return reply.send({ reelId, userId, reaction, reactionCounts, totalCount: Object.values(reactionCounts).reduce((total, count) => total + count, 0), ok: true });
  });

  app.delete("/v1/reels/:id/reaction", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Authentification requise" });
    const reelId = request.params.id;
    const deleted = await prisma.reelReaction.deleteMany({ where: { reelId, userId } });
    if (!deleted.count) return reply.code(404).send({ error: "Aucune réaction à supprimer" });
    const reactionCounts = await getReactionCounts(reelId);
    return reply.send({ reelId, userId, reactionCounts, totalCount: Object.values(reactionCounts).reduce((total, count) => total + count, 0), ok: true });
  });

  app.post("/v1/reels/:id/save", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const reelId = request.params.id;
    const reel = await prisma.reel.findUnique({ where: { id: reelId }, select: { id: true } });
    if (!reel) return reply.code(404).send({ error: "Reel introuvable" });

    const existing = await prisma.reelSave.findUnique({ where: { reelId_userId: { reelId, userId } } });
    if (existing) await prisma.reelSave.delete({ where: { id: existing.id } });
    else await prisma.reelSave.create({ data: { reelId, userId } });
    const saves = await prisma.reelSave.count({ where: { reelId } });
    return reply.send({ saved: !existing, saves });
  });

  app.post("/v1/reels/:id/share", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const reel = await prisma.reel.findUnique({ where: { id: request.params.id }, select: { id: true } });
    if (!reel) return reply.code(404).send({ error: "Reel introuvable" });
    await prisma.reelShare.create({ data: { reelId: reel.id, userId } });
    return reply.send({ shares: await prisma.reelShare.count({ where: { reelId: reel.id } }) });
  });

  app.delete("/v1/reels/:id", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const reel = await prisma.reel.findUnique({ where: { id: request.params.id }, select: { id: true, authorId: true } });
    if (!reel) return reply.code(404).send({ error: "Reel introuvable" });
    if (reel.authorId !== userId) return reply.code(403).send({ error: "Vous ne pouvez pas supprimer ce reel" });
    await prisma.reel.delete({ where: { id: reel.id } });
    return reply.send({ ok: true, id: reel.id });
  });
}
