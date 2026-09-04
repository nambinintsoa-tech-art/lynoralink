import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const reel = await prisma.reel.findUnique({
    where: { id: params.id },
    select: { id: true, authorId: true },
  });

  if (!reel) {
    return NextResponse.json({ error: "Reel introuvable" }, { status: 404 });
  }

  if (!reel.authorId || String(reel.authorId) !== String(session.user.id)) {
    return NextResponse.json({ error: "Vous ne pouvez pas supprimer ce reel" }, { status: 403 });
  }

  await prisma.reel.delete({ where: { id: reel.id } });
  return NextResponse.json({ ok: true, id: reel.id });
}
