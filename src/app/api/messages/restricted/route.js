import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSessionUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const settings = await prisma.userSetting.findMany({
    where: { userId, key: { startsWith: "restrictedUser:" }, value: "true" },
    select: { key: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const ids = settings.map((setting) => setting.key.slice("restrictedUser:".length));
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, title: true, image: true },
  });
  const updatedAtById = new Map(settings.map((setting) => [setting.key.slice("restrictedUser:".length), setting.updatedAt]));

  return NextResponse.json({
    users: users.map((user) => ({ ...user, createdAt: updatedAtById.get(user.id) })),
  });
}

export async function POST(req) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const { userId: targetId } = await req.json().catch(() => ({}));
  if (!targetId || targetId === userId) return NextResponse.json({ error: "Utilisateur invalide." }, { status: 400 });

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: `restrictedUser:${targetId}` } },
    update: { value: "true" },
    create: { userId, key: `restrictedUser:${targetId}`, value: "true" },
  });
  return NextResponse.json({ ok: true, userId: targetId });
}
