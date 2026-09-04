import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCompanyFollowers } from "@/lib/companyFollowers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  try {
    const userId = session.user.id;
    const setting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId, key: "companyPage" } },
    });
    let page = {};
    try { page = setting ? JSON.parse(setting.value) : {}; } catch { page = {}; }

    const [followers, posts, jobs, pagesCount] = await Promise.all([
      getCompanyFollowers(prisma, userId),
      prisma.post.count({ where: { companyPageId: userId, status: "published" } }),
      Promise.resolve(Array.isArray(page.jobs) ? page.jobs.length : 0),
      prisma.userSetting.count({ where: { userId, key: "companyPage" } }),
    ]);

    return NextResponse.json({
      stats: {
        pages: pagesCount,
        managedPages: pagesCount,
        followers: followers.length,
        posts,
        jobs,
        category: page.industry || page.category || "Non renseigné",
        pageName: page.name || page.displayName || "Ma page",
        updatedAt: setting?.updatedAt?.toISOString() || null,
      },
    });
  } catch (error) {
    console.error("company statistics", error);
    return NextResponse.json({ error: "Impossible de charger les statistiques." }, { status: 500 });
  }
}
