import webpush from "web-push";
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

export async function sendPushNotification(userId, notification) {
  if (!userId || !configureWebPush()) return;

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