// Hand-rolled service worker — runtime caching only, no precache manifest.
// See PLAN.md Phase 4 for the caching strategy rationale.
//
// Bump this when the caching logic itself changes (not on every content
// deploy — Next.js content-hashes _next/static filenames, so new question
// data/JS ships under new filenames automatically).
const CACHE_NAME = "study-loop-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }
  return response;
}

// Network-first: always try for a fresh response first (this is what lets a
// new deploy's HTML — which references new hashed chunk names — actually
// reach the user), falling back to the cache only when offline.
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build output — safe to cache forever, since a content change
  // means a new filename, never a stale hit.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Everything else (the page navigation, manifest, icons) — network-first
  // so new deploys are discovered, cache is purely the offline fallback.
  event.respondWith(networkFirst(request));
});
