import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_REACTIONS = new Set(["ok", "love", "triste", "hahaha", "colere", "waouh"]);

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const reaction = String(body.reaction || "");
  if (!ALLOWED_REACTIONS.has(reaction)) return NextResponse.json({ error: "Réaction invalide." }, { status: 400 });

  const message = await prisma.message.findFirst({
    where: { id: params.id, conversation: { OR: [{ userAId: session.user.id }, { userBId: session.user.id }, { members: { some: { userId: session.user.id } } }] } },
    select: { id: true },
  });
  if (!message) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });

  const current = await prisma.messageReaction.findUnique({ where: { messageId_userId: { messageId: message.id, userId: session.user.id } } });
  await prisma.$transaction([
    prisma.messageReaction.deleteMany({ where: { messageId: message.id, userId: session.user.id } }),
    ...(current?.reaction !== reaction ? [prisma.messageReaction.create({ data: { messageId: message.id, userId: session.user.id, reaction } })] : []),
  ]);
  return NextResponse.json({ ok: true, reaction: current?.reaction === reaction ? null : reaction });
}