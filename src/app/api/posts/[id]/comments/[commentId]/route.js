import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function buildInitials(name) {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";
}

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { commentId } = params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        text: true,
        mediaData: true,
        createdAt: true,
      },
    });

    if (!comment) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    if (session.user.id !== comment.authorId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { text } = await req.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Le texte ne peut pas être vide" }, { status: 400 });
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { text: text.trim() },
      include: {
        author: { select: { id: true, name: true, image: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    let parsedMedia = [];
    try {
      parsedMedia = updated.mediaData ? JSON.parse(updated.mediaData) : [];
    } catch {
      parsedMedia = [];
    }

    return NextResponse.json({
      id: updated.id,
      text: updated.text,
      author: updated.author.name,
      initials: buildInitials(updated.author.name),
      avatarUrl: updated.author.image || null,
      createdAt: updated.createdAt,
      media: parsedMedia,
      replies: updated.replies.map((reply) => {
        let replyMedia = [];
        try {
          replyMedia = reply.mediaData ? JSON.parse(reply.mediaData) : [];
        } catch {
          replyMedia = [];
        }

        return {
          id: reply.id,
          author: reply.author.name,
          initials: buildInitials(reply.author.name),
          avatarUrl: reply.author.image || null,
          text: reply.text,
          media: replyMedia,
          time: reply.createdAt,
          likes: 0,
          liked: false,
        };
      }),
    });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du commentaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const { commentId } = params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { id: true, authorId: true },
    });

    if (!comment) {
      return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });
    }

    if (session.user.id !== comment.authorId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur lors de la suppression du commentaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
