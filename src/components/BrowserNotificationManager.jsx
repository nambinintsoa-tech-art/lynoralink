"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { fetchBackendApi } from "@/lib/backend-api";

const POLL_INTERVAL = 20000;
const MAX_SEEN_IDS = 200;

function remember(set, id) {
  if (!id) return;
  set.add(String(id));
  if (set.size > MAX_SEEN_IDS) {
    const first = set.values().next().value;
    set.delete(first);
  }
}

function showBrowserNotification({ title, body, icon, url }) {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") return;
  const notification = new Notification(title, { body, icon: icon || "/logo_lynora.svg", tag: `lynoralink-${url || "notification"}` });
  notification.onclick = () => {
    window.focus();
    if (url) window.location.assign(url);
    notification.close();
  };
}

function latestIncomingMessages(data) {
  return (Array.isArray(data?.conversations) ? data.conversations : []).flatMap((conversation) => {
    const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
    return messages.filter((message) => message.from === "them").slice(-1).map((message) => ({
      id: message.id,
      text: message.text || "Vous avez reçu un nouveau message.",
      actor: conversation.name || "Nouveau message",
    }));
  });
}

export default function BrowserNotificationManager() {
  const { status } = useSession();
  const seenNotifications = useRef(new Set());
  const seenMessages = useRef(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (status !== "authenticated") {
      initialized.current = false;
      seenNotifications.current.clear();
      seenMessages.current.clear();
      return undefined;
    }

    let cancelled = false;
    const poll = async () => {
      const [notificationsResponse, messagesResponse] = await Promise.all([
        fetchBackendApi("/api/notifications", { cache: "no-store" }).catch(() => null),
        fetchBackendApi("/api/messages", { cache: "no-store" }).catch(() => null),
      ]);
      if (cancelled) return;

      const notificationsData = notificationsResponse?.ok ? await notificationsResponse.json().catch(() => ({})) : {};
      const messagesData = messagesResponse?.ok ? await messagesResponse.json().catch(() => ({})) : {};
      const notifications = Array.isArray(notificationsData.notifications) ? notificationsData.notifications : [];
      const messages = latestIncomingMessages(messagesData);

      if (!initialized.current) {
        notifications.forEach((item) => remember(seenNotifications.current, item.id));
        messages.forEach((item) => remember(seenMessages.current, item.id));
        initialized.current = true;
        return;
      }

      notifications.filter((item) => !item.read && !seenNotifications.current.has(String(item.id))).forEach((item) => {
        remember(seenNotifications.current, item.id);
        showBrowserNotification({
          title: item.actor ? `LynoraLink - ${item.actor}` : "LynoraLink",
          body: item.text || item.message || "Nouvelle notification",
          icon: item.avatarUrl || "/logo_lynora.svg",
          url: "/feed?view=notifications",
        });
      });

      messages.filter((item) => !seenMessages.current.has(String(item.id))).forEach((item) => {
        remember(seenMessages.current, item.id);
        showBrowserNotification({ title: item.actor, body: item.text, icon: "/logo_lynora.svg", url: "/feed?view=messages" });
      });
    };

    poll();
    const interval = window.setInterval(poll, POLL_INTERVAL);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [status]);

  return null;
}
