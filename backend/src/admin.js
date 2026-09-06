import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const USER_STATUSES = ["active", "suspended", "banned", "deleted"];
const POST_STATUSES = ["published", "pending_review", "rejected"];
const CAMPAIGN_PREFIX = "sponsoredCampaign:";
const PLATFORM_SETTING_KEYS = ["maintenanceMode", "allowRegistration", "requireEmailVerification", "maxPostsPerDay", "maxGroupMembers", "autoApprovePosts", "enableArticles", "enableGroups", "enableMessages", "enablePages", "contentFilterLevel", "defaultGroupPrivacy", "allowedFileTypes", "maxFileSize"];
const DEFAULT_PLATFORM_SETTINGS = { maintenanceMode: false, allowRegistration: true, requireEmailVerification: true, maxPostsPerDay: 10, maxGroupMembers: 50000, autoApprovePosts: true, enableArticles: true, enableGroups: true, enableMessages: true, enablePages: true, contentFilterLevel: "medium", defaultGroupPrivacy: "public", allowedFileTypes: "jpg, png, gif, pdf, mp4", maxFileSize: 25 };

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "L";
}

function array(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function media(value, fallbackUrl, fallbackType) {
  const parsed = array(value);
  if (parsed.length) return parsed;
  return fallbackUrl ? [{ type: fallbackType || "image", url: fallbackUrl }] : [];
}

async function requireAdmin(request, reply) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    reply.code(401).send({ error: "Non authentifié" });
    return null;
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  const configuredAdminEmails = [process.env.ADMIN_EMAIL, process.env.NEXT_PUBLIC_ADMIN_EMAIL]
    .filter(Boolean)
    .map((email) => email.trim().toLowerCase());
  const isConfiguredAdmin = user?.email && configuredAdminEmails.includes(user.email.toLowerCase());
  if (user?.role !== "admin" && !isConfiguredAdmin) {
    reply.code(403).send({ error: "Accès réservé aux administrateurs" });
    return null;
  }
  return userId;
}

function userShape(user) {
  return {
    id: user.id, name: user.name || "Utilisateur", email: user.email, title: user.title || "Membre LynoraLink",
    initials: initials(user.name || ""), image: user.image || null, location: user.location || "", role: user.role,
    status: user.status, deletedAt: user.deletedAt?.toISOString?.() || null,
    joined: user.createdAt?.toISOString?.().split("T")[0] || "", lastActive: user.updatedAt?.toISOString?.().split("T")[0] || "",
    posts: user._count?.posts || 0, connections: 0,
  };
}

