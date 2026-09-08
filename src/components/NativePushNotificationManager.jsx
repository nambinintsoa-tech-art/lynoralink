"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { LocalNotifications } from "@capacitor/local-notifications";
import { useSession } from "next-auth/react";
import { fetchBackendApi } from "@/lib/backend-api";

export default function NativePushNotificationManager() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated" || !Capacitor.isNativePlatform()) return undefined;

    let cancelled = false;
    let registrationHandle;
    let receivedHandle;
    let actionHandle;

    const setup = async () => {
      try {
        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === "prompt" || permission.receive === "prompt-with-rationale") {
          permission = await PushNotifications.requestPermissions();
        }
        if (cancelled || permission.receive !== "granted") return;

        await LocalNotifications.createChannel({
          id: "lynoralink_default",
          name: "Notifications LynoraLink",
          description: "Notifications et messages LynoraLink",
          importance: 5,
          visibility: 1,
        }).catch(() => {});

        registrationHandle = await PushNotifications.addListener("registration", async ({ value }) => {
          if (!value || cancelled) return;
          await fetchBackendApi("/api/push/native-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: value, platform: Capacitor.getPlatform() }),
          }).catch(() => {});
        });
        receivedHandle = await PushNotifications.addListener("pushNotificationReceived", async (notification) => {
          await LocalNotifications.schedule({
            notifications: [{
              id: Math.floor(Date.now() % 2147483647),
              title: notification.title || "LynoraLink",
              body: notification.body || "Nouvelle notification",
              channelId: "lynoralink_default",
              extra: notification.data || {},
            }],
          }).catch(() => {});
        });
        actionHandle = await PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
          const url = notification?.data?.url;
          if (url) window.location.assign(url);
        });
        await PushNotifications.addListener("registrationError", () => {});
        await PushNotifications.register();
      } catch {
        // Les notifications web restent disponibles si FCM n'est pas configuré.
      }
    };

    setup();
    return () => {
      cancelled = true;
      [registrationHandle, receivedHandle, actionHandle].forEach((handle) => handle?.remove());
    };
  }, [status]);

  return null;
}
