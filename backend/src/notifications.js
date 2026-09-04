import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

function initialsFromName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function normalizeNotification(item) {
  const actor = item.actor || item.user?.name || "LynoraLink";
  const displayActor = actor === "Assistant IA" || actor === "IA" ? "LynoraLink" : actor;
  const isPlatformNotification = displayActor === "LynoraLink" || ["admin_ai_tasks", "support_reply"].includes(item.type);
  const text = item.text || item.message || "Nouvelle notification";
  let meta = {};
  try { meta = item.meta ? JSON.parse(item.meta) : {}; } catch {}
  const avatarUrl = isPlatformNotification ? "/logo_lynora.svg" : (item.avatarUrl || meta.avatarUrl || meta.actorAvatar || meta.image || meta.imageUrl || item.sender?.image || item.user?.image || null);
  const coverUrl = item.coverUrl || meta.coverUrl || meta.groupCover || meta.groupImage || item.sender?.cover || null;
  return {
    id: item.id,
    userId: item.userId,
    type: item.type || "info",
    actor: displayActor,
    initials: isPlatformNotification ? "LL" : (item.initials || initialsFromName(displayActor)),
    text,
    message: item.message || text,
    read: Boolean(item.read),
    time: item.createdAt,
    createdAt: item.createdAt,
    avatarUrl,
    coverUrl,
    meta: { ...meta, ...(avatarUrl ? { avatarUrl, actorAvatar: avatarUrl } : {}), ...(coverUrl ? { coverUrl } : {}) },
  };
}

async function requireUser(request, reply) {
  const userId = await getSessionUserId(request);
  if (!userId) {
    reply.code(401).send({ error: "Non authentifié" });
    return null;
  }
  return userId;
}

function parseArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = value ? JSON.parse(value) : []; return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function canCreateForTarget(sessionUserId, targetUserId, meta, reply) {
  if (targetUserId === sessionUserId) return true;
  const admin = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { role: true } });
  if (admin?.role === "admin") return true;
  if (!meta?.groupId) {
    reply.code(403).send({ error: "Création réservée à votre compte ou aux administrateurs" });
    return false;
  }
  const group = await prisma.group.findUnique({ where: { id: String(meta.groupId) }, select: { ownerId: true, members: true } });
  const member = parseArray(group?.members).find((item) => String(item?.id || item?.userId) === sessionUserId);
  const targetIsModerator = String(group?.ownerId || "") === targetUserId || parseArray(group?.members).some((item) => String(item?.id || item?.userId) === targetUserId && ["admin", "moderator"].includes(item?.role));
  if (!member || !targetIsModerator) {
    reply.code(403).send({ error: "Notification de groupe non autorisée" });
    return false;
  }
  return true;
}

export async function registerNotificationRoutes(app) {
  app.get("/v1/notifications", async (request, reply) => {
    const userId = await requireUser(request, reply);
    if (!userId) return;
    const requestedUserId = request.query?.userId;
    if (requestedUserId && requestedUserId !== userId) return reply.code(403).send({ error: "Accès interdit" });
    const items = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
        sender: { select: { id: true, name: true, image: true, cover: true } },
      },
    });
    return reply.send({ notifications: items.map(normalizeNotification) });
  });

  app.post("/v1/notifications", async (request, reply) => {
    const sessionUserId = await requireUser(request, reply);
    if (!sessionUserId) return;
    const { userId, type = "info", message = "", meta = {}, actor, initials, text } = request.body || {};
    const targetUserId = userId || sessionUserId;
    if (!await canCreateForTarget(sessionUserId, targetUserId, meta, reply)) return;
    const resolvedActor = actor === "Assistant IA" || actor === "IA" || !actor ? (actor ? "LynoraLink" : "LynoraLink") : actor;
    const resolvedMeta = meta && typeof meta === "object" ? { ...meta } : {};
    if (!resolvedMeta.avatarUrl && !resolvedMeta.actorAvatar && !resolvedMeta.image && !resolvedMeta.imageUrl && resolvedActor === "LynoraLink") {
      resolvedMeta.avatarUrl = "/logo_lynora.svg";
      resolvedMeta.actorAvatar = "/logo_lynora.svg";
    }
    if (resolvedMeta.coverUrl || resolvedMeta.groupCover || resolvedMeta.groupImage) resolvedMeta.coverUrl = resolvedMeta.coverUrl || resolvedMeta.groupCover || resolvedMeta.groupImage;
    const notification = await prisma.notification.create({
      data: {
        userId: targetUserId,
        type,
        actor: resolvedActor,
        initials: initials || (resolvedActor === "LynoraLink" ? "LL" : initialsFromName(resolvedActor)),
        text: text || message || "Nouvelle notification",
        message: message || text || "Nouvelle notification",
        meta: JSON.stringify(resolvedMeta),
        read: false,
      },
      include: { user: { select: { id: true, name: true, image: true } }, sender: { select: { image: true, cover: true } } },
    });
    return reply.send({ ok: true, notification: normalizeNotification(notification) });
  });

  app.patch("/v1/notifications", async (request, reply) => {
    const userId = await requireUser(request, reply);
    if (!userId) return;
    const { id, userId: requestedUserId, read, markAllRead, type } = request.body || {};
    if (requestedUserId && requestedUserId !== userId) return reply.code(403).send({ error: "Accès interdit" });
    if (markAllRead || (type && !id)) {
      const filter = { userId, ...(type ? { type } : {}) };
      const result = await prisma.notification.updateMany({ where: filter, data: { read: typeof read === "boolean" ? read : true } });
      if (markAllRead) {
        const items = await prisma.notification.findMany({ where: filter, orderBy: { createdAt: "desc" } });
        return reply.send({ ok: true, updated: result.count, notifications: items.map(normalizeNotification) });
      }
      return reply.send({ ok: true, updated: result.count });
    }
    if (!id) return reply.code(400).send({ error: "id requis" });
    const existing = await prisma.notification.findFirst({ where: { id, userId } });
    if (!existing) return reply.code(404).send({ error: "Notification introuvable" });
    const item = await prisma.notification.update({ where: { id }, data: { read: typeof read === "boolean" ? read : true }, include: { user: { select: { id: true, name: true, image: true } }, sender: { select: { image: true, cover: true } } } });
    return reply.send({ ok: true, notification: normalizeNotification(item) });
  });

  app.delete("/v1/notifications", async (request, reply) => {
    const userId = await requireUser(request, reply);
    if (!userId) return;
    const id = request.query?.id;
    if (!id) return reply.code(400).send({ error: "id requis" });
    const result = await prisma.notification.deleteMany({ where: { id, userId } });
    if (!result.count) return reply.code(404).send({ error: "Notification introuvable" });
    return reply.send({ ok: true });
  });
}
