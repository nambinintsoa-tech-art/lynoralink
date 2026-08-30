export async function getCompanyFollowers(prisma, companyPageId) {
  const settings = await prisma.userSetting.findMany({
    where: { key: "followedCompanyPages" },
    select: { userId: true, value: true },
  });
  const followerIds = [];
  for (const setting of settings) {
    try {
      const followedPages = JSON.parse(setting.value || "[]");
      if (Array.isArray(followedPages) && followedPages.some((id) => String(id) === String(companyPageId))) followerIds.push(setting.userId);
    } catch {}
  }
  if (!followerIds.length) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: followerIds } },
    select: { id: true, name: true, email: true, image: true },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));
  return followerIds.map((id) => usersById.get(id)).filter(Boolean).map((user) => ({
    id: user.id,
    name: user.name || user.email || "Abonné",
    email: user.email,
    image: user.image || null,
  }));
}
