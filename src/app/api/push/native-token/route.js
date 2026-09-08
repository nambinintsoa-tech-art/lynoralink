import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

export async function POST(request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = body.platform === "ios" ? "ios" : "android";
  if (!token || token.length > 4096) {
    return NextResponse.json({ error: "Token natif invalide" }, { status: 400 });
  }

  const existing = await prisma.nativePushToken.findUnique({
    where: { token },
    select: { id: true, userId: true },
  });
  if (existing && existing.userId !== userId) {
    await prisma.nativePushToken.delete({ where: { id: existing.id } }).catch(() => {});
  }

  await prisma.nativePushToken.upsert({
    where: { token },
    update: { userId, platform },
    create: { userId, token, platform },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (token) {
    await prisma.nativePushToken.deleteMany({ where: { token, userId } });
  }
  return NextResponse.json({ ok: true });
}
