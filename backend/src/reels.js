import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const fallbackTone = ["#1D2F5C", "#0A1530"];

function normalizeTone(value) {
  if (Array.isArray(value) && value.length >= 2) return value;
  try {
    const parsed = value ? JSON.parse(value) : null;
    return Array.isArray(parsed) && parsed.length >= 2 ? parsed : fallbackTone;
  } catch {
    return fallbackTone;
  }
}

function decodeCursor(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const createdAt = new Date(parsed.createdAt);
    return parsed.id && !Number.isNaN(createdAt.getTime()) ? { id: String(parsed.id), createdAt } : null;
  } catch {
    return null;
  }
}

function encodeCursor(reel) {
  return Buffer.from(JSON.stringify({ id: reel.id, createdAt: reel.createdAt.toISOString() })).toString("base64url");
}

export async function registerReelRoutes(app) {
  app.post("/v1/reels", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifié" });
    const reel = request.body && typeof request.body === "object" ? request.body : {};
    const mediaItems = Array.isArray(reel.media) ? reel.media : [];
    const videoUrl = String(reel.videoUrl || mediaItems.find((item) => item?.type === "video" && typeof item.url === "string" && item.url.trim())?.url || "").trim();
    if (!videoUrl) return reply.code(400).send({ error: "Une URL vidéo est requise." });
    const author = reel.author || {};
    const authorPageId = author.pageId || author.companyPageId || author.companyId || null;
    const createdReel = await prisma.reel.create({ data: {
      videoUrl,
      poster: reel.poster || mediaItems.find((item) => item?.type !== "video" && typeof item.url === "string" && item.url.trim())?.url || null,
      tone: JSON.stringify(normalizeTone(reel.tone)),
      authorId: userId,
      companyPageId: authorPageId,
      authorType: author.type || author.accountType || (authorPageId ? "page" : "user"),
      authorName: author.name || "Utilisateur",
      authorHandle: author.handle || "@utilisateur",
      authorAvatar: author.avatar || null,
      authorVerified: Boolean(author.verified),
      caption: reel.caption || null,
      sound: reel.sound || "Son original",
      likes: Number(reel.likes || 0),
      comments: Number(reel.comments || 0),
      shares: Number(reel.shares || 0),
      status: "published",
    } });
    return reply.code(201).send({ reel: createdReel, ok: true });
  });

  app.get("/v1/reels", async (request, reply) => {
    const userId = await getSessionUserId(request);
    const query = request.query || {};
    const limit = Math.min(Math.max(Number.parseInt(query.limit || "10", 10) || 10, 1), 20);
    const cursor = decodeCursor(query.cursor);

    if (query.cursor && !cursor) {
      return reply.code(400).send({ error: "Curseur de pagination invalide." });
    }

    const where = {
      status: "published",
      ...(query.authorId ? { authorId: query.authorId, companyPageId: null } : {}),
      ...(query.pageId ? { companyPageId: query.pageId } : {}),
      ...(query.savedOnly === "true" && userId ? { saves: { some: { userId } } } : {}),
      ...(cursor ? { OR: [{ createdAt: { lt: cursor.createdAt } }, { createdAt: cursor.createdAt, id: { lt: cursor.id } }] } : {}),
    };

    const reels = await prisma.reel.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
    });
    const hasMore = reels.length > limit;
    const pageReels = hasMore ? reels.slice(0, limit) : reels;
    const reelIds = pageReels.map((reel) => reel.id);

    const [reactions, saves, shares] = await Promise.all([
      userId ? prisma.reelReaction.findMany({ where: { reelId: { in: reelIds }, userId }, select: { reelId: true, reaction: true } }) : [],
      userId ? prisma.reelSave.findMany({ where: { reelId: { in: reelIds }, userId }, select: { reelId: true } }) : [],
      prisma.reelShare.groupBy({ by: ["reelId"], where: { reelId: { in: reelIds } }, _count: { reelId: true } }),
    ]);
    const userReactions = new Map(reactions.map((reaction) => [reaction.reelId, reaction.reaction]));
    const savedIds = new Set(saves.map((save) => save.reelId));
    const shareCounts = new Map(shares.map((share) => [share.reelId, share._count.reelId]));

    return reply.send({
      reels: pageReels
        .map((reel) => {
          const authorType = reel.authorType || (reel.companyPageId ? "page" : "user");
          return {
            id: reel.id,
            videoUrl: reel.videoUrl,
            poster: reel.poster,
            tone: normalizeTone(reel.tone),
            author: {
              id: reel.authorId || null,
              userId: reel.authorId || null,
              pageId: reel.companyPageId || null,
              companyPageId: reel.companyPageId || null,
              type: authorType,
              accountType: authorType,
              isPage: Boolean(reel.companyPageId || authorType === "page" || authorType === "company"),
              name: reel.authorName || "Utilisateur",
              handle: reel.authorHandle || "@utilisateur",
              avatar: reel.authorAvatar,
              verified: reel.authorVerified,
            },
            caption: reel.caption,
            sound: reel.sound,
            likes: reel.likes,
            comments: reel.comments,
            shares: Math.max(Number(reel.shares || 0), shareCounts.get(reel.id) || 0),
            following: reel.following,
            liked: userReactions.has(reel.id),
            reaction: userReactions.get(reel.id) || null,
            saved: savedIds.has(reel.id),
            createdAt: reel.createdAt,
          };
        })
        .filter((reel) => Boolean(reel.videoUrl || reel.poster)),
      total: pageReels.length,
      hasMore,
      nextCursor: hasMore && pageReels.length ? encodeCursor(pageReels[pageReels.length - 1]) : null,
      userId,
      source: "database",
    });
  });
}
