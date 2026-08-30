import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function initials(name = "") {
  return name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase()).join("") || "EP";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const settings = await prisma.userSetting.findMany({
    where: { key: "companyPage" },
    select: { userId: true, value: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: settings.map((setting) => setting.userId) } },
    select: { id: true, createdAt: true, status: true, _count: { select: { posts: true } } },
  });
  const usersById = new Map(users.map((user) => [user.id, user]));

  const pages = settings.flatMap((setting) => {
    const user = usersById.get(setting.userId);
    if (!user) return [];
    let page;
    try { page = JSON.parse(setting.value); } catch { return []; }
    if (!page || typeof page !== "object") return [];

    const name = String(page.name || page.displayName || "Page entreprise");
    return [{
      id: user.id,
      ownerId: user.id,
      name,
      initials: initials(name),
      category: page.industry || page.category || "Entreprise",
      followers: Number(page.stats?.followers || page.followers || 0),
      postsCount: Number(page.stats?.posts || user._count.posts || 0),
      status: user.status === "active" ? "active" : "pending",
      verified: Boolean(page.verified),
      logoUrl: page.logoUrl || page.avatarUrl || null,
      coverUrl: page.bannerUrl || page.coverUrl || null,
      createdAt: page.createdAt || user.createdAt.toISOString(),
    }];
  });

  return NextResponse.json({ pages });
}
