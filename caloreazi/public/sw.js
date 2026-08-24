const CACHE = "caloreazi-shell-v1.18.5";
const SHELL = ["./", "manifest.webmanifest", "caloreazi-wordmark-transparent.png", "caloreazi-pwa-mark-192-v3.png", "caloreazi-pwa-mark-512-v3.png", "category-vegetables-v1.png", "category-fruits-v1.png", "category-drinks-v1.png", "food-sprite-vegetables-v3.webp", "food-sprite-fruits-v3.webp", "food-sprite-drinks-v3.webp"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).pathname.includes("/api/")) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) caches.open(CACHE).then((cache) => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("./"))));
});

self.addEventListener("push", (event) => {
  let message = {};
  try { message = event.data?.json() || {}; } catch { message = { body: event.data?.text() || "יש לך עדכון חדש" }; }
  event.waitUntil(self.registration.showNotification(message.title || "עדכון אישי", {
    body: message.body || "יש לך עדכון חדש",
    icon: "caloreazi-pwa-mark-192-v3.png",
    badge: "caloreazi-pwa-mark-192-v3.png",
    tag: message.tag || "caloreazi-update",
    data: { url: message.url || "./" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
    const existing = clients.find((client) => client.url.startsWith(self.registration.scope));
    if (existing) return existing.focus();
    return self.clients.openWindow(target);
  }));
});
