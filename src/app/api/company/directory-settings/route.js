import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const KEY = "companyDirectorySettings";
const DEFAULTS = { showSuggestions: true, compactCards: false, emailNotifications: true };

async function userId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

function parse(value) {
  try { return { ...DEFAULTS, ...(JSON.parse(value || "{}")) }; } catch { return DEFAULTS; }
}

export async function GET() {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId: id, key: KEY } } });
  return NextResponse.json({ settings: parse(setting?.value) });
}

export async function PATCH(request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const settings = {
    showSuggestions: Boolean(body.showSuggestions),
    compactCards: Boolean(body.compactCards),
    emailNotifications: Boolean(body.emailNotifications),
  };
  await prisma.userSetting.upsert({
    where: { userId_key: { userId: id, key: KEY } },
    create: { userId: id, key: KEY, value: JSON.stringify(settings) },
    update: { value: JSON.stringify(settings) },
  });
  return NextResponse.json({ ok: true, settings });
}
