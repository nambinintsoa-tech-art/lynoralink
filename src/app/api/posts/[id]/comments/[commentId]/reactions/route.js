import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id: postId, commentId } = params;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { reaction = "ok" } = body;

    // Vérifier que le commentaire existe
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    // Vérifier que le commentaire appartient au post
    if (comment.postId !== postId) {
      return NextResponse.json({ error: "Commentaire invalide pour ce post" }, { status: 400 });
    }

    // Vérifier si la réaction existe déjà
    const existingReaction = await prisma.commentReaction.findUnique({
      where: {
        commentId_userId_reaction: {
          commentId,
          userId,
          reaction,
        },
      },
    });

    if (existingReaction) {
      // Supprimer la réaction existante
      await prisma.commentReaction.delete({
        where: {
          id: existingReaction.id,
        },
      });
    } else {
      // Créer la réaction
      await prisma.commentReaction.create({
        data: {
          commentId,
          userId,
          reaction,
        },
      });
    }

    // Récupérer le nombre de réactions du commentaire
    const reactionCounts = await prisma.commentReaction.groupBy({
      by: ["reaction"],
      where: { commentId },
      _count: true,
    });

    // Compter le total des réactions
    const totalReactions = reactionCounts.reduce((sum, item) => sum + item._count, 0);

    // Récupérer la réaction de l'utilisateur actuel
    const userReaction = await prisma.commentReaction.findFirst({
      where: { commentId, userId },
    });

    return NextResponse.json({
      success: true,
      reaction: userReaction?.reaction || null,
      totalReactions,
      reactions: reactionCounts,
    });
  } catch (error) {
    console.error("Erreur lors de la gestion de la réaction:", error);
    return NextResponse.json(
      { error: "Erreur lors de la gestion de la réaction" },
      { status: 500 }
    );
  }
}

export async function GET(req, { params }) {
  const { id: postId, commentId } = params;

  try {
    // Vérifier que le commentaire existe et appartient au post
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.postId !== postId) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    // Récupérer les réactions du commentaire
    const reactionCounts = await prisma.commentReaction.groupBy({
      by: ["reaction"],
      where: { commentId },
      _count: true,
    });

    const totalReactions = reactionCounts.reduce((sum, item) => sum + item._count, 0);

    const session = await getServerSession(authOptions);
    let userReaction = null;

    if (session?.user?.id) {
      const userReactionData = await prisma.commentReaction.findFirst({
        where: { commentId, userId: session.user.id },
      });
      userReaction = userReactionData?.reaction || null;
    }

    return NextResponse.json({
      totalReactions,
      reactions: reactionCounts,
      userReaction,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des réactions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des réactions" },
      { status: 500 }
    );
  }
}
