import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

const STATUS_MAP = { active: "ACTIVE", canceled: "CANCELED", past_due: "PAST_DUE", incomplete: "INCOMPLETE", incomplete_expired: "CANCELED", trialing: "TRIALING", unpaid: "PAST_DUE" };
const stripeGet = async (path) => {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe n'est pas configure sur ce serveur.");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` } });
  const value = await response.json();
  if (!response.ok) { const error = new Error(value.error?.message || "Requete Stripe refusee"); error.code = value.error?.code; throw error; }
  return value;
};
function periodEnd(subscription) { const timestamp = Number(subscription?.current_period_end ?? subscription?.items?.data?.[0]?.current_period_end); return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : null; }

export async function registerStripeSyncRoutes(app) {
  app.post("/v1/stripe/sync", async (request, reply) => {
    const userId = await getSessionUserId(request);
    if (!userId) return reply.code(401).send({ error: "Non authentifie" });
    const sessionId = request.body?.sessionId;
    if (!sessionId || typeof sessionId !== "string") return reply.code(400).send({ error: "Session Stripe manquante" });
    try {
      let checkoutSession;
      try { checkoutSession = await stripeGet(`checkout/sessions/${encodeURIComponent(sessionId)}?expand[]=subscription`); } catch (error) {
        if (error.code !== "resource_missing") throw error;
        const local = await prisma.subscription.findUnique({ where: { userId }, select: { stripeCustomerId: true } });
        if (local?.stripeCustomerId) {
          const subscriptions = await stripeGet(`subscriptions?customer=${encodeURIComponent(local.stripeCustomerId)}&status=all&limit=10`);
          const latest = subscriptions.data?.sort((first, second) => second.created - first.created)[0];
          if (latest) checkoutSession = { metadata: { userId }, mode: "subscription", customer: local.stripeCustomerId, subscription: latest };
        }
      }
      if (!checkoutSession || checkoutSession.metadata?.userId !== userId || checkoutSession.mode !== "subscription") return reply.code(403).send({ error: "Session Stripe invalide" });
      const subscription = typeof checkoutSession.subscription === "object" ? checkoutSession.subscription : await stripeGet(`subscriptions/${encodeURIComponent(checkoutSession.subscription)}`);
      if (!subscription?.id) return reply.code(409).send({ error: "Abonnement Stripe indisponible" });
      const status = STATUS_MAP[subscription.status] || "INCOMPLETE";
      const data = { stripeCustomerId: typeof checkoutSession.customer === "string" ? checkoutSession.customer : checkoutSession.customer?.id, stripeSubscriptionId: subscription.id, stripePriceId: subscription.items?.data?.[0]?.price?.id, status, currentPeriodEnd: periodEnd(subscription) };
      await prisma.subscription.upsert({ where: { userId }, update: data, create: { userId, ...data } });
      await prisma.user.update({ where: { id: userId }, data: { plan: ["ACTIVE", "TRIALING"].includes(status) ? "PREMIUM" : "FREE" } });
      return reply.send({ synced: true, status });
    } catch (error) {
      request.log.error(error, "Erreur synchronisation abonnement Stripe");
      return reply.code(502).send({ error: process.env.NODE_ENV === "development" ? error.message : "Impossible de synchroniser l'abonnement Stripe" });
    }
  });
}