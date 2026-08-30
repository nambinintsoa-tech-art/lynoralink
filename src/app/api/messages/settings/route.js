import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  incomingCallSounds: true,
  messageSounds: true,
  autoOpenNewMessages: false,
  onlineStatus: true,
  readReceipts: true,
  typingIndicator: true,
  messagePreview: true,
  filterRequests: false,
  newMessageNotifications: true,
  whoCanMessage: "everyone",
};

const allowedKeys = new Set(Object.keys(DEFAULTS));
const allowedWhoCanMessage = new Set(["everyone", "connections", "nobody"]);

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const rows = await prisma.userSetting.findMany({
    where: {
      userId: session.user.id,
      OR: [{ key: { startsWith: "messageSetting:" } }, { key: "showOnlineStatus" }],
    },
    select: { key: true, value: true },
  });
  const settings = { ...DEFAULTS };
  rows.forEach((row) => {
    if (row.key === "showOnlineStatus") {
      settings.onlineStatus = row.value === "true";
      return;
    }
    const key = row.key.slice("messageSetting:".length);
    if (!allowedKeys.has(key)) return;
    settings[key] = key === "whoCanMessage" ? row.value : row.value === "true";
  });
  return NextResponse.json({ settings });
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const currentUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true } });
  if (!currentUser) return NextResponse.json({ error: "Session utilisateur invalide" }, { status: 401 });

  const { key, value } = await req.json().catch(() => ({}));
  const validValue = key === "whoCanMessage"
    ? typeof value === "string" && allowedWhoCanMessage.has(value)
    : allowedKeys.has(key) && typeof value === "boolean";
  if (!validValue) {
    return NextResponse.json({ error: "Paramètres invalides." }, { status: 400 });
  }

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: currentUser.id, key: `messageSetting:${key}` } },
    update: { value: String(value) },
    create: { userId: currentUser.id, key: `messageSetting:${key}`, value: String(value) },
  });
  if (key === "onlineStatus") {
    await prisma.userSetting.upsert({
      where: { userId_key: { userId: currentUser.id, key: "showOnlineStatus" } },
      update: { value: String(value) },
      create: { userId: currentUser.id, key: "showOnlineStatus", value: String(value) },
    });
  }
  return NextResponse.json({ ok: true, key, value });
}
