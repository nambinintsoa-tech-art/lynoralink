import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const { getReelsSource } = require("@/lib/reels");
const FALLBACK_SAVE_KEY = "saved_reel_ids";

function normalizeTone(value) {
  const fallback = ["#1D2F5C", "#0A1530"];

  if (Array.isArray(value) && value.length >= 2) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return parsed;
      }
    } catch {
      // Ignore malformed legacy values and fall back to the default palette.
    }
  }

  return fallback;
}

function decodeCursor(value) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const createdAt = new Date(parsed.createdAt);
    if (!parsed.id || Number.isNaN(createdAt.getTime())) return null;
    return { id: String(parsed.id), createdAt };
  } catch {
    return null;
  }
}

function encodeCursor(reel) {
  return Buffer.from(JSON.stringify({ id: reel.id, createdAt: reel.createdAt.toISOString() })).toString("base64url");
}

async function getFallbackSavedReelIds(userId) {
  const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: FALLBACK_SAVE_KEY } } });
  try {
    const parsed = JSON.parse(setting?.value || "[]");
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "10", 10) || 10, 1), 20);
    const cursorValue = searchParams.get("cursor");
    const cursor = decodeCursor(cursorValue);
    const savedOnly = searchParams.get("savedOnly") === "true";
    const authorId = searchParams.get("authorId");
    const pageId = searchParams.get("pageId");
    const userId = searchParams.get("userId") || session?.user?.id || null;

    if (cursorValue && !cursor) {
      return NextResponse.json({ error: "Curseur de pagination invalide." }, { status: 400 });
    }
    if (savedOnly && !userId) {
      return NextResponse.json({ reels: [], total: 0, hasMore: false, nextCursor: null, userId: null, source: "database" });
    }

    try {
      const where = { status: "published" };
      if (savedOnly) where.saves = { some: { userId } };
      if (authorId) {
        where.authorId = authorId;
        where.companyPageId = null;
      }
      if (pageId) where.companyPageId = pageId;
      if (cursor) {
        where.OR = [
          { createdAt: { lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, id: { lt: cursor.id } },
        ];
      }

      let fallbackSavedReelIds = new Set();
      let reels;
      try {
        reels = await prisma.reel.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: limit + 1,
        });
      } catch (error) {
        if (!savedOnly || error?.code !== "P2021") throw error;
        fallbackSavedReelIds = await getFallbackSavedReelIds(userId);
        if (fallbackSavedReelIds.size === 0) {
          reels = [];
        } else {
          const fallbackWhere = { ...where, id: { in: [...fallbackSavedReelIds] } };
          delete fallbackWhere.saves;
          reels = await prisma.reel.findMany({
            where: fallbackWhere,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            take: limit + 1,
          });
        }
      }
      const hasMore = reels.length > limit;
      const pageReels = hasMore ? reels.slice(0, limit) : reels;

      const reelIds = pageReels.map((reel) => reel.id);
      const [reelSavesResult, reelSharesResult] = await Promise.allSettled([
        userId
          ? prisma.reelSave.findMany({ where: { reelId: { in: reelIds }, userId }, select: { reelId: true } })
          : Promise.resolve([]),
        prisma.reelShare.groupBy({ by: ["reelId"], where: { reelId: { in: reelIds } }, _count: { reelId: true } }),
      ]);
      const reelSaves = reelSavesResult.status === "fulfilled" ? reelSavesResult.value : [];
      const reelShares = reelSharesResult.status === "fulfilled" ? reelSharesResult.value : [];
      if (reelSavesResult.status === "rejected" || reelSharesResult.status === "rejected") {
        console.warn("GET /api/reels: tables ReelSave/ReelShare indisponibles; compteurs auxiliaires ignores.");
      }
      const savedReelIds = new Set([...fallbackSavedReelIds, ...reelSaves.map((save) => save.reelId)]);
      const shareCounts = new Map(reelShares.map((share) => [share.reelId, share._count.reelId]));

      const normalized = pageReels
        .map((reel) => {
          const authorType = reel.authorType || (reel.companyPageId ? "page" : "user");
          const authorPageId = reel.companyPageId || null;

          return {
            id: reel.id,
            videoUrl: reel.videoUrl,
            poster: reel.poster,
            tone: normalizeTone(reel.tone),
            author: {
              id: reel.authorId || null,
              userId: reel.authorId || null,
              pageId: authorPageId,
              companyPageId: authorPageId,
              type: authorType,
              accountType: authorType,
              isPage: Boolean(authorPageId || authorType === "page" || authorType === "company"),
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
            liked: reel.liked,
            saved: savedReelIds.has(reel.id),
            createdAt: reel.createdAt,
          };
        })
        .filter((reel) => Boolean(reel.videoUrl || reel.poster));

      return NextResponse.json({
        reels: normalized,
        total: normalized.length,
        hasMore,
        nextCursor: hasMore && pageReels.length ? encodeCursor(pageReels[pageReels.length - 1]) : null,
        userId,
        source: "database",
      });
    } catch (dbError) {
      console.error("GET /api/reels database error:", dbError);
      return NextResponse.json({
        reels: [],
        total: 0,
        userId,
        source: "error",
        error: "Impossible de charger les reels depuis la base de données.",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("GET /api/reels error:", error);
    return NextResponse.json({
      reels: [],
      total: 0,
      userId: null,
      source: "error",
      error: error?.message || "Impossible de charger les reels",
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const reel = body && typeof body === "object" ? body : {};
    const mediaItems = Array.isArray(reel.media) ? reel.media : [];
    const fallbackVideoUrl = mediaItems.find((item) => item && item.type === "video" && typeof item.url === "string" && item.url.trim())?.url || null;
    const resolvedVideoUrl = String(reel.videoUrl || fallbackVideoUrl || "").trim() || null;

    if (!resolvedVideoUrl) {
      return NextResponse.json({ error: "Une URL vidéo est requise." }, { status: 400 });
    }

    const author = reel.author || {};
    const safeTone = normalizeTone(reel.tone);
    const authorId = author.id || author.userId || author.profileId || author.authorId || null;
    const authorPageId = author.pageId || author.companyPageId || author.companyId || null;
    const authorType = author.type || author.accountType || (authorPageId ? "page" : "user");

    try {
      const createdReel = await prisma.reel.create({
        data: {
          videoUrl: resolvedVideoUrl,
          poster: reel.poster || mediaItems.find((item) => item && item.type !== "video" && typeof item.url === "string" && item.url.trim())?.url || null,
          tone: JSON.stringify(safeTone),
          authorId,
          companyPageId: authorPageId,
          authorType,
          authorName: author.name || "Utilisateur",
          authorHandle: author.handle || "@utilisateur",
          authorAvatar: author.avatar || null,
          authorVerified: Boolean(author.verified),
          caption: reel.caption || null,
          sound: reel.sound || "Son original",
          likes: Number(reel.likes || 0),
          comments: Number(reel.comments || 0),
          shares: Number(reel.shares || 0),
          following: Boolean(reel.following),
          liked: Boolean(reel.liked),
          saved: Boolean(reel.saved),
          status: "published",
        },
      });

      return NextResponse.json({ reel: createdReel, ok: true }, { status: 201 });
    } catch (dbError) {
      console.error("POST /api/reels database error:", dbError);
      return NextResponse.json({
        error: "Échec de l'enregistrement du reel dans la base de données.",
        details: dbError?.message || "Database write failed",
        ok: false,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("POST /api/reels error:", error);
    return NextResponse.json({
      error: "Erreur lors de la création du reel",
      details: error?.message || "Unknown error",
      ok: false,
    }, { status: 500 });
  }
}
