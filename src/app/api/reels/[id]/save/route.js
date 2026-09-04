import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const FALLBACK_KEY = "saved_reel_ids";

function isMissingReelSaveTable(error) {
  return error?.code === "P2021";
}

async function toggleFallbackSave(userId, reelId) {
  const setting = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: FALLBACK_KEY } } });
  let savedIds = [];
  try {
    const parsed = JSON.parse(setting?.value || "[]");
    savedIds = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {}

  const alreadySaved = savedIds.includes(String(reelId));
  savedIds = alreadySaved
    ? savedIds.filter((id) => id !== String(reelId))
    : [...savedIds, String(reelId)];
  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: FALLBACK_KEY } },
    create: { userId, key: FALLBACK_KEY, value: JSON.stringify(savedIds) },
    update: { value: JSON.stringify(savedIds) },
  });
  return { saved: !alreadySaved, saves: savedIds.length };
}

export async function POST(_request, { params }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const reelId = params.id;

  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const reel = await prisma.reel.findUnique({ where: { id: reelId }, select: { id: true } });
  if (!reel) return NextResponse.json({ error: "Reel introuvable" }, { status: 404 });

  try {
    const existing = await prisma.reelSave.findUnique({ where: { reelId_userId: { reelId, userId } } });
    if (existing) {
      await prisma.reelSave.delete({ where: { id: existing.id } });
    } else {
      await prisma.reelSave.create({ data: { reelId, userId } });
    }

    const saves = await prisma.reelSave.count({ where: { reelId } });
    return NextResponse.json({ saved: !existing, saves });
  } catch (error) {
    if (!isMissingReelSaveTable(error)) throw error;
    const fallback = await toggleFallbackSave(userId, reelId);
    return NextResponse.json({ ...fallback, storage: "user-setting-fallback" });
  }
}
