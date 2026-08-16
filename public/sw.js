/* Bärenwald Portal PWA — Push + offline shell (minimal) */
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {
    title: "",
    body: "Neue Benachrichtigung",
    url: "/portal",
    tag: "baerenwald",
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data.body = text;
    } catch {
      /* ignore */
    }
  }

  // Gleicher Text wie Manifest-Name → Safari: „Bärenwald from Bärenwald“.
  // Leer = nur der PWA-Name (wie beim Hinzufügen zur Startseite).
  let title = String(data.title || "").trim();
  if (!title || /^bärenwald$/i.test(title) || /^bw partner$/i.test(title)) {
    title = "";
  }
  const body = String(data.body || "").trim() || "Neue Benachrichtigung";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/logo-mark-green.png",
      badge: "/logo-mark-green.png",
      tag: data.tag || "baerenwald",
      data: { url: data.url || "/portal" },
      renotify: true,
      lang: "de",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data?.url || "/portal";
  const target = new URL(raw, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of all) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(target);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(target);
      }
    })()
  );
});
