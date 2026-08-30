import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { broadcastRealtimeEvent } from "@/lib/realtime";

function initialsFromName(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "S";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "maintenant";
  const diffMinutes = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 60) return `${diffMinutes} min`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} h`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} j`;
}

function normalizeNotification(item) {
  const actor = item.actor || item.user?.name || "LynoraLink";
  const displayActor = actor === "Assistant IA" || actor === "IA" ? "LynoraLink" : actor;
  const text = item.text || item.message || "Nouvelle notification";
  const meta = item.meta ? (() => { try { return JSON.parse(item.meta); } catch { return {}; } })() : {};
  const explicitAvatar = item.avatarUrl || meta.avatarUrl || meta.actorAvatar || meta.image || meta.imageUrl || item.sender?.image || item.user?.image || null;
  const explicitCover = item.coverUrl || meta.coverUrl || meta.groupCover || meta.groupImage || item.sender?.cover || null;
  const avatarUrl = explicitAvatar || (displayActor === "LynoraLink" ? "/logo_lynora.svg" : null);
  const coverUrl = explicitCover || null;

  return {
    id: item.id,
    userId: item.userId,
    type: item.type || "info",
    actor: displayActor,
    initials: item.initials || (displayActor === "LynoraLink" ? "LL" : initialsFromName(displayActor)),
    text,
    message: item.message || text,
    read: Boolean(item.read),
    time: item.createdAt || new Date().toISOString(),
    createdAt: item.createdAt,
    avatarUrl,
    coverUrl,
    meta: {
      ...meta,
      ...(explicitAvatar ? { avatarUrl: explicitAvatar, actorAvatar: explicitAvatar } : {}),
      ...(coverUrl ? { coverUrl } : {}),
    },
  };
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const targetUserId = req.nextUrl.searchParams.get("userId") || session?.user?.id;

  if (!session?.user?.id && !targetUserId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = targetUserId || session.user.id;

  if (session?.user?.id && userId !== session.user.id) {
    return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
  }

  const items = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true } },
      sender: { select: { id: true, name: true, image: true, cover: true } },
    },
  });

  return NextResponse.json({ notifications: items.map(normalizeNotification) });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id && !req.body) {
    // body validation below handles the case of system-triggered notifications from authenticated clients
  }

  try {
    const body = await req.json();
    const { userId, type = "info", message = "", meta = {}, actor, initials, text } = body || {};
    const targetUserId = userId || session?.user?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const resolvedActor = (actor || "LynoraLink") === "Assistant IA" || (actor || "LynoraLink") === "IA" ? "LynoraLink" : (actor || "LynoraLink");
    const resolvedMeta = meta && typeof meta === "object" ? { ...meta } : {};
    if (!resolvedMeta.avatarUrl && !resolvedMeta.actorAvatar && !resolvedMeta.image && !resolvedMeta.imageUrl && resolvedActor === "LynoraLink") {
      resolvedMeta.avatarUrl = "/logo_lynora.svg";
      resolvedMeta.actorAvatar = "/logo_lynora.svg";
    }
    if (resolvedMeta.coverUrl || resolvedMeta.groupCover || resolvedMeta.groupImage) {
      resolvedMeta.coverUrl = resolvedMeta.coverUrl || resolvedMeta.groupCover || resolvedMeta.groupImage || null;
    }
    const payload = await prisma.notification.create({
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
      include: { user: { select: { id: true, name: true } } },
    });
    await sendPushNotification(targetUserId, payload);
    broadcastRealtimeEvent({ userId: targetUserId, type: "notifications", payload: { notificationId: payload.id, kind: type } });

    return NextResponse.json({ ok: true, notification: normalizeNotification(payload) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req) {
  const session = await getServerSession(authOptions);

  try {
    const body = await req.json();
    const { id, userId, read, markAllRead, type } = body || {};
    const targetUserId = userId || session?.user?.id;

    if (markAllRead && targetUserId) {
      const filter = type ? { userId: targetUserId, type } : { userId: targetUserId };
      const items = await prisma.notification.updateMany({
        where: filter,
        data: { read: true },
      });
      const notifications = await prisma.notification.findMany({
        where: filter,
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ ok: true, updated: items.count, notifications: notifications.map(normalizeNotification) });
    }

    if (type && !id && targetUserId) {
      const items = await prisma.notification.updateMany({
        where: { userId: targetUserId, type, read: false },
        data: { read: typeof read === "boolean" ? read : true },
      });
      return NextResponse.json({ ok: true, updated: items.count });
    }

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const item = await prisma.notification.update({
      where: { id },
      data: { read: typeof read === "boolean" ? read : true },
      include: { user: { select: { id: true, name: true } } },
    });
    broadcastRealtimeEvent({ userId: item.userId, type: "notifications", payload: { notificationId: item.id, read: item.read, kind: item.type } });

    return NextResponse.json({ ok: true, notification: normalizeNotification(item) });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await prisma.notification.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
