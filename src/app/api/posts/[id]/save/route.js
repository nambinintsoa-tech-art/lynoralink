import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const postId = params.id;

  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (!prisma.savedPost) {
    return NextResponse.json({ error: "Base de données à mettre à jour" }, { status: 503 });
  }

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }

  const existing = await prisma.savedPost.findUnique({
    where: { postId_userId: { postId, userId } },
  });

  if (existing) {
    await prisma.savedPost.delete({ where: { id: existing.id } });
    const bookmarks = await prisma.savedPost.count({ where: { postId } });
    return NextResponse.json({ bookmarked: false, bookmarks });
  }

  await prisma.savedPost.create({ data: { postId, userId } });
  const bookmarks = await prisma.savedPost.count({ where: { postId } });
  return NextResponse.json({ bookmarked: true, bookmarks });
}