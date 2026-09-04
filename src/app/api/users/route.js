import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { getBlockedUserIds } from "@/lib/blocking";
import { getMutualConnections } from "@/lib/mutual-connections";

function initials(name = "") {
  return (name || "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("") || "L";
}

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const meId = session.user.id;
  const blockedIds = await getBlockedUserIds(prisma, meId);

  const users = await prisma.user.findMany({
    where: { id: { not: meId } },
    select: { id: true, name: true, title: true, image: true, cover: true },
    orderBy: { createdAt: "desc" },
  });
  const userSettings = await prisma.userSetting.findMany({
    where: { key: "searchable" },
    select: { userId: true, value: true },
  });
  const searchableIds = new Set(userSettings.filter((setting) => setting.value !== "false").map((setting) => setting.userId));

  const rows = await prisma.connection.findMany({
    where: {
      OR: [{ userAId: meId }, { userBId: meId }],
    },
  });
  const removedRows = await prisma.removedConnection.findMany({
    where: { userId: meId },
    select: { targetId: true, createdAt: true },
  });

  const connectedIds = new Set();
  const pendingIds = new Set();
  const retainedPendingSuggestionIds = new Set();
  const removedIds = new Set(removedRows.filter((row) => row.createdAt.getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000).map((row) => row.targetId));
  const pendingSuggestionCutoff = Date.now() - 24 * 60 * 60 * 1000;

  for (const r of rows) {
    if (r.status === "accepted") {
      connectedIds.add(r.userAId === meId ? r.userBId : r.userAId);
    } else if (r.status === "pending") {
      if (r.userAId === meId && r.createdAt.getTime() >= pendingSuggestionCutoff) {
        pendingIds.add(r.userBId);
        retainedPendingSuggestionIds.add(r.userBId);
      }
      if (r.userBId === meId) pendingIds.add(r.userAId);
    }
  }

  const suggestedUsers = users
    .filter((user) => !blockedIds.has(user.id))
    .filter((user) => searchableIds.has(user.id) || !userSettings.some((setting) => setting.userId === user.id))
    .filter((u) => !connectedIds.has(u.id) && (!pendingIds.has(u.id) || retainedPendingSuggestionIds.has(u.id)) && !removedIds.has(u.id));
  const mutualByCandidate = await getMutualConnections(prisma, meId, suggestedUsers.map((user) => user.id));
  const suggestions = suggestedUsers.map((u) => ({
      id: u.id,
      name: u.name || "Utilisateur",
      title: u.title || "Membre LynoraLink",
      initials: initials(u.name),
      ...(mutualByCandidate.get(u.id) || { mutual: 0, mutualAvatars: [] }),
      type: "user",
      image: u.image || null,
      cover: u.cover || null,
      coverUrl: u.cover || null,
    }));

  const firstSuggestion = suggestions[0];
  if (firstSuggestion) {
    const metaToken = `"suggestionUserId":"${firstSuggestion.id}"`;
    const existingSuggestionNotification = await prisma.notification.findFirst({
      where: { userId: meId, type: "suggestion", meta: { contains: metaToken } },
      select: { id: true },
    });
    if (!existingSuggestionNotification) {
      await createNotification({
        userId: meId,
        type: "suggestion",
        actor: firstSuggestion.name,
        text: "pourrait vous intéresser comme nouvelle relation.",
        meta: { kind: "relationship-suggestion", suggestionUserId: firstSuggestion.id },
      });
    }
  }

  return NextResponse.json({ users: users.filter((user) => !blockedIds.has(user.id) && (searchableIds.has(user.id) || !userSettings.some((setting) => setting.userId === user.id))), suggestions });
}
