import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const scope = body.scope === "everyone" ? "everyone" : "me";
  const message = await prisma.message.findFirst({
    where: { id: params.id, conversation: { OR: [{ userAId: session.user.id }, { userBId: session.user.id }, { members: { some: { userId: session.user.id } } }] } },
    select: { id: true, senderId: true },
  });
  if (!message) return NextResponse.json({ error: "Message introuvable." }, { status: 404 });
  if (scope === "everyone" && message.senderId !== session.user.id) {
    return NextResponse.json({ error: "Vous ne pouvez supprimer que vos propres messages pour tout le monde." }, { status: 403 });
  }

  if (scope === "everyone") {
    await prisma.message.update({ where: { id: message.id }, data: { deletedForEveryone: true, text: "", mediaData: null } });
  } else {
    await prisma.messageDeletion.upsert({
      where: { messageId_userId: { messageId: message.id, userId: session.user.id } },
      create: { messageId: message.id, userId: session.user.id },
      update: {},
    });
  }
  return NextResponse.json({ ok: true, scope });
}