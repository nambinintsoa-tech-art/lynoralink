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
  const body = await req.json().catch(() => ({}));
  const reaction = typeof body.reaction === "string" && body.reaction ? body.reaction : "ok";
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true } });

  const existing = await prisma.like.findFirst({ where: { postId, userId, reaction } });

  if (existing) {
    await prisma.like.deleteMany({ where: { postId, userId } });
  } else {
    await prisma.like.deleteMany({ where: { postId, userId } });
    await prisma.like.create({ data: { postId, userId, reaction } });
    await createNotification({
      userId: post?.authorId,
      senderId: userId,
      type: "like",
      actor: session.user.name || "Un utilisateur",
      text: `a réagi à votre publication (${reaction}).`,
      meta: { postId, reaction },
    });
  }

  const likes = await prisma.like.findMany({ where: { postId }, select: { userId: true, reaction: true } });
  const reactions = likes.reduce((counts, like) => {
    const key = like.reaction || "ok";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  const count = likes.length;
  const payload = { liked: likes.some((like) => like.userId === userId), likes: count, reaction: likes.find((like) => like.userId === userId)?.reaction || null, reactions, postId };
  broadcastRealtimeEvent({ userId, type: "reactions", payload });
  if (post?.authorId) broadcastRealtimeEvent({ userId: post.authorId, type: "reactions", payload: { ...payload, authorView: true } });
  return NextResponse.json(payload);
}
