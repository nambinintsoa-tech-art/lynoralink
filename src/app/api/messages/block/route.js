import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const blocked = await prisma.removedConnection.findMany({
    where: { userId: session.user.id },
    select: {
      target: { select: { id: true, name: true, title: true, image: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users: blocked.map(({ target, createdAt }) => ({ ...target, createdAt })) });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { conversationId, targetUserId: requestedTargetId } = await req.json().catch(() => ({}));
  if (!conversationId) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { userAId: session.user.id },
        { userBId: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
    },
    select: { userAId: true, userBId: true },
  });
  const targetUserId = requestedTargetId || (conversation?.userAId === session.user.id ? conversation.userBId : conversation?.userAId);
  if (!targetUserId || targetUserId === session.user.id) {
    return NextResponse.json({ error: "Utilisateur à bloquer introuvable." }, { status: 400 });
  }
  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!targetUser) return NextResponse.json({ error: "Utilisateur à bloquer introuvable." }, { status: 404 });

  await prisma.$transaction([
    prisma.removedConnection.upsert({
      where: { userId_targetId: { userId: session.user.id, targetId: targetUserId } },
      update: { createdAt: new Date() },
      create: { userId: session.user.id, targetId: targetUserId },
    }),
    prisma.connection.deleteMany({
      where: {
        OR: [
          { userAId: session.user.id, userBId: targetUserId },
          { userAId: targetUserId, userBId: session.user.id },
        ],
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
