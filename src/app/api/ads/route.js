import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";

const CAMPAIGN_PREFIX = "sponsoredCampaign:";

function isActiveCampaign(value) {
  try {
    const campaign = JSON.parse(value);
    return campaign.status === "APPROVED";
  } catch {
    return false;
  }
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("") || "L";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const campaignSettings = await prisma.userSetting.findMany({
    where: { key: { startsWith: CAMPAIGN_PREFIX } },
    select: { id: true, value: true },
  });
  const activeCampaigns = campaignSettings
    .map((setting) => {
      try { return { storageId: setting.id, ...JSON.parse(setting.value) }; } catch { return null; }
    })
    .filter((campaign) => campaign && isActiveCampaign(JSON.stringify(campaign)));
  const activeCampaignIds = activeCampaigns.flatMap((campaign) => [campaign.id, campaign.storageId]).filter(Boolean);
  const campaignsById = new Map(activeCampaigns.flatMap((campaign) => [[campaign.id, campaign], [campaign.storageId, campaign], ...(campaign.postId ? [[campaign.postId, campaign]] : [])]));
  if (!activeCampaignIds.length) return NextResponse.json({ ads: [] });

  const ads = await prisma.post.findMany({
    where: { status: "published", campaignId: { in: activeCampaignIds } },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      author: { select: { id: true, name: true, image: true, role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true } } } },
      headline: true,
      excerpt: true,
      text: true,
      mediaUrl: true,
      mediaType: true,
      isSponsored: true,
      campaignId: true,
      createdAt: true,
    },
  });
  const pageSettings = await prisma.userSetting.findMany({
    where: { userId: { in: ads.map((ad) => ad.author.id) }, key: "companyPage" },
    select: { userId: true, value: true },
  });
  const pagesByOwnerId = new Map();
  pageSettings.forEach((setting) => {
    try {
      const page = JSON.parse(setting.value);
      if (page && typeof page === "object") pagesByOwnerId.set(setting.userId, page);
    } catch {}
  });

  return NextResponse.json({
    ads: ads.map((ad) => {
      const page = pagesByOwnerId.get(ad.author.id);
      const pageName = page?.name || ad.author.name || "Partenaire LynoraLink";
      const pageImage = page?.logoUrl || page?.avatarUrl || ad.author.image || null;
      return {
        id: ad.id,
        title: campaignsById.get(ad.campaignId)?.title || (ad.headline && ad.headline !== ad.excerpt && ad.headline !== ad.text ? ad.headline : "Publicité sponsorisée"),
        description: campaignsById.get(ad.campaignId)?.description || ad.excerpt || ad.text || "Découvrez cette offre proposée par notre partenaire.",
        author: pageName,
        authorId: ad.author.id,
        ownerId: ad.author.id,
        pageId: page ? ad.author.id : null,
        initials: initials(pageName),
        image: pageImage,
        mediaUrl: ad.mediaUrl || null,
        mediaType: ad.mediaType || null,
        isSponsored: ad.isSponsored,
        campaignId: ad.campaignId,
        objective: campaignsById.get(ad.campaignId)?.objective || null,
        format: campaignsById.get(ad.campaignId)?.format || "post",
        cta: campaignsById.get(ad.campaignId)?.cta || "En savoir plus",
        website: campaignsById.get(ad.campaignId)?.website || null,
        whatsapp: campaignsById.get(ad.campaignId)?.whatsapp || null,
        isPremium: hasActiveSubscription(ad.author.subscription),
        isPlatformAdmin: ad.author.role === "admin" || Boolean(process.env.NEXT_PUBLIC_ADMIN_EMAIL && ad.author.email?.toLowerCase() === process.env.NEXT_PUBLIC_ADMIN_EMAIL.toLowerCase()),
        createdAt: ad.createdAt,
      };
    }),
  });
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const event = ["impression", "click", "conversion"].includes(body.event) ? body.event : null;
  if (!event || !body.campaignId) return NextResponse.json({ error: "Evenement invalide" }, { status: 400 });
  const setting = await prisma.userSetting.findFirst({ where: { key: body.campaignId } });
  if (!setting || !setting.key.startsWith(CAMPAIGN_PREFIX)) return NextResponse.json({ error: "Campagne introuvable" }, { status: 404 });
  let campaign;
  try { campaign = JSON.parse(setting.value); } catch { return NextResponse.json({ error: "Campagne invalide" }, { status: 422 }); }
  const analytics = campaign.analytics || { impressions: 0, clicks: 0, conversions: 0, spent: 0 };
  const field = `${event}s`;
  analytics[field] = Number(analytics[field] || 0) + 1;
  campaign.analytics = analytics;
  campaign.updatedAt = new Date().toISOString();
  await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(campaign) } });
  return NextResponse.json({ analytics });
}
