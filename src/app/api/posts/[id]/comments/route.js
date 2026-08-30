import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { broadcastRealtimeEvent } from "@/lib/realtime";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const postId = params.id;
  const userId = session.user.id;

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });
    const body = await req.json();
    const { text, parentId, media } = body;
    const normalizedText = typeof text === "string" ? text.trim() : "";

    console.log("Comment payload - text:", text, "media:", media);

    // Accepter les commentaires avec texte OU média
    if (!normalizedText && (!media || media.length === 0)) {
      return NextResponse.json({ error: "Le commentaire est vide" }, { status: 400 });
    }

    // Normalize media payload
    let normalizedMedia = null;
    if (media && Array.isArray(media) && media.length > 0) {
      normalizedMedia = JSON.stringify(media);
      console.log("Storing mediaData:", normalizedMedia);
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        authorId: userId,
        text: normalizedText,
        parentId: parentId || null,
        mediaData: normalizedMedia,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        replies: {
          include: {
            author: {
              select: {
                name: true,
                image: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // Parse media for response
    let parsedMedia = [];
    if (comment.mediaData) {
      try {
        parsedMedia = JSON.parse(comment.mediaData);
      } catch (e) {
        parsedMedia = [];
      }
    }

    const formattedComment = {
      id: comment.id,
      author: comment.author.name,
      initials: (comment.author.name || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join(""),
      avatarUrl: comment.author.image || null,
      text: comment.text,
      media: parsedMedia,
      time: comment.createdAt,
      likes: 0,
      liked: false,
      replies: comment.replies.map((reply) => {
        let parsedReplyMedia = [];
        if (reply.mediaData) {
          try {
            parsedReplyMedia = JSON.parse(reply.mediaData);
          } catch (e) {
            parsedReplyMedia = [];
          }
        }

        return {
          id: reply.id,
          author: reply.author.name,
          initials: (reply.author.name || "")
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]?.toUpperCase())
            .join(""),
          avatarUrl: reply.author.image || null,
          text: reply.text,
          media: parsedReplyMedia,
          time: reply.createdAt,
          likes: 0,
          liked: false,
        };
      }),
    };

    await createNotification({
      userId: post?.authorId,
      senderId: userId,
      type: "comment",
      actor: session.user.name || "Un utilisateur",
      text: "a commenté votre publication.",
      meta: { postId, commentId: comment.id },
    });

    broadcastRealtimeEvent({ userId: userId, type: "posts", payload: { postId, action: "comment" } });
    if (post?.authorId) broadcastRealtimeEvent({ userId: post.authorId, type: "posts", payload: { postId, action: "comment" } });
    return NextResponse.json(formattedComment);
  } catch (error) {
    console.error("Erreur lors de la création du commentaire:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
