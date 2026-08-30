import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";

const FOLLOWED_PAGES_KEY = "followedCompanyPages";

async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session.user.id;
}

async function readFollowedPages(userId) {
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: FOLLOWED_PAGES_KEY } },
  });
  try {
    const pages = JSON.parse(setting?.value || "[]");
    return Array.isArray(pages) ? pages.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export async function GET(request) {
  const userId = await getCurrentUser();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const pageId = request.nextUrl.searchParams.get("pageId");
  const followedPages = await readFollowedPages(userId);
  if (!pageId) return NextResponse.json({ followedPages });

  return NextResponse.json({ followed: followedPages.includes(pageId) });
}

export async function POST(request) {
  const userId = await getCurrentUser();
  if (!userId) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const { pageId } = await request.json();
  if (!pageId || typeof pageId !== "string") {
    return NextResponse.json({ error: "Page invalide" }, { status: 400 });
  }

  const pageSetting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: pageId, key: "companyPage" } },
  });
  if (!pageSetting) return NextResponse.json({ error: "Page introuvable" }, { status: 404 });

  let page = {};
  try { page = JSON.parse(pageSetting.value || "{}"); } catch { page = {}; }

  const followedPages = await readFollowedPages(userId);
  const followed = !followedPages.includes(pageId);
  const nextPages = followed
    ? [...followedPages, pageId]
    : followedPages.filter((id) => id !== pageId);

  await prisma.userSetting.upsert({
    where: { userId_key: { userId, key: FOLLOWED_PAGES_KEY } },
    create: { userId, key: FOLLOWED_PAGES_KEY, value: JSON.stringify(nextPages) },
    update: { value: JSON.stringify(nextPages) },
  });

  if (followed && pageId !== userId) {
    const follower = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    const pageName = String(page?.name || "Page entreprise").trim() || "Page entreprise";
    await createNotification({
      userId: pageId,
      senderId: userId,
      type: "page",
      actor: pageName,
      text: `${follower?.name || "Un utilisateur"} a commencé à suivre votre page.`,
      meta: { kind: "followed", pageId, pageName },
    });
  }

  return NextResponse.json({ followed });
}
