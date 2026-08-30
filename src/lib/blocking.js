const BLOCK_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function getBlockedUserIds(prisma, userId) {
  if (!userId) return new Set();
  const since = new Date(Date.now() - BLOCK_DURATION_MS);
  const rows = await prisma.removedConnection.findMany({
    where: {
      createdAt: { gte: since },
      OR: [{ userId }, { targetId: userId }],
    },
    select: { userId: true, targetId: true },
  });
  return new Set(rows.map((row) => row.userId === userId ? row.targetId : row.userId));
}

export function isBlockedBy(blockedIds, userId) {
  return Boolean(userId && blockedIds?.has(userId));
}

export { BLOCK_DURATION_MS };
