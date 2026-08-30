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
  if (!prisma.postShare) {
    return NextResponse.json({ error: "Base de données à mettre à jour" }, { status: 503 });
  }

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) {
    return NextResponse.json({ error: "Publication introuvable" }, { status: 404 });
  }

  await prisma.postShare.create({ data: { postId, userId } });
  const shares = await prisma.postShare.count({ where: { postId } });
  return NextResponse.json({ shares });
}