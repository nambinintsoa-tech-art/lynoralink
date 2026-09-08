import webpush from "web-push";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";
import { prisma } from "@/lib/prisma";

let vapidConfigured = false;

function configureWebPush() {
  if (vapidConfigured) return true;
  const subject = process.env.WEB_PUSH_EMAIL;
  const publicKey = process.env.NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY;
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY;
  if (!subject || !publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

function getFirebaseMessaging() {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!serviceAccountJson && (!projectId || !clientEmail || !privateKey)) return null;

  try {
    const app = getApps()[0] || initializeApp({
      credential: serviceAccountJson
        ? cert(JSON.parse(serviceAccountJson))
        : cert({ projectId, clientEmail, privateKey }),
    });
    return getMessaging(app);
  } catch {
    return null;
  }
}

async function sendNativePushNotification(userId, notification) {
  const messaging = getFirebaseMessaging();
  if (!messaging || !userId) return;

  const devices = await prisma.nativePushToken.findMany({
    where: { userId },
    select: { id: true, token: true },
  });
  if (!devices.length) return;

  const meta = typeof notification.meta === "string" ? JSON.parse(notification.meta || "{}") : (notification.meta || {});
  const url = notification.type === "connection"
    ? `/feed?view=network&tab=${meta.kind === "accepted" ? "connections" : "invitations"}`
    : (notification.url || "/feed?view=notifications");
  const title = notification.actor ? `LynoraLink - ${notification.actor}` : (notification.title || "LynoraLink");
  const response = await messaging.sendEachForMulticast({
    tokens: devices.map((device) => device.token),
    notification: { title, body: notification.text || "Nouvelle notification" },
    data: { url, notificationId: String(notification.id || "") },
    android: { priority: "high", notification: { channelId: "lynoralink_default" } },
  });

  const invalidTokens = devices
    .filter((_, index) => response.responses[index]?.error?.code === "messaging/registration-token-not-registered")
    .map((device) => device.token);
  if (invalidTokens.length) {
    await prisma.nativePushToken.deleteMany({ where: { token: { in: invalidTokens } } });
  }
}

export async function sendPushNotification(userId, notification) {
  if (!userId) return;

  await sendNativePushNotification(userId, notification).catch(() => {});
  if (!configureWebPush()) return;

  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  let meta = {};
  try {
    meta = notification.meta ? JSON.parse(notification.meta) : {};
  } catch {}
  const url = notification.type === "connection"
    ? `/feed?view=network&tab=${meta.kind === "accepted" ? "connections" : "invitations"}`
    : (notification.url || "/feed?view=notifications");
  const payload = JSON.stringify({
    id: notification.id,
    actor: notification.actor,
    title: notification.actor ? `LynoraLink - ${notification.actor}` : (notification.title || "LynoraLink"),
    body: notification.text,
    icon: "/logo_lynora.svg",
    url,
  });

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload);
    } catch (error) {
      if (error.statusCode === 404 || error.statusCode === 410) {
        await prisma.pushSubscription.delete({ where: { id: subscription.id } }).catch(() => {});
      }
    }
  }));
}