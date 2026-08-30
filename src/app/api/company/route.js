import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionAccess } from "@/lib/subscription";
import { getCompanyFollowers } from "@/lib/companyFollowers";

const USER_SELECT = {
  id: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { posts: true, comments: true } },
};

function toCompany(page, user, isPremium = false, subscribers = []) {
  const name = page.name || "Mon entreprise";

  return {
    id: user.id,
    name,
    displayName: name,
    slogan: page.slogan || null,
    description: page.description || null,
    industry: page.industry || null,
    location: page.location || null,
    size: page.size || null,
    website: page.website || null,
    logoUrl: page.logoUrl || null,
    avatarUrl: page.logoUrl || null,
    bannerUrl: page.bannerUrl || null,
    coverUrl: page.bannerUrl || null,
    media: Array.isArray(page.media) ? page.media : [],
    jobs: Array.isArray(page.jobs) ? page.jobs : [],
    coverColor: "#1e3a8a",
    accentColor: "#f59e0b",
    stats: {
      posts: user._count?.posts || 0,
      comments: user._count?.comments || 0,
      followers: subscribers.length,
    },
    subscribers,
    createdAt: page.createdAt || user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    isPremium,
  };
}

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: USER_SELECT,
  });
}

export async function GET() {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: user.id, key: "companyPage" } },
  });
  if (!setting) return NextResponse.json(null);

  let page;
  try { page = JSON.parse(setting.value); } catch { page = null; }
  if (!page || typeof page !== "object") return NextResponse.json(null);
  const access = await getSubscriptionAccess(user.id);
  const subscribers = await getCompanyFollowers(prisma, user.id);
  const followedSetting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: user.id, key: "followedCompanyPages" } },
  });
  let followedPages = [];
  try { followedPages = JSON.parse(followedSetting?.value || "[]"); } catch { followedPages = []; }
  if (!Array.isArray(followedPages)) followedPages = [];
  return NextResponse.json({ ...toCompany(page, user, access.isPremium, subscribers), followed: followedPages.includes(user.id) });
}

export async function PUT(request) {
  const user = await getAuthenticatedUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const access = await getSubscriptionAccess(user.id);
  if (!access.isPremium) {
    return NextResponse.json(
      { error: access.expired ? "Votre période Premium est terminée." : "La création d'une page entreprise nécessite le forfait Premium." },
      { status: 403 }
    );
  }

  const body = await request.json();
  const existing = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: user.id, key: "companyPage" } },
  });
  let current = {};
  try { current = existing ? JSON.parse(existing.value) : {}; } catch { current = {}; }

  const page = {
    ...current,
    name: String(body.displayName ?? body.name ?? current.name ?? "").trim() || "Mon entreprise",
    slogan: body.slogan !== undefined ? body.slogan || null : current.slogan || null,
    description: body.description !== undefined ? body.description || null : current.description || null,
    industry: body.industry !== undefined ? body.industry || null : current.industry || null,
    location: body.location !== undefined ? body.location || null : current.location || null,
    website: body.website !== undefined ? body.website || null : current.website || null,
    logoUrl: body.logoUrl !== undefined ? body.logoUrl || null : current.logoUrl || null,
    bannerUrl: body.bannerUrl !== undefined ? body.bannerUrl || null : current.bannerUrl || null,
    media: body.media !== undefined && Array.isArray(body.media) ? body.media : (Array.isArray(current.media) ? current.media : []),
    jobs: body.jobs !== undefined && Array.isArray(body.jobs) ? body.jobs.slice(0, 100).map((job) => ({
      id: String(job.id || crypto.randomUUID()),
      title: String(job.title || "").trim().slice(0, 140),
      type: String(job.type || "Offre d'emploi").trim().slice(0, 60),
      contract: String(job.contract || "").trim().slice(0, 60),
      loc: String(job.loc || "").trim().slice(0, 100),
      description: String(job.description || "").trim().slice(0, 3000),
      createdAt: job.createdAt || new Date().toISOString(),
    })).filter((job) => job.title && job.description) : (Array.isArray(current.jobs) ? current.jobs : []),
    createdAt: current.createdAt || new Date().toISOString(),
  };

  await prisma.userSetting.upsert({
    where: { userId_key: { userId: user.id, key: "companyPage" } },
    create: { userId: user.id, key: "companyPage", value: JSON.stringify(page) },
    update: { value: JSON.stringify(page) },
  });
  const updatedAccess = await getSubscriptionAccess(user.id);
  const subscribers = await getCompanyFollowers(prisma, user.id);
  return NextResponse.json(toCompany(page, user, updatedAccess.isPremium, subscribers));
}

export async function DELETE(request) {
  const session = await getAuthenticatedUser();

  if (!session) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: session.id, key: "companyPage" } },
  });
  if (!setting) return NextResponse.json({ error: "Page entreprise introuvable" }, { status: 404 });

  let page;
  try { page = JSON.parse(setting.value); } catch { page = null; }
  const pageName = page?.name || "Mon entreprise";
  const body = await request.json().catch(() => ({}));
  if (body.confirmation !== pageName) {
    return NextResponse.json({ error: `Saisissez exactement « ${pageName} » pour confirmer.` }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.post.updateMany({
      where: { companyPageId: session.id },
      data: { companyPageId: null },
    }),
    prisma.userSetting.delete({ where: { id: setting.id } }),
  ]);
  return NextResponse.json({ deleted: true });
}
