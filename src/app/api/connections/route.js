import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { broadcastRealtimeEvent } from "@/lib/realtime";

function initials(name = "") {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "L";
}

async function createConnectionNotification({ userId, senderId, actor, text, kind }) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        senderId,
        type: "connection",
        actor: actor || "LynoraLink",
        initials: initials(actor || "LynoraLink"),
        text,
        message: text,
        meta: JSON.stringify({ kind }),
        read: false,
      },
    });
    await sendPushNotification(userId, notification);
  } catch {
    // Une notification ne doit pas empêcher la demande de connexion.
  }
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const searchParams = req.nextUrl.searchParams;
  const targetUserId = searchParams.get("userId") || session?.user?.id;
  const hasPagination = searchParams.has("limit") || searchParams.has("offset");
  const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "24", 10) || 24, 1), 50);
  const offset = Math.max(Number.parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

  if (!session?.user?.id && !targetUserId) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const userId = targetUserId || session.user.id;

  if (userId !== session.user.id) {
    const visibilitySettings = await prisma.userSetting.findMany({
      where: { userId, key: { in: ["profileVisibility", "showConnections"] } },
      select: { key: true, value: true },
    });
    const profileVisibility = visibilitySettings.find((setting) => setting.key === "profileVisibility")?.value || "public";
    const showConnections = visibilitySettings.find((setting) => setting.key === "showConnections")?.value !== "false";
    if (!showConnections) return NextResponse.json({ connections: [], totalConnections: 0, invitations: [], pendingRequests: [] });
    if (profileVisibility === "private") return NextResponse.json({ connections: [], totalConnections: 0, invitations: [], pendingRequests: [] });
    if (profileVisibility === "connections") {
      const connection = await prisma.connection.findFirst({
        where: {
          status: "accepted",
          OR: [
            { userAId: session.user.id, userBId: userId },
            { userAId: userId, userBId: session.user.id },
          ],
        },
        select: { id: true },
      });
      if (!connection) return NextResponse.json({ connections: [], totalConnections: 0, invitations: [], pendingRequests: [] });
    }
  }

  const baseWhere = { OR: [{ userAId: userId }, { userBId: userId }] };
  const acceptedWhere = { ...baseWhere, status: "accepted" };
  const [rows, totalConnections] = await Promise.all([
    prisma.connection.findMany({
      where: hasPagination ? acceptedWhere : baseWhere,
      ...(hasPagination ? { skip: offset, take: limit } : {}),
      include: {
        userA: { select: { id: true, name: true, title: true, image: true, birthDate: true } },
        userB: { select: { id: true, name: true, title: true, image: true, birthDate: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.connection.count({ where: acceptedWhere }),
  ]);

  const connections = rows
    .filter((row) => row.status === "accepted")
    .map((row) => {
      const otherUser = row.userAId === userId ? row.userB : row.userA;
      return {
        id: otherUser.id,
        connectionId: row.id,
        userId: otherUser.id,
        name: otherUser.name || "Utilisateur",
        title: otherUser.title || "Membre LynoraLink",
        initials: initials(otherUser.name || "Utilisateur"),
        image: otherUser.image || null,
        cover: otherUser.cover || null,
        coverUrl: otherUser.cover || null,
        birthDate: otherUser.birthDate ? new Date(otherUser.birthDate).toISOString().slice(0, 10) : null,
        mutual: 0,
      };
    });

  const invitations = rows
    .filter((row) => row.status === "pending" && row.userBId === userId)
    .map((row) => {
      const otherUser = row.userA;
      return {
        id: row.id,
        connectionId: row.id,
        userId: otherUser.id,
        name: otherUser.name || "Utilisateur",
        title: otherUser.title || "Membre LynoraLink",
        initials: initials(otherUser.name || "Utilisateur"),
        image: otherUser.image || null,
        cover: otherUser.cover || null,
        coverUrl: otherUser.cover || null,
        birthDate: otherUser.birthDate ? new Date(otherUser.birthDate).toISOString().slice(0, 10) : null,
        mutual: 0,
        time: "maintenant",
      };
    });

  const pendingRequests = rows
    .filter((row) => row.status === "pending" && row.userAId === userId)
    .map((row) => ({
      id: row.userBId,
      connectionId: row.id,
      userId: row.userBId,
      name: row.userB.name || "Utilisateur",
      title: row.userB.title || "Membre LynoraLink",
      initials: initials(row.userB.name || "Utilisateur"),
      image: row.userB.image || null,
      cover: row.userB.cover || null,
      coverUrl: row.userB.cover || null,
      birthDate: row.userB.birthDate ? new Date(row.userB.birthDate).toISOString().slice(0, 10) : null,
      mutual: 0,
      time: "maintenant",
    }));

  return NextResponse.json({ connections, totalConnections, invitations, pendingRequests });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = await req.json();
  const { targetUserId, action = "invite" } = body || {};

  if (!targetUserId || targetUserId === session.user.id) {
    return NextResponse.json({ error: "Utilisateur invalide." }, { status: 400 });
  }

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { userAId: session.user.id, userBId: targetUserId },
        { userAId: targetUserId, userBId: session.user.id },
      ],
    },
  });

  if (existing) {
    if (action === "invite" && existing.status === "pending" && existing.userAId === session.user.id) {
      const requestExpired = existing.createdAt.getTime() < Date.now() - 24 * 60 * 60 * 1000;
      if (requestExpired) {
        const updated = await prisma.connection.update({
          where: { id: existing.id },
          data: { createdAt: new Date() },
        });
        await createConnectionNotification({
          userId: targetUserId,
          senderId: session.user.id,
          actor: session.user.name,
          text: `${session.user.name || "Un utilisateur"} vous a envoyé une demande de connexion.`,
          kind: "request",
        });
        broadcastRealtimeEvent({ userIds: [session.user.id, targetUserId], type: "suggestions", payload: { action: "request", targetUserId } });
        return NextResponse.json({ ok: true, connection: updated, pending: true, resent: true });
      }
    }

    if (action === "invite" && existing.status === "rejected") {
      const updated = await prisma.connection.update({
        where: { id: existing.id },
        data: {
          userAId: session.user.id,
          userBId: targetUserId,
          status: "pending",
        },
      });
      await createConnectionNotification({
        userId: targetUserId,
        senderId: session.user.id,
        actor: session.user.name,
        text: `${session.user.name || "Un utilisateur"} vous a envoyé une demande de connexion.`,
        kind: "request",
      });
      broadcastRealtimeEvent({ userIds: [session.user.id, targetUserId], type: "suggestions", payload: { action: "request", targetUserId } });
      return NextResponse.json({ ok: true, connection: updated, pending: true });
    }

    if (action === "accept" && existing.status !== "accepted") {
      const updated = await prisma.connection.update({
        where: { id: existing.id },
        data: { status: "accepted" },
      });
      await createConnectionNotification({
        userId: existing.userAId === session.user.id ? existing.userBId : existing.userAId,
        senderId: session.user.id,
        actor: session.user.name,
        text: `${session.user.name || "Un utilisateur"} a accepté votre demande de connexion.`,
        kind: "accepted",
      });
      broadcastRealtimeEvent({ userIds: [session.user.id, existing.userAId === session.user.id ? existing.userBId : existing.userAId], type: "suggestions", payload: { action: "accepted", targetUserId: existing.userAId === session.user.id ? existing.userBId : existing.userAId } });
      return NextResponse.json({ ok: true, connection: updated, accepted: true });
    }

    if (action === "decline") {
      await prisma.connection.delete({ where: { id: existing.id } });
      return NextResponse.json({ ok: true, deleted: true });
    }

    if (action === "remove") {
      await prisma.$transaction([
        prisma.connection.delete({ where: { id: existing.id } }),
        prisma.removedConnection.upsert({
          where: { userId_targetId: { userId: session.user.id, targetId: targetUserId } },
          update: { createdAt: new Date() },
          create: { userId: session.user.id, targetId: targetUserId },
        }),
      ]);
      return NextResponse.json({ ok: true, deleted: true, removed: true });
    }

    return NextResponse.json({ ok: true, connection: existing });
  }

  if (action === "invite") {
    const removed = await prisma.removedConnection.findUnique({
      where: { userId_targetId: { userId: session.user.id, targetId: targetUserId } },
    });
    if (removed) {
      return NextResponse.json({ error: "Utilisateur retiré. Débloquez-le depuis vos réglages avant de renvoyer une invitation." }, { status: 403 });
    }
  }

  const created = await prisma.connection.create({
    data: {
      userAId: session.user.id,
      userBId: targetUserId,
      status: action === "accept" ? "accepted" : "pending",
    },
  });
  await createConnectionNotification({
    userId: targetUserId,
    senderId: session.user.id,
    actor: session.user.name,
    text: `${session.user.name || "Un utilisateur"} vous a envoyé une demande de connexion.`,
    kind: "request",
  });
  broadcastRealtimeEvent({ userIds: [session.user.id, targetUserId], type: "suggestions", payload: { action: "request", targetUserId } });

  return NextResponse.json({ ok: true, connection: created });
}
