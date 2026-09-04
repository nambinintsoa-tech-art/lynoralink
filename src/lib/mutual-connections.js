export async function getMutualConnections(prisma, viewerId, candidateIds = []) {
  const uniqueCandidateIds = [...new Set(candidateIds.filter((id) => id && id !== viewerId))];
  if (!viewerId || !uniqueCandidateIds.length) return new Map();

  const relevantIds = [viewerId, ...uniqueCandidateIds];
  const rows = await prisma.connection.findMany({
    where: {
      status: "accepted",
      OR: [
        { userAId: { in: relevantIds } },
        { userBId: { in: relevantIds } },
      ],
    },
    select: { userAId: true, userBId: true },
  });

  const adjacency = new Map(relevantIds.map((id) => [id, new Set()]));
  for (const row of rows) {
    if (!adjacency.has(row.userAId)) adjacency.set(row.userAId, new Set());
    if (!adjacency.has(row.userBId)) adjacency.set(row.userBId, new Set());
    adjacency.get(row.userAId).add(row.userBId);
    adjacency.get(row.userBId).add(row.userAId);
  }

  const viewerConnections = adjacency.get(viewerId) || new Set();
  const mutualIds = new Map();
  const allMutualIds = new Set();
  for (const candidateId of uniqueCandidateIds) {
    const commonIds = [...(adjacency.get(candidateId) || [])].filter((id) => viewerConnections.has(id));
    mutualIds.set(candidateId, commonIds);
    commonIds.forEach((id) => allMutualIds.add(id));
  }

  const profiles = allMutualIds.size
    ? await prisma.user.findMany({
        where: { id: { in: [...allMutualIds] } },
        select: { id: true, image: true },
      })
    : [];
  const imageById = new Map(profiles.map((profile) => [profile.id, profile.image || null]));

  return new Map([...mutualIds].map(([candidateId, ids]) => ({
    candidateId,
    value: {
      mutual: ids.length,
      mutualAvatars: ids.slice(0, 2).map((id) => imageById.get(id)).filter(Boolean),
    },
  })).map(({ candidateId, value }) => [candidateId, value]));
}