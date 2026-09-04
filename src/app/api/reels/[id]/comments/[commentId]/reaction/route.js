import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_REACTIONS = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

async function responseFor(commentId, userId) {
  const reactions = await prisma.reelCommentReaction.findMany({ where: { commentId } });
  const reactionCounts = reactions.reduce((counts, item) => ({ ...counts, [item.reaction]: (counts[item.reaction] || 0) + 1 }), {});
  return {
    commentId,
    reactionCounts,
    totalCount: reactions.length,
    userReaction: reactions.find((item) => String(item.userId) === String(userId))?.reaction || null,
  };
}

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  const reaction = String((await request.json()).reaction || "").trim();
  if (!ALLOWED_REACTIONS.has(reaction)) return NextResponse.json({ error: "Réaction invalide" }, { status: 400 });

  const comment = await prisma.reelComment.findUnique({ where: { id: params.commentId }, select: { id: true, reelId: true } });
  if (!comment || comment.reelId !== params.id) return NextResponse.json({ error: "Commentaire non trouvé" }, { status: 404 });

  await prisma.reelCommentReaction.upsert({
    where: { commentId_userId: { commentId: params.commentId, userId: session.user.id } },
    update: { reaction },
    create: { commentId: params.commentId, userId: session.user.id, reaction },
  });
  return NextResponse.json(await responseFor(params.commentId, session.user.id));
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
  await prisma.reelCommentReaction.deleteMany({ where: { commentId: params.commentId, userId: session.user.id } });
  return NextResponse.json(await responseFor(params.commentId, session.user.id));
}
