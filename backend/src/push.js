import { getSessionUserId } from "./auth.js";
import { prisma } from "./db.js";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

async function userIdOr401(request, reply) { const userId = await getSessionUserId(request); if (!userId) reply.code(401).send({ error: "Non authentifie" }); return userId; }

function getFirebaseMessaging() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!serviceAccountJson && (!projectId || !clientEmail || !privateKey)) return null;
  try {
    const app = getApps()[0] || initializeApp({
      credential: serviceAccountJson ? cert(JSON.parse(serviceAccountJson)) : cert({ projectId, clientEmail, privateKey }),
    });
    return getMessaging(app);
  } catch {
    return null;
  }
}

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
  app.post("/v1/push/native-token", async (request, reply) => {
    const userId = await userIdOr401(request, reply); if (!userId) return;
    const token = typeof request.body?.token === "string" ? request.body.token.trim() : "";
    const platform = request.body?.platform === "ios" ? "ios" : "android";
    if (!token || token.length > 4096) return reply.code(400).send({ error: "Token natif invalide" });
    const existing = await prisma.nativePushToken.findUnique({ where: { token }, select: { id: true, userId: true } });
    if (existing && existing.userId !== userId) await prisma.nativePushToken.delete({ where: { id: existing.id } }).catch(() => {});
    await prisma.nativePushToken.upsert({ where: { token }, update: { userId, platform }, create: { userId, token, platform } });
    return reply.send({ ok: true });
  });
  app.delete("/v1/push/native-token", async (request, reply) => {
    const userId = await userIdOr401(request, reply); if (!userId) return;
    const token = typeof request.body?.token === "string" ? request.body.token.trim() : "";
    if (token) await prisma.nativePushToken.deleteMany({ where: { token, userId } });
    return reply.send({ ok: true });
  });
}

export async function sendNativePushNotification(userId, notification) {
  const messaging = getFirebaseMessaging();
  if (!messaging) return;
  const devices = await prisma.nativePushToken.findMany({ where: { userId }, select: { id: true, token: true } });
  if (!devices.length) return;
  const response = await messaging.sendEachForMulticast({
    tokens: devices.map((device) => device.token),
    notification: { title: notification.actor ? `LynoraLink - ${notification.actor}` : "LynoraLink", body: notification.text || notification.message || "Nouvelle notification" },
    data: { url: notification.url || "/feed?view=notifications", notificationId: String(notification.id || "") },
    android: { priority: "high", notification: { channelId: "lynoralink_default" } },
  });
  const invalidTokens = devices.filter((_, index) => response.responses[index]?.error?.code === "messaging/registration-token-not-registered").map((device) => device.token);
  if (invalidTokens.length) await prisma.nativePushToken.deleteMany({ where: { token: { in: invalidTokens } } });
}