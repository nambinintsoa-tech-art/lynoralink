import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { action } = await req.json().catch(() => ({}));
  if (!["accept", "decline"].includes(action)) return NextResponse.json({ error: "Action invalide." }, { status: 400 });

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: params.id,
      isGroup: false,
      OR: [{ userAId: session.user.id }, { userBId: session.user.id }],
    },
    select: { userAId: true, userBId: true },
  });
  if (!conversation) return NextResponse.json({ error: "Invitation introuvable." }, { status: 404 });
  const targetId = conversation.userAId === session.user.id ? conversation.userBId : conversation.userAId;

  if (action === "decline") {
    await prisma.conversation.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, deleted: true });
  }

  const existingConnection = await prisma.connection.findFirst({
    where: {
      OR: [
        { userAId: session.user.id, userBId: targetId },
        { userAId: targetId, userBId: session.user.id },
      ],
    },
  });
  if (existingConnection) {
    await prisma.connection.update({ where: { id: existingConnection.id }, data: { status: "accepted" } });
  } else {
    await prisma.connection.create({ data: { userAId: session.user.id, userBId: targetId, status: "accepted" } });
  }
  return NextResponse.json({ ok: true, accepted: true });
}
