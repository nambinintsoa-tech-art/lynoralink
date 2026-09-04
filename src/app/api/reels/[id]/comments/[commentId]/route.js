/**
 * /api/reels/[id]/comments/[commentId]/route.js
 * ─────────────────────────────────────────────────────────────────────────
 * API pour les opérations individuelles sur les commentaires des réels
 * Gère PATCH (édition) et DELETE (suppression)
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    const comment = await prisma.reelComment.findUnique({ where: { id: commentId } });

    if (!comment) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    if (comment.reelId !== reelId || comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const updated = await prisma.reelComment.update({ where: { id: commentId }, data: { text: text.trim() } });
    return NextResponse.json(updated);
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
    const comment = await prisma.reelComment.findUnique({ where: { id: commentId } });

    if (!comment) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    if (comment.reelId !== reelId || comment.authorId !== session.user.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.reelComment.delete({ where: { id: commentId } });
    const deletedCommentCount = await prisma.reelComment.count({ where: { reelId } });
    await prisma.reel.update({ where: { id: reelId }, data: { comments: deletedCommentCount } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