export async function registerAdminRoutes(app) {
  app.get("/v1/admin/users", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const users = await prisma.user.findMany({ where: { OR: [{ status: { not: "deleted" } }, { deletedAt: { gte: cutoff } }] }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, email: true, title: true, image: true, location: true, role: true, status: true, deletedAt: true, createdAt: true, updatedAt: true, _count: { select: { posts: true, comments: true } } } });
    return reply.send({ users: users.map(userShape) });
  });

  app.patch("/v1/admin/users", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id, role, status } = request.body || {};
    if (!id) return reply.code(400).send({ error: "id requis" });
    if (status !== undefined && !USER_STATUSES.includes(status)) return reply.code(400).send({ error: "statut invalide" });
    if (role !== undefined && !["user", "moderator", "admin"].includes(role)) return reply.code(400).send({ error: "rôle invalide" });
    const data = {};
    if (role !== undefined) data.role = role;
    if (status !== undefined) { data.status = status; if (status === "deleted") data.deletedAt = new Date(); }
    if (!Object.keys(data).length) return reply.code(400).send({ error: "aucune modification fournie" });
    try {
      const user = await prisma.user.update({ where: { id }, data, select: { id: true, name: true, email: true, role: true, status: true, deletedAt: true } });
      return reply.send({ ok: true, user });
    } catch (error) {
      if (error.code === "P2025") return reply.code(404).send({ error: "Utilisateur introuvable" });
      throw error;
    }
  });

  app.delete("/v1/admin/users", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id } = request.body || {};
    if (!id) return reply.code(400).send({ error: "id requis" });
    const existing = await prisma.user.findUnique({ where: { id }, select: { id: true, deletedAt: true } });
    if (!existing) return reply.code(404).send({ error: "Utilisateur introuvable" });
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (existing.deletedAt && existing.deletedAt <= cutoff) {
      await prisma.user.delete({ where: { id } });
      return reply.send({ ok: true, finalDelete: true });
    }
    await prisma.user.update({ where: { id }, data: { status: "deleted", deletedAt: new Date() } });
    return reply.send({ ok: true, softDelete: true });
  });

  app.get("/v1/admin/posts", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const posts = await prisma.post.findMany({ where: { status: { in: POST_STATUSES } }, orderBy: { createdAt: "desc" }, include: { author: { select: { name: true, title: true, image: true } }, likes: { select: { id: true } }, comments: { select: { id: true } } } });
    return reply.send({ posts: posts.map((post) => {
      const files = media(post.mediaData, post.mediaUrl, post.mediaType);
      return { id: post.id, author: post.author?.name || "Utilisateur", authorId: post.authorId, title: post.author?.title || "", initials: initials(post.author?.name || ""), avatarUrl: post.author?.image || null, time: post.createdAt, likes: post.likes.length, comments: post.comments.length, shares: 0, isArticle: post.isArticle, text: post.text || post.body || "", headline: post.headline || "", excerpt: post.excerpt || "", body: post.body || "", status: post.status, reported: post.reported, featured: post.featured, media: files.length > 1 ? files : files[0] || null, mediaUrl: files[0]?.url || null, mediaType: files[0]?.type || null, companyPage: null, group: null };
    }) });
  });

  app.patch("/v1/admin/posts", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id, status, reported, featured } = request.body || {};
    if (!id) return reply.code(400).send({ error: "id requis" });
    if (status !== undefined && !POST_STATUSES.includes(status)) return reply.code(400).send({ error: "statut invalide" });
    const data = {};
    if (status !== undefined) data.status = status;
    if (reported !== undefined) data.reported = Boolean(reported);
    if (featured !== undefined) data.featured = Boolean(featured);
    if (!Object.keys(data).length) return reply.code(400).send({ error: "aucune modification fournie" });
    try { return reply.send({ ok: true, post: await prisma.post.update({ where: { id }, data }) }); } catch (error) { if (error.code === "P2025") return reply.code(404).send({ error: "Publication introuvable" }); throw error; }
  });

  app.delete("/v1/admin/posts", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id } = request.body || {};
    if (!id) return reply.code(400).send({ error: "id requis" });
    try { await prisma.post.delete({ where: { id } }); return reply.send({ ok: true }); } catch (error) { if (error.code === "P2025") return reply.code(404).send({ error: "Publication introuvable" }); throw error; }
  });

  app.get("/v1/admin/groups", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const groups = await prisma.group.findMany({ orderBy: { createdAt: "desc" } });
    return reply.send({ groups: groups.map((group) => ({ id: group.id, name: group.name, initials: group.emoji || "🌐", coverUrl: group.coverUrl || null, coverGradient: group.coverGradient || null, category: group.category || "tech", privacy: group.privacy || "public", createdAt: group.createdAt?.toISOString?.().split("T")[0] || "", status: group.status, members: array(group.members).length, postsCount: array(group.posts).length, reportsCount: 0, ownerId: group.ownerId })) });
  });

  app.patch("/v1/admin/groups", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id, status } = request.body || {};
    if (!id) return reply.code(400).send({ error: "id requis" });
    if (status === undefined) return reply.code(400).send({ error: "aucune modification fournie" });
    if (status !== undefined && !["active", "suspended"].includes(status)) return reply.code(400).send({ error: "statut invalide" });
    try { return reply.send({ ok: true, group: await prisma.group.update({ where: { id }, data: { status } }) }); } catch (error) { if (error.code === "P2025") return reply.code(404).send({ error: "Groupe introuvable" }); throw error; }
  });

  app.delete("/v1/admin/groups", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id } = request.body || {};
    if (!id) return reply.code(400).send({ error: "id requis" });
    try { await prisma.group.delete({ where: { id } }); return reply.send({ ok: true }); } catch (error) { if (error.code === "P2025") return reply.code(404).send({ error: "Groupe introuvable" }); throw error; }
  });

  app.get("/v1/admin/pages", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const settings = await prisma.userSetting.findMany({ where: { key: "companyPage" }, orderBy: { updatedAt: "desc" } });
    const users = await prisma.user.findMany({ where: { id: { in: settings.map((setting) => setting.userId) } }, select: { id: true, createdAt: true, status: true, _count: { select: { posts: true } } } });
    const usersById = new Map(users.map((user) => [user.id, user]));
    return reply.send({ pages: settings.map((setting) => pageShape(setting, usersById.get(setting.userId))).filter(Boolean) });
  });

  app.patch("/v1/admin/pages", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id, verified } = request.body || {};
    if (!id || typeof verified !== "boolean") return reply.code(400).send({ error: "id et verified requis" });
    const setting = await prisma.userSetting.findFirst({ where: { key: "companyPage", userId: id } });
    if (!setting) return reply.code(404).send({ error: "Page introuvable" });
    const page = parseObject(setting.value);
    if (!page) return reply.code(422).send({ error: "Page invalide" });
    page.verified = verified;
    await prisma.userSetting.update({ where: { id: setting.id }, data: { value: JSON.stringify(page) } });
    return reply.send({ ok: true, verified });
  });

  app.delete("/v1/admin/pages", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id } = request.body || {};
    if (!id) return reply.code(400).send({ error: "id requis" });
    const setting = await prisma.userSetting.findFirst({ where: { key: "companyPage", userId: id } });
    if (!setting) return reply.code(404).send({ error: "Page introuvable" });
    await prisma.$transaction([prisma.userSetting.delete({ where: { id: setting.id } }), prisma.post.updateMany({ where: { companyPageId: id }, data: { companyPageId: null } })]);
    return reply.send({ ok: true });
  });

  app.get("/v1/admin/campaigns", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const settings = await prisma.userSetting.findMany({ where: { key: { startsWith: CAMPAIGN_PREFIX } }, orderBy: { createdAt: "desc" } });
    const users = await prisma.user.findMany({ where: { id: { in: [...new Set(settings.map((setting) => setting.userId))] } }, select: { id: true, name: true, email: true } });
    const usersById = new Map(users.map((user) => [user.id, user]));
    return reply.send({ campaigns: settings.map((setting) => campaignShape(setting, usersById)).filter(Boolean) });
  });

  app.patch("/v1/admin/campaigns", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id, status } = request.body || {};
    const normalizedStatus = String(status || "").toUpperCase();
    if (!id || !["PENDING", "APPROVED", "REJECTED", "PAUSED", "COMPLETED"].includes(normalizedStatus)) return reply.code(400).send({ error: "Campagne ou statut invalide" });
    const setting = await prisma.userSetting.findUnique({ where: { id } });
    if (!setting?.key.startsWith(CAMPAIGN_PREFIX)) return reply.code(404).send({ error: "Campagne introuvable" });
    const campaign = parseObject(setting.value);
    if (!campaign) return reply.code(422).send({ error: "Campagne invalide" });
    campaign.status = normalizedStatus;
    campaign.updatedAt = new Date().toISOString();
    await prisma.userSetting.update({ where: { id }, data: { value: JSON.stringify(campaign) } });
    return reply.send({ ok: true, campaign: { ...campaign, storageId: id } });
  });

  app.get("/v1/admin/subscriptions", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const subscriptions = await prisma.subscription.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true, plan: true } } } });
    return reply.send({ subscriptions: subscriptions.map((subscription) => ({ id: subscription.id, userId: subscription.userId, userName: subscription.user?.name || "Utilisateur", plan: subscription.user?.plan || "FREE", status: subscription.status.toLowerCase(), startedAt: dateValue(subscription.createdAt), nextBilling: dateValue(subscription.currentPeriodEnd), amount: 0, currency: "USD", paymentMethod: "" })) });
  });

  app.patch("/v1/admin/subscriptions", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id, plan, status } = request.body || {};
    if (!id || (plan === undefined && status === undefined)) return reply.code(400).send({ error: "id et modification requis" });
    const data = {};
    if (status !== undefined) data.status = String(status).toUpperCase();
    try {
      const subscription = await prisma.subscription.update({ where: { id }, data });
      if (plan !== undefined) await prisma.user.update({ where: { id: subscription.userId }, data: { plan: String(plan).toUpperCase() } });
      return reply.send({ ok: true, subscription });
    } catch (error) { if (error.code === "P2025") return reply.code(404).send({ error: "Abonnement introuvable" }); throw error; }
  });

  app.get("/v1/admin/reports", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" }, include: { reporter: { select: { name: true } } } });
    return reply.send({ reports: reports.map((report) => ({ ...report, reporter: report.reporter?.name || "Utilisateur", createdAt: dateValue(report.createdAt), resolvedAt: dateValue(report.resolvedAt), updatedAt: dateValue(report.updatedAt) })) });
  });

  app.patch("/v1/admin/reports", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const { id, status, resolution } = request.body || {};
    if (!id || !["pending", "reviewed", "dismissed"].includes(status)) return reply.code(400).send({ error: "id ou statut invalide" });
    try { return reply.send({ ok: true, report: await prisma.report.update({ where: { id }, data: { status, resolution: resolution === undefined ? undefined : String(resolution), resolvedAt: status === "pending" ? null : new Date() } }) }); } catch (error) { if (error.code === "P2025") return reply.code(404).send({ error: "Signalement introuvable" }); throw error; }
  });

  app.get("/v1/admin/settings", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const rows = await prisma.platformSetting.findMany({ where: { key: { in: PLATFORM_SETTING_KEYS } } });
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    const settings = { ...DEFAULT_PLATFORM_SETTINGS,
      maintenanceMode: values.maintenanceMode === "true", allowRegistration: values.allowRegistration !== "false", requireEmailVerification: values.requireEmailVerification !== "false",
      maxPostsPerDay: settingNumber(values.maxPostsPerDay, 10), maxGroupMembers: settingNumber(values.maxGroupMembers, 50000), autoApprovePosts: values.autoApprovePosts !== "false", enableArticles: values.enableArticles !== "false", enableGroups: values.enableGroups !== "false", enableMessages: values.enableMessages !== "false", enablePages: values.enablePages !== "false",
      contentFilterLevel: values.contentFilterLevel || "medium", defaultGroupPrivacy: values.defaultGroupPrivacy || "public", allowedFileTypes: values.allowedFileTypes || DEFAULT_PLATFORM_SETTINGS.allowedFileTypes, maxFileSize: settingNumber(values.maxFileSize, 25) };
    return reply.send({ settings });
  });

  app.patch("/v1/admin/settings", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const input = request.body?.settings;
    if (!input || typeof input !== "object") return reply.code(400).send({ error: "settings requis" });
    const settings = { ...DEFAULT_PLATFORM_SETTINGS, ...input };
    await prisma.$transaction(PLATFORM_SETTING_KEYS.map((key) => prisma.platformSetting.upsert({ where: { key }, update: { value: String(typeof settings[key] === "boolean" ? settings[key] : settings[key] ?? DEFAULT_PLATFORM_SETTINGS[key]) }, create: { key, value: String(typeof settings[key] === "boolean" ? settings[key] : settings[key] ?? DEFAULT_PLATFORM_SETTINGS[key]) } })));
    return reply.send({ ok: true });
  });

  app.get("/v1/admin/support", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const [requests, rows] = await Promise.all([
      prisma.supportRequest.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { name: true, email: true, image: true } } } }),
      prisma.platformSetting.findMany({ where: { key: { in: ["supportFaq", "supportCgu", "supportAutoReplyEnabled", "supportAutoReplyMessage", "supportAutoReplyByCategory"] } } }),
    ]);
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    let byCategory = {}; try { byCategory = JSON.parse(values.supportAutoReplyByCategory || "{}"); } catch {}
    return reply.send({ requests, content: { supportFaq: values.supportFaq, supportCgu: values.supportCgu }, autoReply: { enabled: values.supportAutoReplyEnabled === "true", message: values.supportAutoReplyMessage || "Votre demande a bien été reçue. Notre équipe vous répondra dans les meilleurs délais.", byCategory } });
  });

  app.patch("/v1/admin/support", async (request, reply) => {
    const adminId = await requireAdmin(request, reply); if (!adminId) return;
    const body = request.body || {};
    if (body.action === "reply") {
      if (!body.id || String(body.response || "").trim().length < 2) return reply.code(400).send({ error: "id et réponse requis" });
      try {
        const updated = await prisma.supportRequest.update({ where: { id: body.id }, data: { response: String(body.response).trim().slice(0, 5000), status: "answered", respondedAt: new Date(), respondedBy: adminId }, include: { user: { select: { name: true, email: true, image: true } } } });
        await prisma.notification.create({ data: { userId: updated.userId, senderId: adminId, type: "support_reply", actor: "LynoraLink", text: `Réponse à votre demande : ${updated.subject}`, message: updated.response, meta: JSON.stringify({ supportRequestId: updated.id }) } });
        return reply.send({ ok: true, request: updated });
      } catch (error) { if (error.code === "P2025") return reply.code(404).send({ error: "Demande introuvable" }); throw error; }
    }
    if (body.action === "content") {
      const key = body.key === "supportCgu" ? "supportCgu" : "supportFaq";
      await prisma.platformSetting.upsert({ where: { key }, update: { value: String(body.value || "").slice(0, 50000) }, create: { key, value: String(body.value || "").slice(0, 50000) } });
      return reply.send({ ok: true });
    }
    if (body.action === "autoReply") {
      const message = String(body.message || "").trim().slice(0, 1000); if (message.length < 2) return reply.code(400).send({ error: "Le message automatique est trop court." });
      const byCategory = Object.fromEntries(Object.entries(body.byCategory || {}).map(([key, value]) => [key, String(value).trim().slice(0, 1000)]).filter(([, value]) => value));
      await prisma.$transaction(["supportAutoReplyEnabled", "supportAutoReplyMessage", "supportAutoReplyByCategory"].map((key, index) => { const value = [String(Boolean(body.enabled)), message, JSON.stringify(byCategory)][index]; return prisma.platformSetting.upsert({ where: { key }, update: { value }, create: { key, value } }); }));
      return reply.send({ autoReply: { enabled: Boolean(body.enabled), message, byCategory } });
    }
    return reply.code(400).send({ error: "Action administrateur inconnue." });
  });

  app.get("/v1/admin/analytics", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    const now = new Date(); const monthStart = new Date(now.getFullYear(), now.getMonth(), 1); const last30 = new Date(now.getTime() - 30 * 86400000);
    const [users, posts, groups, messages] = await Promise.all([prisma.user.findMany({ where: { role: { in: ["user", "moderator"] }, status: { in: ["active", "suspended"] } }, select: { id: true, createdAt: true, location: true, sector: true } }), prisma.post.findMany({ where: { status: { in: POST_STATUSES } }, select: { createdAt: true, authorId: true } }), prisma.group.count({ where: { status: "active" } }), prisma.message.findMany({ where: { text: { not: "" } }, select: { createdAt: true, senderId: true } })]);
    const months = Array.from({ length: 6 }, (_, index) => new Date(now.getFullYear(), now.getMonth() - 5 + index, 1));
    const userGrowth = months.map((date) => ({ month: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""), value: users.filter((user) => user.createdAt >= date && user.createdAt < new Date(date.getFullYear(), date.getMonth() + 1, 1)).length }));
    const postGrowth = months.map((date) => ({ month: date.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""), value: posts.filter((post) => post.createdAt >= date && post.createdAt < new Date(date.getFullYear(), date.getMonth() + 1, 1)).length }));
    const categories = Object.entries(users.reduce((result, user) => { if (user.sector) result[user.sector] = (result[user.sector] || 0) + 1; return result; }, {})).sort(([, a], [, b]) => b - a).slice(0, 6).map(([name, count]) => ({ name, count, pct: users.length ? Math.round(count * 1000 / users.length) / 10 : 0 }));
    return reply.send({ analytics: { totalUsers: users.length, activeUsersMonth: new Set([...users.filter((user) => user.createdAt >= last30).map((user) => user.id), ...posts.filter((post) => post.createdAt >= last30).map((post) => post.authorId), ...messages.filter((message) => message.createdAt >= last30).map((message) => message.senderId)]).size, totalPosts: posts.length, postsThisMonth: posts.filter((post) => post.createdAt >= last30).length, totalGroups: groups, totalMessages: messages.length, messagesThisMonth: messages.filter((message) => message.createdAt >= last30).length, newUsersThisMonth: users.filter((user) => user.createdAt >= monthStart).length, avgSessionDuration: "0m", userGrowth, postGrowth, topCategories: categories, geographicDistribution: [], geographicCoverage: 0, dailyActive: [], recentEventsCount: posts.filter((post) => post.createdAt >= last30).length + messages.filter((message) => message.createdAt >= last30).length } });
  });

  app.get("/v1/admin/ai/config", async (request, reply) => {
    if (!await requireAdmin(request, reply)) return;
    return reply.send({ provider: process.env.GROQ_API_KEY ? "groq" : "none", model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", configured: Boolean(process.env.GROQ_API_KEY), announcementEndpoint: "/v1/admin/ai/announcement", supportEndpoint: "/v1/admin/ai/support" });
  });

  app.post("/v1/admin/ai/announcement", async (request, reply) => {
    const adminId = await requireAdmin(request, reply); if (!adminId) return;
    try {
      const text = await callAi([{ role: "system", content: "Rédige une annonce professionnelle en français, positive et concise, de 2 à 4 phrases. N'invente aucune fonctionnalité, aucun chiffre ni aucune date. Retourne uniquement le texte." }, { role: "user", content: "Annonce une mise à jour générale de la plateforme LynoraLink et invite la communauté à découvrir son fil et son réseau." }], 220);
      const post = await prisma.post.create({ data: { authorId: adminId, text, status: "published", visibility: "public", isSponsored: false, presentation: JSON.stringify({ type: "announcement", theme: "navy-gold", density: "airy", source: "ai", actor: "LynoraLink", avatarUrl: "/logo_lynora.svg" }) }, select: { id: true, text: true, status: true, createdAt: true } });
      return reply.send({ ok: true, post, source: "ai" });
    } catch (error) { request.log.warn(error); return reply.code(503).send({ error: "Le fournisseur IA est indisponible ou non configuré." }); }
  });

  app.post("/v1/admin/ai/tasks", async (request, reply) => {
    const adminId = await requireAdmin(request, reply); if (!adminId) return;
    try {
      const [pendingReports, pendingPosts, restrictedUsers, openSupport] = await Promise.all([prisma.report.count({ where: { status: "pending" } }), prisma.post.count({ where: { status: "pending_review" } }), prisma.user.count({ where: { status: { in: ["suspended", "banned"] } } }), prisma.supportRequest.count({ where: { status: "open" } })]);
      const tasks = [{ id: "reports", section: "reports", priority: "high", label: "Traiter les signalements", count: pendingReports }, { id: "posts", section: "posts", priority: "high", label: "Modérer les publications", count: pendingPosts }, { id: "support", section: "support", priority: "medium", label: "Répondre au support", count: openSupport }, { id: "users", section: "users", priority: "medium", label: "Vérifier les comptes restreints", count: restrictedUsers }].filter((task) => task.count > 0).map((task) => ({ ...task, description: `${task.count} élément${task.count > 1 ? "s" : ""} nécessite${task.count > 1 ? "nt" : ""} une vérification.`, requiresManualAction: true, autoHandledByAssistant: false }));
      const summary = tasks.length ? `${tasks.length} action${tasks.length > 1 ? "s" : ""} à surveiller.` : "Aucune action à traiter pour l’instant.";
      await prisma.notification.create({ data: { userId: adminId, type: "admin_ai_tasks", actor: "LynoraLink", text: summary, message: tasks.map((task) => task.label).join("\n") || summary, meta: JSON.stringify({ tasks, generatedAt: new Date().toISOString() }) } });
      return reply.send({ ok: true, tasks, manualTasks: tasks, generatedAt: new Date().toISOString(), summary, notificationEligible: tasks.length > 0 });
    } catch (error) { request.log.error(error); return reply.code(500).send({ error: "Impossible d'analyser les tâches administratives." }); }
  });

  app.post("/v1/admin/ai/support", async (request, reply) => {
    const adminId = await requireAdmin(request, reply); if (!adminId) return;
    try {
      const requests = await prisma.supportRequest.findMany({ where: { status: "open" }, orderBy: { createdAt: "asc" }, take: 25 });
      const processed = [];
      for (const supportRequest of requests) {
        const response = await callAi([{ role: "system", content: "Réponds en français à cette demande support en 2 à 4 phrases courtoises. Base-toi uniquement sur la demande, ne promets aucune action non confirmée. Retourne uniquement la réponse." }, { role: "user", content: `Catégorie: ${supportRequest.category}\nSujet: ${supportRequest.subject}\nDemande: ${supportRequest.message}` }]);
        const updated = await prisma.supportRequest.update({ where: { id: supportRequest.id }, data: { response, status: "answered", respondedAt: new Date(), respondedBy: adminId } });
        await prisma.notification.create({ data: { userId: supportRequest.userId, senderId: adminId, type: "support_reply", actor: "LynoraLink", text: `Réponse à votre demande : ${supportRequest.subject}`, message: response, meta: JSON.stringify({ supportRequestId: supportRequest.id, source: "ai" }) } });
        processed.push({ ...updated, source: "ai" });
      }
      return reply.send({ ok: true, processed, count: processed.length, message: processed.length ? `${processed.length} réponse automatique envoyée.` : "Aucune demande support ouverte." });
    } catch (error) { request.log.error(error); return reply.code(503).send({ error: "Les réponses automatiques IA n'ont pas pu être envoyées." }); }
  });
}

function parseObject(value) {
  try { const parsed = JSON.parse(value); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null; } catch { return null; }
}

function pageShape(setting, user) {
  if (!user) return null;
  const page = parseObject(setting.value);
  if (!page) return null;
  const name = String(page.name || page.displayName || "Page entreprise");
  return { id: user.id, ownerId: user.id, name, initials: initials(name), category: page.industry || page.category || "Entreprise", followers: Number(page.stats?.followers || page.followers || 0), postsCount: Number(page.stats?.posts || user._count.posts || 0), status: user.status === "active" ? "active" : "pending", verified: Boolean(page.verified), logoUrl: page.logoUrl || page.avatarUrl || null, coverUrl: page.bannerUrl || page.coverUrl || null, createdAt: page.createdAt || user.createdAt.toISOString() };
}

function campaignShape(setting, usersById) {
  const campaign = parseObject(setting.value);
  if (!campaign) return null;
  const owner = usersById.get(campaign.pageId);
  return { ...campaign, storageId: setting.id, ownerName: owner?.name || owner?.email || "Page entreprise", ownerEmail: owner?.email || "" };
}

function settingBoolean(value, fallback) { return value === undefined ? fallback : Boolean(value); }
function settingNumber(value, fallback) { const number = Number(value); return Number.isFinite(number) && number > 0 ? number : fallback; }
function dateValue(value) { return value instanceof Date ? value.toISOString() : value || null; }

async function callAi(messages, maxTokens = 300) {
  if (!process.env.GROQ_API_KEY) throw new Error("AI provider non configuré");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GROQ_API_KEY}` }, body: JSON.stringify({ model: process.env.GROQ_MODEL || "llama-3.1-8b-instant", messages, temperature: 0.2, max_tokens: maxTokens }) });
  if (!response.ok) throw new Error(`AI provider HTTP ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("AI provider returned no content");
  return text;
}