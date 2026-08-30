import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  const requestedUserId = req.nextUrl.searchParams.get("userId");
  const userId = requestedUserId || session?.user?.id;

  if (!userId || (!session?.user?.id && !requestedUserId)) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  startDate.setFullYear(startDate.getFullYear() - 1);

  const activitySetting = await prisma.userSetting.findUnique({ where: { userId_key: { userId, key: "showActivity" } }, select: { value: true } });
  if (userId !== session?.user?.id && activitySetting?.value === "false") {
    return NextResponse.json({ activity: [] });
  }

  const posts = await prisma.post.findMany({
    where: { authorId: userId, status: "published", createdAt: { gte: startDate } },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });
  const activity = posts.reduce((result, post) => {
    const day = post.createdAt.toISOString().slice(0, 10);
    result[day] = (result[day] || 0) + 1;
    return result;
  }, {});

  return NextResponse.json({ activity: Object.entries(activity).map(([day, count]) => ({ day, count })) });
}