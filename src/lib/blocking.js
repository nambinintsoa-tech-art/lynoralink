export async function getBlockedUserIds(prisma, userId) {
  if (!userId) return new Set();
  const rows = await prisma.removedConnection.findMany({
    where: {
      OR: [{ userId }, { targetId: userId }],
    },
    select: { userId: true, targetId: true },
  });
  return new Set(rows.map((row) => row.userId === userId ? row.targetId : row.userId));
}

export function isBlockedBy(blockedIds, userId) {
  return Boolean(userId && blockedIds?.has(userId));
}

