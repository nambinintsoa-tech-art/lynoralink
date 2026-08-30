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
    const existingView = await prisma.storyView.findUnique({
      where: { storyId_userId: { storyId, userId: user.id } },
    });

    // Marque la story comme vue
    const view = await prisma.storyView.upsert({
      where: { storyId_userId: { storyId, userId: user.id } },
      update: { viewedAt: new Date() },
      create: { storyId, userId: user.id },
    });
    if (!existingView) {
      await createNotification({
        userId: story?.userId,
        senderId: user.id,
        type: "story",
        actor: user.name || "Un utilisateur",
        text: "a vu votre story.",
        meta: { storyId, kind: "story_view" },
      });
    }

    return NextResponse.json(view);
  } catch (err) {
    console.error("POST /api/stories/[id]/views:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
