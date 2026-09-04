import crypto from "node:crypto";
import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const INVITATIONS_KEY = "companyPageInvitations";
const FOLLOWED_PAGES_KEY = "followedCompanyPages";
const DIRECTORY_KEY = "companyDirectorySettings";
const CAMPAIGN_PREFIX = "sponsoredCampaign:";
const DEFAULT_DIRECTORY = {
  showSuggestions: true,
  compactCards: false,
  emailNotifications: true,
};
const json = (value, fallback) => {
  try {
    const parsed = JSON.parse(value || "");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
};
const array = (value) => {
  const parsed = json(value, []);
  return Array.isArray(parsed) ? parsed : [];
};
const setting = (userId, key) =>
  prisma.userSetting.findUnique({ where: { userId_key: { userId, key } } });
const auth = async (request, reply) => {
  const userId = await getSessionUserId(request);
  if (!userId) {
    reply.code(401).send({ error: "Non authentifié" });
    return null;
  }
  return userId;
};
const pageFor = async (userId) => {
  const row = await setting(userId, "companyPage");
  return row ? json(row.value, null) : null;
};
const campaignFrom = (row) => {
  const value = json(row?.value, null);
  return value && typeof value === "object"
    ? { ...value, storageId: row.id }
    : null;
};
const campaignSchedule = (budget, daily) => {
  const durationDays = Math.max(1, Math.ceil(budget / daily));
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + durationDays - 1);
  const format = (date) => date.toISOString().slice(0, 10);
  return { startDate: format(start), endDate: format(end), durationDays };
};
const cleanUrl = (value) => {
  if (!value) return null;
  try {
    const url = new URL(
      /^https?:\/\//i.test(String(value).trim())
        ? String(value).trim()
        : `https://${String(value).trim()}`,
    );
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
};
async function hasPremiumAccess(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      email: true,
      subscription: { select: { status: true, currentPeriodEnd: true } },
    },
  });
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  const isAdmin =
    user?.role === "admin" ||
    Boolean(adminEmail && user?.email?.toLowerCase() === adminEmail);
  const subscription = user?.subscription;
  return (
    isAdmin ||
    Boolean(
      subscription &&
      ["ACTIVE", "TRIALING"].includes(subscription.status) &&
      !(
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd <= new Date()
      ),
    )
  );
}

function parseFaq(value) {
  return array(value)
    .slice(0, 50)
    .map((item) => ({
      question: String(item.question || "")
        .trim()
        .slice(0, 300),
      answer: String(item.answer || "")
        .trim()
        .slice(0, 1000),
    }))
    .filter((item) => item.question && item.answer);
}
function parseMedia(value) {
  return array(value)
    .slice(0, 3)
    .filter(
      (item) => item?.url && ["image", "video", "document"].includes(item.type),
    );
}
function engagementKey(jobId) {
  return `jobEngagement:${jobId}`;
}
function emptyEngagement() {
  return { reactions: {}, comments: [], shares: 0, bookmarks: [] };
}
function updateCommentReaction(comments, id, userId, reaction) {
  return comments.map((comment) => {
    if (comment.id === id) {
      const reactions = Object.fromEntries(
        Object.entries(comment.reactions || {}).map(([key, ids]) => [
          key,
          Array.isArray(ids) ? ids : [],
        ]),
      );
      if (reactions[reaction]?.includes(userId))
        reactions[reaction] = reactions[reaction].filter(
          (item) => item !== userId,
        );
      else
        reactions[reaction] = [
          ...new Set([...(reactions[reaction] || []), userId]),
        ];
      return { ...comment, reactions };
    }
    return {
      ...comment,
      replies: updateCommentReaction(
        comment.replies || [],
        id,
        userId,
        reaction,
      ),
    };
  });
}
function appendReply(comments, parentId, reply) {
  return comments.map((comment) =>
    comment.id === parentId
      ? { ...comment, replies: [...(comment.replies || []), reply] }
      : {
          ...comment,
          replies: appendReply(comment.replies || [], parentId, reply),
        },
  );
}
function findComment(comments, id) {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const nested = findComment(comment.replies || [], id);
    if (nested) return nested;
  }
  return null;
}
async function readEngagement(ownerId, jobId) {
  const row = await setting(ownerId, engagementKey(jobId));
  const value = json(row?.value, {});
  return {
    ...emptyEngagement(),
    ...(value && typeof value === "object" ? value : {}),
  };
}
async function writeSetting(userId, key, value) {
  return prisma.userSetting.upsert({
    where: { userId_key: { userId, key } },
    create: { userId, key, value: JSON.stringify(value) },
    update: { value: JSON.stringify(value) },
  });
}

