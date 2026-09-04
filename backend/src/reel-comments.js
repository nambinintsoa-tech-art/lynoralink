import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const allowedReactions = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
}

function parseMedia(value) {
  try { return value ? JSON.parse(value) : []; } catch { return []; }
}

function formatComment(comment, userId) {
  const reactions = comment.reactions || [];
  const userReaction = reactions.find((item) => String(item.userId) === String(userId))?.reaction || null;
  return {
    id: comment.id,
    author: comment.author.name || "Utilisateur",
    initials: initials(comment.author.name || "Utilisateur"),
    avatarUrl: comment.author.image || null,
    authorId: comment.authorId,
    text: comment.text,
    media: parseMedia(comment.mediaData),
    time: comment.createdAt,
    createdAt: comment.createdAt,
    likes: reactions.length,
    totalReactions: reactions.length,
    reactionKeys: [...new Set(reactions.map((item) => item.reaction))],
    reaction: userReaction,
    liked: Boolean(userReaction),
    isOwn: String(comment.authorId) === String(userId),
    replies: (comment.replies || []).map((reply) => formatComment(reply, userId)),
  };
}

const commentInclude = {
  author: { select: { id: true, name: true, image: true } },
  reactions: true,
  replies: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, image: true } }, reactions: true },
  },
};

export async function registerReelCommentRoutes(app) {
  app.get("/v1/reels/:id/comments", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const comments = await prisma.reelComment.findMany({ where: { reelId: request.params.id, parentId: null }, include: commentInclude, orderBy: { createdAt: "asc" } });
    const formatted = comments.map((comment) => formatComment(comment, userId));
    return reply.send({ comments: formatted, total: formatted.length });
  });

  app.post("/v1/reels/:id/comments", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const body = request.body || {};
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const media = Array.isArray(body.media) ? body.media : [];
    if (!text && !media.length) return reply.code(400).send({ error: "Le commentaire est vide" });

    const reel = await prisma.reel.findUnique({ where: { id: request.params.id }, select: { id: true } });
    if (!reel) return reply.code(404).send({ error: "Reel introuvable" });
    if (body.parentId) {
      const parent = await prisma.reelComment.findUnique({ where: { id: body.parentId }, select: { reelId: true } });
      if (!parent || parent.reelId !== reel.id) return reply.code(400).send({ error: "Commentaire parent invalide" });
    }

    const comment = await prisma.$transaction(async (transaction) => {
      const created = await transaction.reelComment.create({ data: { reelId: reel.id, authorId: userId, text, parentId: body.parentId || null, mediaData: media.length ? JSON.stringify(media) : null }, include: { author: { select: { id: true, name: true, image: true } }, reactions: true, replies: true } });
      await transaction.reel.update({ where: { id: reel.id }, data: { comments: { increment: 1 } } });
      return created;
    });
    return reply.code(201).send(formatComment(comment, userId));
  });

  app.patch("/v1/reels/:id/comments/:commentId", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const text = typeof request.body?.text === "string" ? request.body.text.trim() : "";
    if (!text) return reply.code(400).send({ error: "Le texte ne peut pas être vide" });
    const comment = await prisma.reelComment.findUnique({ where: { id: request.params.commentId } });
    if (!comment || comment.reelId !== request.params.id) return reply.code(404).send({ error: "Commentaire non trouvé" });
    if (comment.authorId !== userId) return reply.code(403).send({ error: "Non autorisé" });
    return reply.send(await prisma.reelComment.update({ where: { id: comment.id }, data: { text } }));
  });

  app.delete("/v1/reels/:id/comments/:commentId", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const comment = await prisma.reelComment.findUnique({ where: { id: request.params.commentId }, select: { id: true, reelId: true, authorId: true } });
    if (!comment || comment.reelId !== request.params.id) return reply.code(404).send({ error: "Commentaire non trouvé" });
    if (comment.authorId !== userId) return reply.code(403).send({ error: "Non autorisé" });
    await prisma.$transaction(async (transaction) => {
      await transaction.reelComment.delete({ where: { id: comment.id } });
      const count = await transaction.reelComment.count({ where: { reelId: comment.reelId } });
      await transaction.reel.update({ where: { id: comment.reelId }, data: { comments: count } });
    });
    return reply.send({ success: true });
  });

  app.post("/v1/reels/:id/comments/:commentId/reaction", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Authentification requise" });
    const reaction = String(request.body?.reaction || "").trim();
    if (!allowedReactions.has(reaction)) return reply.code(400).send({ error: "Réaction invalide" });
    const comment = await prisma.reelComment.findUnique({ where: { id: request.params.commentId }, select: { id: true, reelId: true } });
    if (!comment || comment.reelId !== request.params.id) return reply.code(404).send({ error: "Commentaire non trouvé" });
    await prisma.reelCommentReaction.upsert({ where: { commentId_userId: { commentId: comment.id, userId } }, update: { reaction }, create: { commentId: comment.id, userId, reaction } });
    return reply.send(await getCommentReactionSummary(comment.id, userId));
  });

  app.delete("/v1/reels/:id/comments/:commentId/reaction", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Authentification requise" });
    await prisma.reelCommentReaction.deleteMany({ where: { commentId: request.params.commentId, userId } });
    return reply.send(await getCommentReactionSummary(request.params.commentId, userId));
  });
}

async function getCommentReactionSummary(commentId, userId) {
  const reactions = await prisma.reelCommentReaction.findMany({ where: { commentId } });
  const reactionCounts = reactions.reduce((counts, item) => ({ ...counts, [item.reaction]: (counts[item.reaction] || 0) + 1 }), {});
  return { commentId, reactionCounts, totalCount: reactions.length, userReaction: reactions.find((item) => String(item.userId) === String(userId))?.reaction || null };
}
