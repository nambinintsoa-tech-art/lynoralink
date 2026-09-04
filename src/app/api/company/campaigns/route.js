import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionAccess } from "@/lib/subscription";
import { getCampaignSchedule } from "@/lib/campaignSchedule";

const CAMPAIGN_PREFIX = "sponsoredCampaign:";

function normalizeWebsite(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function normalizeWhatsapp(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

async function getUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id || null;
}

function parseSetting(setting) {
  try {
    const campaign = JSON.parse(setting.value);
    return campaign && typeof campaign === "object" ? { ...campaign, storageId: setting.id } : null;
  } catch { return null; }
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const settings = await prisma.userSetting.findMany({
    where: { userId, key: { startsWith: CAMPAIGN_PREFIX } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ campaigns: settings.map(parseSetting).filter(Boolean), currency: process.env.AD_CURRENCY || "eur" });
}

export async function POST(request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });

  const access = await getSubscriptionAccess(userId);
  if (!access.isPremium) return NextResponse.json({ error: "La création de campagnes sponsorisées est réservée aux Pages Entreprise Premium." }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const page = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: "companyPage" } },
  });
  if (!page) return NextResponse.json({ error: "Page entreprise introuvable" }, { status: 404 });

  const budget = Number(body.budget);
  const dailyBudget = Number(body.dailyBudget);
  const ageMin = Number(body.ageMin);
  const ageMax = Number(body.ageMax);
  const postId = String(body.postId || "").trim();
  const description = String(body.description || body.text || "").trim();
  const cta = ["En savoir plus", "Acheter", "Visiter"].includes(body.cta) ? body.cta : "En savoir plus";
  const paymentMethod = ["stripe", "paypal", "mobile_money"].includes(body.paymentMethod) ? body.paymentMethod : "stripe";
  if (!body.objective || !Number.isFinite(budget) || budget < 5 || !Number.isFinite(dailyBudget) || dailyBudget < 1 || dailyBudget > budget || !Number.isFinite(ageMin) || !Number.isFinite(ageMax) || ageMin < 13 || ageMax > 65 || ageMin > ageMax || !description || description.length > 3000) {
    return NextResponse.json({ error: "Informations de campagne invalides" }, { status: 400 });
  }
  const schedule = getCampaignSchedule(budget, dailyBudget);
  if (!postId) return NextResponse.json({ error: "La publicité doit contenir un post" }, { status: 400 });

  const website = normalizeWebsite(body.website);
  if (body.website && !website) return NextResponse.json({ error: "Le lien externe est invalide" }, { status: 400 });
  const whatsapp = normalizeWhatsapp(body.whatsapp);
  if (body.whatsapp && !whatsapp) return NextResponse.json({ error: "Le numéro WhatsApp est invalide" }, { status: 400 });

  const post = await prisma.post.findFirst({
    where: { id: postId, authorId: userId, companyPageId: userId, isSponsored: true, campaignId: null },
    select: { id: true },
  });
  if (!post) return NextResponse.json({ error: "Publicité introuvable ou déjà liée à une campagne" }, { status: 404 });

  const id = `${CAMPAIGN_PREFIX}${crypto.randomUUID()}`;
  const budgetMode = body.budgetMode === "total" ? "total" : "daily";
  const campaign = {
    id,
    pageId: userId,
    postId: post.id,
    objective: String(body.objective),
    title: String(body.title || "Campagne sans titre").trim().slice(0, 120),
    website,
    whatsapp,
    ageMin,
    ageMax,
    gender: String(body.gender || "Tous"),
    location: String(body.location || "").trim(),
    interests: String(body.interests || "").trim(),
    budget,
    dailyBudget,
    budgetMode: "total",
    totalBudget: budgetMode === "total" ? budget : null,
    format: ["post", "sidebar", "story"].includes(body.format) ? body.format : "post",
    contentType: ["image", "video", "text"].includes(body.contentType) ? body.contentType : "text",
    paymentMethod,
    currency: String(process.env.AD_CURRENCY || "eur").toLowerCase(),
    description,
    cta,
    paymentStatus: "PENDING",
    analytics: { impressions: 0, clicks: 0, conversions: 0, spent: 0 },
    startDate: schedule.startDate,
    endDate: schedule.endDate,
    durationDays: schedule.durationDays,
    status: "PENDING",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await prisma.$transaction([
    prisma.userSetting.create({ data: { userId, key: id, value: JSON.stringify(campaign) } }),
    prisma.post.update({ where: { id: post.id }, data: { campaignId: id } }),
  ]);
  return NextResponse.json({ campaign }, { status: 201 });
}

export async function PATCH(request) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const setting = await prisma.userSetting.findFirst({ where: { id: body.id, userId, key: { startsWith: CAMPAIGN_PREFIX } } });
  if (!setting) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  const campaign = parseSetting(setting);
  const status = String(body.status || "").toUpperCase();
  if (!campaign || !["PAUSED", "APPROVED", "PENDING"].includes(status)) return NextResponse.json({ error: "Statut invalide" }, { status: 400 });
  campaign.status = status;
  campaign.updatedAt = new Date().toISOString();
  await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
  return NextResponse.json({ campaign });
}
