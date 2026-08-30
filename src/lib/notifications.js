import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

const APP_BRAND = {
  name: "LynoraLink",
  avatarUrl: "/logo_lynora.svg",
  initials: "LL",
};

function initials(name = "") {
  return String(name).trim().split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() || "").join("") || "L";
}

function resolveBranding({ actor = APP_BRAND.name, avatarUrl = null, coverUrl = null, initialsValue = null, meta = {}, sender = null } = {}) {
  const senderName = sender?.name || sender?.title || null;
  const normalizedActor = actor === "Assistant IA" || actor === "IA" ? APP_BRAND.name : (actor || senderName || APP_BRAND.name);
  const normalizedInitials = initialsValue || (normalizedActor === APP_BRAND.name ? APP_BRAND.initials : initials(normalizedActor));
  const normalizedAvatarUrl = avatarUrl || meta.avatarUrl || meta.actorAvatar || meta.image || meta.imageUrl || sender?.image || sender?.avatarUrl || (normalizedActor === APP_BRAND.name ? APP_BRAND.avatarUrl : null);
  const normalizedCoverUrl = coverUrl || meta.coverUrl || meta.groupCover || meta.groupImage || sender?.cover || sender?.coverUrl || null;
  return {
    actor: normalizedActor,
    initials: normalizedInitials,
    avatarUrl: normalizedAvatarUrl,
    coverUrl: normalizedCoverUrl,
  };
}

async function getPageBranding(userId) {
  if (!userId) return null;
  try {
    const pageSetting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: "companyPage" } },
    });
    if (!pageSetting) return null;

    let page = {};
    try { page = JSON.parse(pageSetting.value || "{}"); } catch { page = {}; }
    const pageName = typeof page?.name === "string" ? page.name.trim() : "";
    if (!pageName) return null;

    return {
      name: pageName,
      image: typeof page?.logoUrl === "string" ? page.logoUrl : null,
      cover: typeof page?.bannerUrl === "string" ? page.bannerUrl : null,
      avatarUrl: typeof page?.logoUrl === "string" ? page.logoUrl : null,
      coverUrl: typeof page?.bannerUrl === "string" ? page.bannerUrl : null,
    };
  } catch {
    return null;
  }
}

async function getSenderBranding(senderId) {
  if (!senderId) return null;

  try {
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, name: true, image: true, cover: true },
    });
    if (!sender) return null;
    return {
      name: sender.name || null,
      image: sender.image || null,
      cover: sender.cover || null,
      avatarUrl: sender.image || null,
      coverUrl: sender.cover || null,
    };
  } catch {
    return null;
  }
}

export async function createNotification({ userId, senderId = null, type = "info", actor = APP_BRAND.name, text, meta = {}, title, url, avatarUrl = null, coverUrl = null }) {
  if (!userId || !text || (senderId && userId === senderId)) return null;

  let targetUser = null;
  try {
    targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
  } catch {
    targetUser = null;
  }

  if (!targetUser) return null;

  let sender = null;
  if (senderId) {
    try {
      sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, name: true, image: true, cover: true },
      });
    } catch {
      sender = null;
    }
  }

  const senderPageBranding = senderId ? await getPageBranding(senderId) : null;
  const senderBranding = await getSenderBranding(senderId);
  const sourceBranding = senderPageBranding || senderBranding || sender;
  const preferredActor = senderPageBranding?.name || actor || senderBranding?.name || sender?.name || APP_BRAND.name;
  const normalizedMeta = { ...meta };
  if (!normalizedMeta.avatarUrl && !normalizedMeta.actorAvatar && !normalizedMeta.image && !normalizedMeta.imageUrl) {
    normalizedMeta.avatarUrl = senderPageBranding?.avatarUrl || senderBranding?.avatarUrl || sender?.image || avatarUrl || null;
    normalizedMeta.actorAvatar = normalizedMeta.avatarUrl || null;
  }
  if (!normalizedMeta.coverUrl && !normalizedMeta.groupCover && !normalizedMeta.groupImage) {
    normalizedMeta.coverUrl = senderPageBranding?.coverUrl || senderBranding?.coverUrl || sender?.cover || coverUrl || null;
    normalizedMeta.groupCover = normalizedMeta.coverUrl || null;
    normalizedMeta.groupImage = normalizedMeta.coverUrl || null;
  }
  const branding = resolveBranding({ actor: preferredActor, avatarUrl: normalizedMeta.avatarUrl || avatarUrl, coverUrl: normalizedMeta.coverUrl || coverUrl, meta: normalizedMeta, sender: sourceBranding || sender });
  const notificationMeta = {
    ...normalizedMeta,
    ...(branding.avatarUrl ? { avatarUrl: branding.avatarUrl, actorAvatar: branding.avatarUrl } : {}),
    ...(branding.coverUrl ? { coverUrl: branding.coverUrl, groupCover: branding.coverUrl, groupImage: branding.coverUrl } : {}),
  };

  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        senderId,
        type,
        actor: branding.actor,
        initials: branding.initials,
        text,
        message: text,
        meta: JSON.stringify(notificationMeta),
        read: false,
      },
    });
    await sendPushNotification(userId, { ...notification, title, url, actor: branding.actor, initials: branding.initials, avatarUrl: branding.avatarUrl });
    return notification;
  } catch {
    return null;
  }
}
