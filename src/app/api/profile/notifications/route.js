import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function settingKey(targetId) {
  return `profile_notification_mute:${targetId}`;
}

async function currentUser(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const targetId = new URL(request.url).searchParams.get("targetId")?.trim();
  if (!targetId) return null;
  return { userId: session.user.id, targetId };
}

export async function GET(request) {
  const context = await currentUser(request);
  if (!context) return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId: context.userId, key: settingKey(context.targetId) } } });
  return NextResponse.json({ muted: setting?.value === "true" });
}

export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await request.json().catch(() => null);
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";
  if (!targetId || typeof body?.muted !== "boolean") return NextResponse.json({ error: "Paramètres invalides" }, { status: 400 });
  const setting = await prisma.userSetting.upsert({
    where: { userId_key: { userId: session.user.id, key: settingKey(targetId) } },
    update: { value: String(body.muted) },
    create: { userId: session.user.id, key: settingKey(targetId), value: String(body.muted) },
  });
  return NextResponse.json({ muted: setting.value === "true" });
}
