import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_REACTIONS = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

async function getReactionCounts(reelId) {
  const reactions = await prisma.reelReaction.groupBy({
    by: ["reaction"],
    where: { reelId },
    _count: { id: true },
  });

  const counts = {};
  reactions.forEach((r) => {
    counts[r.reaction] = r._count.id;
  });
  return counts;
}

function getTotalCount(counts) {
  return Object.values(counts).reduce((sum, val) => {
    if (typeof val === 'number') return sum + val;
    return sum;
  }, 0);
}

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { id: reelId } = params;
    const body = await request.json();
    const reaction = String(body.reaction || "").trim();

    if (!ALLOWED_REACTIONS.has(reaction)) {
      return NextResponse.json({ error: "Réaction invalide" }, { status: 400 });
    }

    const reel = await prisma.reel.findUnique({ where: { id: reelId } });
    if (!reel) {
      return NextResponse.json({
        reelId,
        userId,
        reaction,
        reactionCounts: {},
        totalCount: 0,
        ok: true,
        source: "fallback",
      });
    }

    const existingReaction = await prisma.reelReaction.findUnique({
      where: { reelId_userId: { reelId, userId } },
    });

    if (existingReaction) {
      await prisma.reelReaction.update({
        where: { id: existingReaction.id },
        data: { reaction },
      });
    } else {
      // Créer une nouvelle réaction
      await prisma.reelReaction.create({
        data: { reelId, userId, reaction },
      });
    }

    // Récupérer les counts mis à jour
    const counts = await getReactionCounts(reelId);

    return NextResponse.json({
      reelId,
      userId,
      reaction,
      reactionCounts: counts,
      totalCount: getTotalCount(counts),
      ok: true,
    });
  } catch (error) {
    console.error("POST /api/reels/[id]/reaction error:", error);
    return NextResponse.json({ error: "Erreur lors de l'enregistrement de la réaction" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = session?.user?.id;
    
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { id: reelId } = params;

    // Chercher et supprimer la réaction existante
    const reaction = await prisma.reelReaction.deleteMany({
      where: { reelId, userId },
    });

    if (reaction.count === 0) {
      return NextResponse.json({ error: "Aucune réaction à supprimer" }, { status: 404 });
    }

    // Récupérer les counts mis à jour
    const counts = await getReactionCounts(reelId);

    return NextResponse.json({
      reelId,
      userId,
      reactionCounts: counts,
      totalCount: getTotalCount(counts),
      ok: true,
    });
  } catch (error) {
    console.error("DELETE /api/reels/[id]/reaction error:", error);
    return NextResponse.json({ error: "Erreur lors de la suppression de la réaction" }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const userId = session?.user?.id;
    
    const { id: reelId } = params;

    if (typeof reelId === "string" && reelId.startsWith("fallback-")) {
      return NextResponse.json({
        reelId,
        userReaction: null,
        reactionCounts: {},
        totalCount: 0,
      });
    }

    let userReaction = null;
    if (userId) {
      const reaction = await prisma.reelReaction.findUnique({
        where: { reelId_userId: { reelId, userId } },
      });
      if (reaction) {
        userReaction = reaction.reaction;
      }
    }

    const counts = await getReactionCounts(reelId);
    const totalCount = getTotalCount(counts);

    return NextResponse.json({
      reelId,
      userReaction,
      reactionCounts: counts,
      totalCount,
    });
  } catch (error) {
    console.error("GET /api/reels/[id]/reaction error:", error);
    return NextResponse.json({ error: "Erreur lors de la récupération de la réaction" }, { status: 500 });
  }
}
