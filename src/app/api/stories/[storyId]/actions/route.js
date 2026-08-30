import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SAVED_STORIES_KEY = "savedStories";

async function getUser(session) {
  if (!session?.user?.email) return null;
  return prisma.user.findUnique({ where: { email: session.user.email } });
}

export async function POST(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    const user = await getUser(session);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const story = await prisma.story.findUnique({ where: { id: params.storyId }, select: { id: true, userId: true } });
    if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });

    const { action } = await req.json().catch(() => ({}));
    if (action === "save") {
      const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId: user.id, key: SAVED_STORIES_KEY } } });
      let savedStories = [];
      try { savedStories = JSON.parse(setting?.value || "[]"); } catch { savedStories = []; }
      if (!Array.isArray(savedStories)) savedStories = [];
      const saved = !savedStories.includes(story.id);
      const nextStories = saved ? [...savedStories, story.id] : savedStories.filter((id) => id !== story.id);
      await prisma.userSetting.upsert({
        where: { userId_key: { userId: user.id, key: SAVED_STORIES_KEY } },
        update: { value: JSON.stringify(nextStories) },
        create: { userId: user.id, key: SAVED_STORIES_KEY, value: JSON.stringify(nextStories) },
      });
      return NextResponse.json({ ok: true, saved, savedStories: nextStories });
    }

    if (action === "unfollow") {
      if (story.userId === user.id) return NextResponse.json({ error: "Cannot unfollow yourself" }, { status: 400 });
      await prisma.removedConnection.upsert({
        where: { userId_targetId: { userId: user.id, targetId: story.userId } },
        update: {},
        create: { userId: user.id, targetId: story.userId },
      });
      return NextResponse.json({ ok: true, unfollowed: true, targetId: story.userId });
    }

    if (action === "share") return NextResponse.json({ ok: true, shared: true });
    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (error) {
    console.error("POST /api/stories/[id]/actions:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
