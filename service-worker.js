// ----------------------------
// Campus Crush — New Service Worker
// Super clean, stable, fast
// ----------------------------

const CACHE_VERSION = "v2";
const CACHE_STATIC = `static-${CACHE_VERSION}`;
const CACHE_DYNAMIC = `dynamic-${CACHE_VERSION}`;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
];

// ----------------------------
// Install — Pre-cache static assets
// ----------------------------
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_STATIC).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );

  self.skipWaiting(); // Activate immediately
});

// ----------------------------
// Activate — Clear old caches
// ----------------------------
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_DYNAMIC)
          .map(k => caches.delete(k))
      );
    })
  );

  self.clients.claim(); // Take control of open pages
});

// ----------------------------
// Fetch Handler — Cache-first for static, network-first for others
// ----------------------------
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then(cachedRes => {
      if (cachedRes) return cachedRes;

      return fetch(event.request)
        .then(networkRes => {
          if (networkRes.ok) {
            caches.open(CACHE_DYNAMIC).then(cache => {
              cache.put(event.request, networkRes.clone());
            });
          }
          return networkRes;
        })
        .catch(() => {
          // Offline fallback for HTML pages
          if (event.request.headers.get("accept")?.includes("text/html")) {
            return caches.match("/index.html");
          }
        });
    })
  );
});

// ----------------------------
// Push Notifications
// ----------------------------
self.addEventListener("push", event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body || "Someone new just signed up 👀",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: { url: data.url || "/" }
  };

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Campus Crush",
      options
    )
  );
});

// ----------------------------
// Notification Click
// ----------------------------
self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(clientsArr => {
      // Focus if open
      for (const client of clientsArr) {
        if (client.url === "/" && "focus" in client) return client.focus();
      }
      // Otherwise open new tab
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
