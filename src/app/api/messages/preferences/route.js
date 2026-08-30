import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedKeys = new Set(["pinned", "muted", "archived"]);

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { conversationId, key, value } = await req.json().catch(() => ({}));
  if (!conversationId || !allowedKeys.has(key) || typeof value !== "boolean") {
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
    select: { id: true },
  });
  if (!conversation) return NextResponse.json({ error: "Conversation introuvable." }, { status: 404 });

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: session.user.id, key: `conversation:${conversationId}:${key}` } },
    update: { value: String(value) },
    create: { userId: session.user.id, key: `conversation:${conversationId}:${key}`, value: String(value) },
  });

  return NextResponse.json({ ok: true, conversationId, key, value });
}
