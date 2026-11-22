// Service worker do Karaoke Míque: mostra os avisos (sua vez, próximo, votação)
// mesmo com o celular bloqueado e abre a sala ao tocar na notificação.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Karaoke Míque", body: event.data && event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Karaoke Míque", {
      body: data.body || "",
      tag: data.tag,
      renotify: true,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-96.png",
      vibrate: [300, 120, 300, 120, 300],
      data: { url: data.url || "/" },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin)
    .href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windows) => {
        for (const w of windows)
          if (w.url.startsWith(url) && "focus" in w) return w.focus();
        return self.clients.openWindow(url);
      }),
  );
});
