import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const ACTIVE_STATUSES = new Set(["ACTIVE", "TRIALING"]);

function hasActiveSubscription(subscription) {
  return Boolean(subscription && ACTIVE_STATUSES.has(subscription.status)
    && !(subscription.currentPeriodEnd && subscription.currentPeriodEnd <= new Date()));
}

export async function registerSubscriptionRoutes(app) {
  app.get("/v1/subscription", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.send({ plan: "free", isAdmin: false, status: "FREE", expired: false, currentPeriodEnd: null, canManage: false });
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true, email: true, subscription: { select: { status: true, currentPeriodEnd: true, stripeCustomerId: true } } } });
    if (!user) return reply.send({ plan: "free", isAdmin: false, status: "FREE", expired: false, currentPeriodEnd: null, canManage: false });
    const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL;
    const isAdmin = user.role === "admin" || Boolean(adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase());
    const expired = Boolean(user.subscription?.currentPeriodEnd && user.subscription.currentPeriodEnd <= new Date());
    return reply.send({ plan: isAdmin || hasActiveSubscription(user.subscription) ? "premium" : "free", isAdmin, status: user.subscription?.status || "FREE", expired, currentPeriodEnd: user.subscription?.currentPeriodEnd || null, canManage: Boolean(user.subscription?.stripeCustomerId) });
  });
}