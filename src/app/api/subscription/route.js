import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubscriptionAccess } from "@/lib/subscription";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({
      plan: "free",
      isAdmin: false,
      status: "FREE",
      expired: false,
      currentPeriodEnd: null,
      canManage: false,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({
      plan: "free",
      isAdmin: false,
      status: "FREE",
      expired: false,
      currentPeriodEnd: null,
      canManage: false,
    });
  }

  const access = await getSubscriptionAccess(user.id);

  return NextResponse.json({
    plan: access.isPremium ? "premium" : "free",
    isAdmin: access.isAdmin,
    status: access.status,
    expired: access.expired,
    currentPeriodEnd: access.currentPeriodEnd,
    canManage: access.canManage,
  });
}
