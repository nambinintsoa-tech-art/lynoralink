import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { storyId } = params;
    const story = await prisma.story.findUnique({ where: { id: storyId }, select: { userId: true } });
    
    if (!story) {
      return NextResponse.json({ error: "Story not found" }, { status: 404 });
    }
    
    const body = await req.json();
    const { reaction } = body;

    if (!reaction) {
      return NextResponse.json({ error: "Reaction is required" }, { status: 400 });
    }

    // Supprime la réaction existante si elle existe
    await prisma.storyReaction.deleteMany({
      where: { storyId, userId: user.id },
    });

    // Crée la nouvelle réaction
    const newReaction = await prisma.storyReaction.create({
      data: {
        storyId,
        userId: user.id,
        reaction,
      },
    });
    await createNotification({
      userId: story?.userId,
      senderId: user.id,
      type: "like",
      actor: user.name || "Un utilisateur",
      text: `a réagi à votre story (${reaction}).`,
      meta: { storyId, kind: "story_reaction", reaction },
    });

    const reactionRows = await prisma.storyReaction.findMany({
      where: { storyId },
      select: { reaction: true },
    });
    const reactions = reactionRows.reduce((counts, row) => ({
      ...counts,
      [row.reaction]: (counts[row.reaction] || 0) + 1,
    }), {});

    return NextResponse.json({ ...newReaction, reactions });
  } catch (err) {
    console.error("POST /api/stories/[id]/reactions:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
