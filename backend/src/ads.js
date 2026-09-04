import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const PREFIX = "sponsoredCampaign:";
function parse(value) { try { return JSON.parse(value); } catch { return null; } }
function active(value) { const campaign = parse(value); return Boolean(campaign && campaign.status === "APPROVED"); }
function initials(name = "") { return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "L"; }

export async function registerAdRoutes(app) {
  app.get("/v1/ads", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifie" });
    const settings = await prisma.userSetting.findMany({ where: { key: { startsWith: PREFIX } }, select: { id: true, value: true } });
    const campaigns = settings.map((row) => ({ ...parse(row.value), storageId: row.id })).filter((campaign) => active(JSON.stringify(campaign)));
    const ids = campaigns.flatMap((campaign) => [campaign.id, campaign.storageId]).filter(Boolean); if (!ids.length) return reply.send({ ads: [] });
    const byId = new Map(campaigns.flatMap((campaign) => [[campaign.id, campaign], [campaign.storageId, campaign], ...(campaign.postId ? [[campaign.postId, campaign]] : [])]));
    const ads = await prisma.post.findMany({ where: { status: "published", campaignId: { in: ids } }, orderBy: { createdAt: "desc" }, take: 3, select: { id: true, author: { select: { id: true, name: true, image: true, role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true } } } }, headline: true, excerpt: true, text: true, mediaUrl: true, mediaType: true, isSponsored: true, campaignId: true, companyPageId: true, createdAt: true } });
    const pageSettings = await prisma.userSetting.findMany({ where: { userId: { in: ads.map((ad) => ad.companyPageId || ad.author.id) }, key: "companyPage" }, select: { userId: true, value: true } });
    const pages = new Map(pageSettings.map((row) => [row.userId, parse(row.value) || {}]));
    return reply.send({ ads: ads.map((ad) => { const campaign = byId.get(ad.campaignId) || {}; const ownerId = ad.author.id; const pageId = ad.companyPageId || ownerId; const page = pages.get(pageId) || {}; const author = page.name || ad.author.name || "Partenaire LynoraLink"; const image = page.logoUrl || page.avatarUrl || ad.author.image || null; const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase(); const isPlatformAdmin = ad.author.role === "admin" || Boolean(adminEmail && ad.author.email?.toLowerCase() === adminEmail); const isPremium = Boolean(ad.author.subscription && ["ACTIVE", "TRIALING"].includes(ad.author.subscription.status) && !(ad.author.subscription.currentPeriodEnd && ad.author.subscription.currentPeriodEnd <= new Date())); return { id: ad.id, title: campaign.title || (ad.headline && ad.headline !== ad.excerpt && ad.headline !== ad.text ? ad.headline : "Publicite sponsorisee"), description: campaign.description || ad.excerpt || ad.text || "Decouvrez cette offre proposee par notre partenaire.", author, authorId: ownerId, ownerId, pageId, initials: initials(author), image, mediaUrl: ad.mediaUrl || null, mediaType: ad.mediaType || null, isSponsored: true, isPremium, isPlatformAdmin, campaignId: ad.campaignId, objective: campaign.objective || null, format: campaign.format || "post", cta: campaign.cta || "En savoir plus", website: campaign.website || null, whatsapp: campaign.whatsapp || null, createdAt: ad.createdAt }; }) });
  });

  app.post("/v1/ads", async (request, reply) => {
    const userId = await getSessionUserId(request); if (!userId) return reply.code(401).send({ error: "Non authentifie" });
    const event = ["impression", "click", "conversion"].includes(request.body?.event) ? request.body.event : null;
    const campaignId = request.body?.campaignId;
    if (!event || !campaignId) return reply.code(400).send({ error: "Evenement invalide" });
    const row = await prisma.userSetting.findFirst({ where: { key: campaignId } });
    if (!row || !row.key.startsWith(PREFIX)) return reply.code(404).send({ error: "Campagne introuvable" });
    const campaign = parse(row.value); if (!campaign) return reply.code(422).send({ error: "Campagne invalide" });
    const analytics = campaign.analytics || { impressions: 0, clicks: 0, conversions: 0, spent: 0 };
    const field = `${event}s`; analytics[field] = Number(analytics[field] || 0) + 1;
    campaign.analytics = analytics; campaign.updatedAt = new Date().toISOString();
    await prisma.userSetting.update({ where: { id: row.id }, data: { value: JSON.stringify(campaign) } });
    return reply.send({ analytics });
  });
}