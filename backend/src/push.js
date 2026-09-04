import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";

async function userIdOr401(request, reply) { const userId = await getSessionUserId(request); if (!userId) reply.code(401).send({ error: "Non authentifie" }); return userId; }

export async function registerPushRoutes(app) {
  app.get("/v1/push/vapid-public-key", async (request, reply) => {
    const key = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
    if (!key) return reply.code(503).send({ error: "Web Push non configure" });
    return reply.send({ publicKey: key });
  });
  app.post("/v1/push/subscribe", async (request, reply) => {
    const userId = await userIdOr401(request, reply); if (!userId) return;
    const subscription = request.body?.subscription;
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return reply.code(400).send({ error: "Souscription Push invalide" });
    const existing = await prisma.pushSubscription.findUnique({ where: { endpoint: subscription.endpoint }, select: { id: true, userId: true } });
    if (existing && existing.userId !== userId) await prisma.pushSubscription.delete({ where: { id: existing.id } }).catch(() => {});
    await prisma.pushSubscription.upsert({ where: { endpoint: subscription.endpoint }, update: { userId, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth }, create: { userId, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } });
    return reply.send({ ok: true });
  });
  app.delete("/v1/push/subscribe", async (request, reply) => {
    const userId = await userIdOr401(request, reply); if (!userId) return;
    if (request.body?.endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint: request.body.endpoint, userId } });
    return reply.send({ ok: true });
  });
}