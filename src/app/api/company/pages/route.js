import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasActiveSubscription } from "@/lib/subscription";
import { getCompanyFollowers } from "@/lib/companyFollowers";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
  }

  const settings = await prisma.userSetting.findMany({
    where: { key: "companyPage", userId: { not: session.user.id } },
    select: {
      userId: true,
      value: true,
      updatedAt: true,
      user: { select: { subscription: { select: { status: true, currentPeriodEnd: true } }, role: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const followedSetting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId: session.user.id, key: "followedCompanyPages" } },
  });
  let followedPages = [];
  try { followedPages = JSON.parse(followedSetting?.value || "[]"); } catch { followedPages = []; }
  if (!Array.isArray(followedPages)) followedPages = [];

  const pages = (await Promise.all(settings.map(async (setting) => {
    try {
      const page = JSON.parse(setting.value);
      if (!page || typeof page !== "object") return [];
      const name = String(page.name || page.displayName || "Mon entreprise").trim();
      const subscribers = await getCompanyFollowers(prisma, setting.userId);
      return [{
        ...page,
        id: setting.userId,
        name,
        displayName: name,
        followed: followedPages.includes(setting.userId),
        isPremium: hasActiveSubscription(setting.user.subscription),
        isPlatformAdmin: setting.user?.role === "admin",
        subscribers,
        stats: { ...(page.stats || {}), followers: subscribers.length },
      }];
    } catch {
      return [];
    }
  }))).flat();

  return NextResponse.json({ pages });
}
