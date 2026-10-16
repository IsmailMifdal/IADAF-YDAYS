// IA-DAF service worker: makes the site installable and shows an offline
// page when the network is gone.
//
// It deliberately caches nothing personal — no HTML page, no API response,
// only the offline page itself. A cached dossier or document would otherwise
// outlive sign-out on a shared phone. Build assets need nothing from here:
// they are content-hashed and kept by the browser's own cache.

const CACHE = "iadaf-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      // Lets the page load start while the worker boots, instead of after.
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        return (await event.preloadResponse) || (await fetch(event.request));
      } catch {
        // Network failure only: an HTTP error page is still shown as is.
        return (await caches.match(OFFLINE_URL)) || Response.error();
      }
    })(),
  );
});
