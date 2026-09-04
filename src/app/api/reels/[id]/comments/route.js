/**
 * /api/reels/[id]/comments/route.js
 * ─────────────────────────────────────────────────────────────────────────
 * API pour les commentaires des réels
 * Alignée avec /api/posts/[id]/comments/route.js
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseMedia(mediaData) {
  try { return mediaData ? JSON.parse(mediaData) : []; } catch { return []; }
}

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (!Number.isFinite(seconds) || seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} minute${minutes > 1 ? "s" : ""}`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} heure${hours > 1 ? "s" : ""}`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "hier";
  return `il y a ${days} jour${days > 1 ? "s" : ""}`;
}

function formatComment(comment, currentUserId) {
  const reactions = comment.reactions || [];
  const reactionKeys = [...new Set(reactions.map((item) => item.reaction))];
  const userReaction = reactions.find((item) => String(item.userId) === String(currentUserId))?.reaction || null;
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
    at: formatRelativeTime(comment.createdAt),
    likes: reactions.length,
    totalReactions: reactions.length,
    reactionKeys,
    reaction: userReaction,
    liked: Boolean(userReaction),
    isOwn: String(comment.authorId) === String(currentUserId),
    replies: (comment.replies || []).map((reply) => formatComment(reply, currentUserId)),
  };
}

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "U";
}

/**
 * GET /api/reels/[id]/comments
 * Retourne tous les commentaires d'un réel
 */
export async function GET(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    
    const reelId = params.id;
    const comments = await prisma.reelComment.findMany({
      where: { reelId, parentId: null },
      include: {
        author: { select: { id: true, name: true, image: true } },
        replies: { include: { author: { select: { id: true, name: true, image: true } }, reactions: true }, orderBy: { createdAt: "asc" } },
        reactions: true,
      },
      orderBy: { createdAt: "asc" },
    });
    const enrichedComments = comments.map((comment) => formatComment(comment, currentUserId));
    
    return NextResponse.json({
      comments: enrichedComments,
      total: enrichedComments.length,
    });
  } catch (error) {
    console.error("Erreur lors du chargement des commentaires:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement des commentaires" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reels/[id]/comments
 * Crée un nouveau commentaire sur un réel
 */
export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const reelId = params.id;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { text, parentId, media } = body;
    const normalizedText = typeof text === "string" ? text.trim() : "";

    // Accepter les commentaires avec texte OU média
    if (!normalizedText && (!media || media.length === 0)) {
      return NextResponse.json({ error: "Le commentaire est vide" }, { status: 400 });
    }

    const comment = await prisma.reelComment.create({
      data: { reelId, authorId: userId, text: normalizedText, parentId: parentId || null, mediaData: Array.isArray(media) && media.length ? JSON.stringify(media) : null },
      include: { author: { select: { id: true, name: true, image: true } }, replies: true },
    });
    await prisma.reel.update({ where: { id: reelId }, data: { comments: { increment: 1 } } });

    return NextResponse.json(formatComment(comment, userId));
  } catch (error) {
    console.error("Erreur lors de la création du commentaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * PATCH /api/reels/[id]/comments/[commentId]
 * Modifie un commentaire
 */
export async function PATCH(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: reelId, commentId } = params;
  const body = await req.json();
  const { text } = body;

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Le texte ne peut pas être vide" }, { status: 400 });
  }

  try {
    const comments = reelCommentsStore.get(reelId) || [];
    const comment = findCommentById(comments, commentId);

    if (!comment) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    comment.text = text.trim();
    comment.time = new Date();
    comment.at = "à l'instant";

    reelCommentsStore.set(reelId, comments);
    return NextResponse.json(comment);
  } catch (error) {
    console.error("Erreur lors de la modification:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * DELETE /api/reels/[id]/comments/[commentId]
 * Supprime un commentaire
 */
export async function DELETE(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: reelId, commentId } = params;

  try {
    const comments = reelCommentsStore.get(reelId) || [];
    const comment = findCommentById(comments, commentId);

    if (!comment) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    if (comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    // Supprimer le commentaire
    removeCommentById(comments, commentId);
    reelCommentsStore.set(reelId, comments);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
