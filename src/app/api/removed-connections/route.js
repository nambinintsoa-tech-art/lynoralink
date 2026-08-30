import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function requireUser() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function DELETE(req) {
  const userId = await requireUser();
  if (!userId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const targetId = req.nextUrl.searchParams.get("userId");
  if (!targetId) {
    return NextResponse.json({ error: "Utilisateur invalide." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.removedConnection.deleteMany({ where: { userId, targetId } });

    const existingConnection = await tx.connection.findFirst({
      where: {
        OR: [
          { userAId: userId, userBId: targetId },
          { userAId: targetId, userBId: userId },
        ],
      },
    });

    if (existingConnection) {
      return tx.connection.update({
        where: { id: existingConnection.id },
        data: { status: "accepted" },
      });
    }

    return tx.connection.create({
      data: { userAId: userId, userBId: targetId, status: "accepted" },
    });
  });

  return NextResponse.json({ ok: true, restored: true, connection: result });
}
