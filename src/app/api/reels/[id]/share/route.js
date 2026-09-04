import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(_request, { params }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const reelId = params.id;

  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const reel = await prisma.reel.findUnique({ where: { id: reelId }, select: { id: true } });
  if (!reel) return NextResponse.json({ error: "Reel introuvable" }, { status: 404 });

  await prisma.reelShare.create({ data: { reelId, userId } });
  const shares = await prisma.reelShare.count({ where: { reelId } });
  return NextResponse.json({ shares });
}
