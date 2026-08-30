import { prisma } from "@/lib/prisma";

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);

export function hasActiveSubscription(subscription) {
  return Boolean(
    subscription &&
    ACTIVE_STATUSES.has(subscription.status) &&
    !(subscription.currentPeriodEnd && subscription.currentPeriodEnd <= new Date())
  );
}

export async function getSubscriptionAccess(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      email: true,
      subscription: {
        select: {
          status: true,
          currentPeriodEnd: true,
          stripeCustomerId: true,
        },
      },
    },
  });

  const subscription = user?.subscription;
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL?.toLowerCase();
  const isAdmin = user?.role === "admin" || Boolean(adminEmail && user?.email?.toLowerCase() === adminEmail);

  const periodExpired = Boolean(
    subscription?.currentPeriodEnd && subscription.currentPeriodEnd <= new Date()
  );
  const isPremium = isAdmin || hasActiveSubscription(subscription);

  return {
    isPremium,
    isAdmin,
    expired: periodExpired,
    status: subscription?.status ?? "FREE",
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
    canManage: Boolean(subscription?.stripeCustomerId),
  };
}
