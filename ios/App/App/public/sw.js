self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const title = data.title || (data.actor ? `LynoraLink - ${data.actor}` : "LynoraLink");
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || "Nouvelle notification",
    icon: data.icon || "/logo_lynora.svg",
    badge: "/notification-badge.svg",
    tag: data.id ? `lynoralink-${data.id}` : undefined,
    silent: false,
    renotify: true,
    data: { url: data.url || "/feed?view=notifications" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/feed?view=notifications", self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => "focus" in client);
    if (existing) {
      existing.navigate(targetUrl);
      return existing.focus();
    }
    return self.clients.openWindow(targetUrl);
  }));
});