async function paypalToken() {
  const base =
    process.env.PAYPAL_MODE === "live"
      ? "https://api-m.paypal.com"
      : "https://api-m.sandbox.paypal.com";
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`,
  ).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(
      value.error_description || "Authentification PayPal impossible",
    );
  return { base, token: value.access_token };
}
function appendStripeParams(params, value, key) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      appendStripeParams(params, item, `${key}[${index}]`),
    );
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([childKey, childValue]) =>
      appendStripeParams(params, childValue, `${key}[${childKey}]`),
    );
    return;
  }
  if (value !== undefined && value !== null) params.append(key, String(value));
}

function stripeParams(body) {
  const params = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) =>
    appendStripeParams(params, value, key),
  );
  return params;
}

async function stripeRequest(path, body = {}, method = "POST") {
  if (!process.env.STRIPE_SECRET_KEY)
    throw new Error("Stripe n'est pas configuré sur ce serveur.");
  const requestBody =
    path === "checkout/sessions"
      ? {
          payment_method_types: ["card"],
          managed_payments: { enabled: false },
          ...body,
        }
      : body;
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(method === "POST"
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    ...(method === "POST" ? { body: stripeParams(requestBody) } : {}),
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(value.error?.message || "Requête Stripe refusée");
  return value;
}

export async function registerCompanyFeatureRoutes(app) {
  app.addHook("preHandler", async (request, reply) => {
    if (
      request.method !== "POST" ||
      request.routeOptions?.url !== "/v1/company/campaigns"
    )
      return;
    const userId = await getSessionUserId(request);
    if (!userId || !(await hasPremiumAccess(userId)))
      return reply
        .code(403)
        .send({
          error:
            "La création de campagnes sponsorisées est réservée aux Pages Entreprise Premium.",
        });
  });

  app.get("/v1/company/invitations", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    return reply.send({
      invitations: array(
        (await setting(userId, INVITATIONS_KEY))?.value,
      ).filter((item) => item?.status === "pending"),
    });
  });
  app.post("/v1/company/invitations", async (request, reply) => {
    const senderId = await auth(request, reply);
    if (!senderId) return;
    const targetUserId = String(request.body?.targetUserId || "").trim();
    if (!targetUserId || targetUserId === senderId)
      return reply.code(400).send({ error: "Destinataire invalide" });
    const [sender, target, page] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: { name: true, image: true },
      }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      }),
      pageFor(senderId),
    ]);
    if (!target)
      return reply.code(404).send({ error: "Utilisateur introuvable" });
    if (!page)
      return reply
        .code(400)
        .send({ error: "Aucune page entreprise à partager" });
    const existing = array(
      (await setting(targetUserId, INVITATIONS_KEY))?.value,
    );
    if (
      existing.some(
        (item) => item.pageId === senderId && item.status === "pending",
      )
    )
      return reply
        .code(409)
        .send({ error: "Une invitation est déjà en attente" });
    const invitation = {
      id: crypto.randomUUID(),
      pageId: senderId,
      pageName: page.name || "Page entreprise",
      pageImage: page.logoUrl || page.avatarUrl || null,
      inviterId: senderId,
      inviterName: sender?.name || "Une entreprise",
      inviterImage: sender?.image || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await writeSetting(targetUserId, INVITATIONS_KEY, [
      invitation,
      ...existing.filter(
        (item) => item?.pageId !== senderId || item.status !== "pending",
      ),
    ]);
    return reply.code(201).send({ ok: true, invitation });
  });
  app.patch("/v1/company/invitations", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const id = String(request.body?.id || "");
    const action = String(request.body?.action || "");
    if (!id || !["accept", "decline"].includes(action))
      return reply.code(400).send({ error: "Action invalide" });
    const invitations = array((await setting(userId, INVITATIONS_KEY))?.value);
    const invitation = invitations.find(
      (item) => item.id === id && item.status === "pending",
    );
    if (!invitation)
      return reply.code(404).send({ error: "Invitation introuvable" });
    await writeSetting(
      userId,
      INVITATIONS_KEY,
      invitations.filter((item) => item.id !== id),
    );
    if (action === "accept") {
      const followed = array(
        (await setting(userId, FOLLOWED_PAGES_KEY))?.value,
      );
      await writeSetting(
        userId,
        FOLLOWED_PAGES_KEY,
        followed.includes(invitation.pageId)
          ? followed
          : [...followed, invitation.pageId],
      );
    }
    return reply.send({ ok: true, accepted: action === "accept", invitation });
  });

  app.get("/v1/company/directory-settings", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    return reply.send({
      settings: {
        ...DEFAULT_DIRECTORY,
        ...json((await setting(userId, DIRECTORY_KEY))?.value, {}),
      },
    });
  });
  app.patch("/v1/company/directory-settings", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const body = request.body || {};
    const settings = {
      showSuggestions: Boolean(body.showSuggestions),
      compactCards: Boolean(body.compactCards),
      emailNotifications: Boolean(body.emailNotifications),
    };
    await writeSetting(userId, DIRECTORY_KEY, settings);
    return reply.send({ ok: true, settings });
  });

  app.get("/v1/company/statistics", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const row = await setting(userId, "companyPage");
    const page = json(row?.value, {});
    const followRows = await prisma.userSetting.findMany({
      where: { key: FOLLOWED_PAGES_KEY },
      select: { value: true },
    });
    const followers = followRows.filter((item) =>
      array(item.value).some((id) => String(id) === String(userId)),
    ).length;
    const posts = await prisma.post.count({
      where: { companyPageId: userId, status: "published" },
    });
    return reply.send({
      stats: {
        pages: row ? 1 : 0,
        managedPages: row ? 1 : 0,
        followers,
        posts,
        jobs: Array.isArray(page.jobs) ? page.jobs.length : 0,
        category: page.industry || page.category || "Non renseigné",
        pageName: page.name || page.displayName || "Ma page",
        updatedAt: row?.updatedAt?.toISOString() || null,
      },
    });
  });

  app.get("/v1/company/auto-reply", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    if (!(await pageFor(userId)))
      return reply.code(404).send({ error: "Page entreprise introuvable." });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        autoReplyEnabled: true,
        autoReplyTone: true,
        autoReplyDefaultMessage: true,
        autoReplyFaq: true,
        autoReplyMedia: true,
        autoReplyRules: {
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        },
      },
    });
    return reply.send({
      ...user,
      faq: parseFaq(user?.autoReplyFaq),
      media: parseMedia(user?.autoReplyMedia),
    });
  });
  app.put("/v1/company/auto-reply", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    if (!(await pageFor(userId)))
      return reply.code(404).send({ error: "Page entreprise introuvable." });
    const body = request.body || {};
    const rules = Array.isArray(body.rules)
      ? body.rules
          .slice(0, 14)
          .map((rule) => ({
            dayOfWeek: Math.max(0, Math.min(6, Number(rule.dayOfWeek))),
            startTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.startTime)
              ? rule.startTime
              : "00:00",
            endTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(rule.endTime)
              ? rule.endTime
              : "23:59",
            enabled: rule.enabled !== false,
          }))
      : [];
    const data = {
      autoReplyEnabled: Boolean(body.autoReplyEnabled),
      autoReplyTone: ["formal", "friendly"].includes(body.autoReplyTone)
        ? body.autoReplyTone
        : "friendly",
      autoReplyDefaultMessage:
        String(body.autoReplyDefaultMessage || "")
          .trim()
          .slice(0, 1000) || null,
      autoReplyFaq: JSON.stringify(parseFaq(JSON.stringify(body.faq))),
      autoReplyMedia: JSON.stringify(parseMedia(JSON.stringify(body.media))),
    };
    const user = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data });
      await tx.autoReplyRule.deleteMany({ where: { userId } });
      if (rules.length)
        await tx.autoReplyRule.createMany({
          data: rules.map((rule) => ({ ...rule, userId })),
        });
      return tx.user.findUnique({
        where: { id: userId },
        select: {
          autoReplyEnabled: true,
          autoReplyTone: true,
          autoReplyDefaultMessage: true,
          autoReplyFaq: true,
          autoReplyMedia: true,
          autoReplyRules: {
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
          },
        },
      });
    });
    return reply.send({
      ...user,
      faq: parseFaq(user.autoReplyFaq),
      media: parseMedia(user.autoReplyMedia),
    });
  });

  app.get("/v1/company/jobs/engagement", async (request, reply) => {
    const ownerId = String(request.query?.ownerId || "");
    const jobId = String(request.query?.jobId || "");
    if (!ownerId || !jobId)
      return reply.code(400).send({ error: "Offre invalide" });
    return reply.send(await readEngagement(ownerId, jobId));
  });
  app.post("/v1/company/jobs/engagement", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const body = request.body || {};
    const ownerId = String(body.ownerId || "");
    const jobId = String(body.jobId || "");
    if (!ownerId || !jobId)
      return reply.code(400).send({ error: "Offre invalide" });
    const page = await pageFor(ownerId);
    if (
      !page ||
      !(
        Array.isArray(page.jobs) &&
        page.jobs.some((job) => String(job.id) === jobId)
      )
    )
      return reply.code(404).send({ error: "Offre introuvable" });
    const next = await readEngagement(ownerId, jobId);
    const reaction = String(body.reaction || "ok");
    if (body.action === "reaction") {
      const reactions = Object.fromEntries(
        Object.entries(next.reactions).map(([key, ids]) => [
          key,
          Array.isArray(ids) ? ids : [],
        ]),
      );
      const current = Object.keys(reactions).find((key) =>
        reactions[key].includes(userId),
      );
      if (current)
        reactions[current] = reactions[current].filter((id) => id !== userId);
      if (current !== reaction)
        reactions[reaction] = [
          ...new Set([...(reactions[reaction] || []), userId]),
        ];
      next.reactions = reactions;
    } else if (body.action === "comment" && String(body.text || "").trim()) {
      const profile = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, image: true },
      });
      next.comments = [
        ...next.comments,
        {
          id: `${userId}-${Date.now()}`,
          authorId: userId,
          author: profile?.name || "Utilisateur",
          avatarUrl: profile?.image || null,
          text: String(body.text).trim().slice(0, 2000),
          time: new Date().toISOString(),
          replies: [],
        },
      ];
    } else if (body.action === "commentReaction" && body.commentId)
      next.comments = updateCommentReaction(
        next.comments,
        body.commentId,
        userId,
        reaction,
      );
    else if (
      body.action === "commentReply" &&
      body.parentCommentId &&
      String(body.text || "").trim()
    )
      next.comments = appendReply(next.comments, body.parentCommentId, {
        id: `${userId}-${Date.now()}`,
        authorId: userId,
        text: String(body.text).trim().slice(0, 2000),
        time: new Date().toISOString(),
        replies: [],
      });
    else if (body.action === "share") next.shares += 1;
    else if (body.action === "bookmark")
      next.bookmarks = next.bookmarks.includes(userId)
        ? next.bookmarks.filter((id) => id !== userId)
        : [...next.bookmarks, userId];
    await writeSetting(ownerId, engagementKey(jobId), next);
    const comment = body.commentId
      ? findComment(next.comments, body.commentId)
      : null;
    return reply.send(
      comment
        ? {
            ...next,
            reaction:
              Object.entries(comment.reactions || {}).find(([, ids]) =>
                ids.includes(userId),
              )?.[0] || null,
          }
        : next,
    );
  });

  app.get("/v1/company/campaigns", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const rows = await prisma.userSetting.findMany({
      where: { userId, key: { startsWith: CAMPAIGN_PREFIX } },
      orderBy: { createdAt: "desc" },
    });
    return reply.send({
      campaigns: rows.map(campaignFrom).filter(Boolean),
      currency: process.env.AD_CURRENCY || "eur",
    });
  });
  app.post("/v1/company/campaigns", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const body = request.body || {};
    if (!(await pageFor(userId)))
      return reply.code(404).send({ error: "Page entreprise introuvable" });
    const budget = Number(body.budget);
    const dailyBudget = Number(body.dailyBudget);
    const ageMin = Number(body.ageMin);
    const ageMax = Number(body.ageMax);
    const postId = String(body.postId || "");
    const description = String(body.description || body.text || "").trim();
    if (
      !body.objective ||
      !Number.isFinite(budget) ||
      budget < 5 ||
      !Number.isFinite(dailyBudget) ||
      dailyBudget < 1 ||
      dailyBudget > budget ||
      ageMin < 13 ||
      ageMax > 65 ||
      ageMin > ageMax ||
      !description ||
      description.length > 3000 ||
      !postId
    )
      return reply
        .code(400)
        .send({ error: "Informations de campagne invalides" });
    const post = await prisma.post.findFirst({
      where: {
        id: postId,
        authorId: userId,
        companyPageId: userId,
        isSponsored: true,
        campaignId: null,
      },
      select: { id: true },
    });
    if (!post)
      return reply
        .code(404)
        .send({ error: "Publicité introuvable ou déjà liée à une campagne" });
    const website = cleanUrl(body.website);
    if (body.website && !website)
      return reply.code(400).send({ error: "Le lien externe est invalide" });
    const id = `${CAMPAIGN_PREFIX}${crypto.randomUUID()}`;
    const schedule = campaignSchedule(budget, dailyBudget);
    const campaign = {
      id,
      pageId: userId,
      postId,
      objective: String(body.objective),
      title: String(body.title || "Campagne sans titre")
        .trim()
        .slice(0, 120),
      website,
      whatsapp: String(body.whatsapp || "").replace(/\D/g, "") || null,
      ageMin,
      ageMax,
      gender: String(body.gender || "Tous"),
      location: String(body.location || "").trim(),
      interests: String(body.interests || "").trim(),
      budget,
      dailyBudget,
      budgetMode: "total",
      totalBudget: budget,
      format: ["post", "sidebar", "story"].includes(body.format)
        ? body.format
        : "post",
      contentType: ["image", "video", "text"].includes(body.contentType)
        ? body.contentType
        : "text",
      paymentMethod: ["stripe", "paypal", "mobile_money"].includes(
        body.paymentMethod,
      )
        ? body.paymentMethod
        : "stripe",
      currency: String(process.env.AD_CURRENCY || "eur").toLowerCase(),
      description,
      cta: ["En savoir plus", "Acheter", "Visiter"].includes(body.cta)
        ? body.cta
        : "En savoir plus",
      paymentStatus: "PENDING",
      analytics: { impressions: 0, clicks: 0, conversions: 0, spent: 0 },
      ...schedule,
      status: "PENDING",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await prisma.$transaction([
      prisma.userSetting.create({
        data: { userId, key: id, value: JSON.stringify(campaign) },
      }),
      prisma.post.update({ where: { id: postId }, data: { campaignId: id } }),
    ]);
    return reply.code(201).send({ campaign });
  });
  app.patch("/v1/company/campaigns", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const row = await prisma.userSetting.findFirst({
      where: {
        id: request.body?.id,
        userId,
        key: { startsWith: CAMPAIGN_PREFIX },
      },
    });
    const campaign = campaignFrom(row);
    const status = String(request.body?.status || "").toUpperCase();
    if (!campaign)
      return reply.code(404).send({ error: "Campagne introuvable" });
    if (!["PAUSED", "APPROVED", "PENDING"].includes(status))
      return reply.code(400).send({ error: "Statut invalide" });
    campaign.status = status;
    campaign.updatedAt = new Date().toISOString();
    await prisma.userSetting.update({
      where: { id: row.id },
      data: { value: JSON.stringify(campaign) },
    });
    return reply.send({ campaign });
  });

  app.post("/v1/company/campaigns/checkout", async (request, reply) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const row = await prisma.userSetting.findFirst({
      where: {
        id: request.body?.id,
        userId,
        key: { startsWith: CAMPAIGN_PREFIX },
      },
    });
    const campaign = campaignFrom(row);
    if (!campaign)
      return reply.code(404).send({ error: "Campagne introuvable" });
    const backendOrigin =
      process.env.BACKEND_PUBLIC_URL || "http://localhost:4001";
    const frontendOrigin =
      process.env.FRONTEND_ORIGIN || "http://localhost:3000";
    try {
      if (campaign.paymentMethod === "paypal") {
        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET)
          return reply
            .code(503)
            .send({ error: "PayPal n'est pas configuré sur ce serveur." });
        const { base, token } = await paypalToken();
        const response = await fetch(`${base}/v2/checkout/orders`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                reference_id: campaign.id,
                amount: {
                  currency_code: campaign.currency.toUpperCase(),
                  value: Number(campaign.budget).toFixed(2),
                },
                description: campaign.title,
              },
            ],
            application_context: {
              return_url: `${backendOrigin}/v1/company/campaigns/paypal/return?campaign_id=${encodeURIComponent(campaign.id)}`,
              cancel_url: `${frontendOrigin}/feed?campaign_payment=cancelled`,
            },
          }),
        });
        const value = await response.json();
        if (!response.ok)
          throw new Error(
            value.message || "Impossible de créer la commande PayPal",
          );
        campaign.providerOrderId = value.id;
        campaign.paymentStatus = "CHECKOUT_CREATED";
        await prisma.userSetting.update({
          where: { id: row.id },
          data: { value: JSON.stringify(campaign) },
        });
        return reply.send({
          url: value.links?.find((link) => link.rel === "approve")?.href,
          orderId: value.id,
          campaign,
        });
      }
      if (campaign.paymentMethod === "mobile_money")
        return reply
          .code(503)
          .send({
            error:
              "Aucun fournisseur mobile money n'est configuré sur ce serveur.",
          });
      const session = await stripeRequest("checkout/sessions", {
        mode: "payment",
        success_url: `${backendOrigin}/v1/company/campaigns/stripe/return?campaign_id=${encodeURIComponent(campaign.id)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendOrigin}/feed?campaign_payment=cancelled&campaign_id=${encodeURIComponent(campaign.id)}`,
        "line_items[0][price_data][currency]": campaign.currency,
        "line_items[0][price_data][unit_amount]": String(
          Math.round(campaign.budget * 100),
        ),
        "line_items[0][price_data][product_data][name]": campaign.title,
        "line_items[0][quantity]": "1",
        "metadata[userId]": userId,
        "metadata[campaignId]": campaign.id,
      });
      campaign.providerSessionId = session.id;
      campaign.paymentStatus = "CHECKOUT_CREATED";
      await prisma.userSetting.update({
        where: { id: row.id },
        data: { value: JSON.stringify(campaign) },
      });
      return reply.send({ url: session.url, sessionId: session.id, campaign });
    } catch (error) {
      return reply
        .code(502)
        .send({ error: error.message || "Impossible de créer le paiement" });
    }
  });

  const markPaid = async (request, reply, provider) => {
    const userId = await auth(request, reply);
    if (!userId) return;
    const campaignId = String(request.query?.campaign_id || "");
    const row = await prisma.userSetting.findFirst({
      where: { userId, key: campaignId },
    });
    const campaign = campaignFrom(row);
    if (!campaign)
      return reply.code(404).send({ error: "Campagne introuvable" });
    try {
      if (provider === "stripe") {
        const sessionId = String(request.query?.session_id || "");
        if (!sessionId || !process.env.STRIPE_SECRET_KEY)
          return reply.code(400).send({ error: "Retour Stripe invalide" });
        const session = await stripeRequest(
          `checkout/sessions/${encodeURIComponent(sessionId)}`,
          {},
        );
        if (
          session.metadata?.campaignId !== campaignId ||
          session.metadata?.userId !== userId ||
          session.payment_status !== "paid"
        )
          return reply
            .code(400)
            .send({ error: "Paiement Stripe non confirmé" });
      } else {
        const orderId = String(
          request.query?.token || campaign.providerOrderId || "",
        );
        if (
          !orderId ||
          !process.env.PAYPAL_CLIENT_ID ||
          !process.env.PAYPAL_CLIENT_SECRET
        )
          return reply.code(400).send({ error: "Retour PayPal invalide" });
        const { base, token } = await paypalToken();
        const response = await fetch(
          `${base}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );
        const value = await response.json();
        if (!response.ok || !["COMPLETED", "COMPLETED"].includes(value.status))
          return reply.code(400).send({ error: "Capture PayPal refusée" });
      }
      campaign.paymentStatus = "PAID";
      campaign.status = "APPROVED";
      campaign.updatedAt = new Date().toISOString();
      await prisma.userSetting.update({
        where: { id: row.id },
        data: { value: JSON.stringify(campaign) },
      });
      const success =
        process.env.AD_PAYMENT_SUCCESS_URL ||
        `${origin}/feed?campaign_payment=success`;
      return reply.redirect(
        `${success}${success.includes("?") ? "&" : "?"}campaign_id=${encodeURIComponent(campaignId)}`,
      );
    } catch (error) {
      return reply
        .code(502)
        .send({ error: error.message || "Validation du paiement impossible" });
    }
  };
  app.get("/v1/company/campaigns/stripe/return", (request, reply) =>
    markPaid(request, reply, "stripe"),
  );
  app.get("/v1/company/campaigns/paypal/return", (request, reply) =>
    markPaid(request, reply, "paypal"),
  );
}
