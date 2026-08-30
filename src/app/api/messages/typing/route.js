import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAuthorizedConversation(conversationId, userId) {
  return prisma.conversation.findFirst({
    where: {
      id: conversationId,
      OR: [
        { userAId: userId },
        { userBId: userId },
        { members: { some: { userId } } },
      ],
    },
    select: { id: true },
  });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!currentUser) return NextResponse.json({ error: "Session utilisateur invalide" }, { status: 401 });

  const { conversationId, typing } = await req.json().catch(() => ({}));
  if (!conversationId) return NextResponse.json({ error: "Conversation manquante." }, { status: 400 });
  if (!(await getAuthorizedConversation(conversationId, currentUser.id))) {
    return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });
  }

  const key = `typing:${conversationId}`;
  if (typing) {
    await prisma.userSetting.upsert({
      where: { userId_key: { userId: currentUser.id, key } },
      update: { value: String(Date.now()) },
      create: { userId: currentUser.id, key, value: String(Date.now()) },
    });
  } else {
    await prisma.userSetting.deleteMany({ where: { userId: currentUser.id, key } });
  }

  return NextResponse.json({ ok: true });
}
