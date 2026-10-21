// Pass-through service worker. It exists only so the site meets the install criteria;
// it caches NOTHING: no precache, no runtime cache, no offline fallback.
//
// Why: a caching worker can serve stale JavaScript to returning visitors after a deploy,
// and this site has a live checkout. Caching, if it is ever added, must be a deliberate
// later change, and must never touch: /rest/v1/*, /functions/v1/*, api.sharmacoffeeworks.com,
// checkout.razorpay.com, or any auth/session request.

// Take over immediately, so a bad worker can always be replaced by the next deploy.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Belt and braces: this worker never creates caches, so delete any that exist.
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// The fetch handler is deliberately empty. Without event.respondWith(), the browser
// performs every request itself, exactly as if there were no worker: straight to the
// network, with normal HTTP caching. Nothing is intercepted, stored or rewritten.
self.addEventListener('fetch', () => {});
