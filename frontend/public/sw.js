/* ══════════════════════════════════════════════════
   BetWise Service Worker — Cache stratégique
   ══════════════════════════════════════════════════ */

const CACHE_NAME   = 'betwise-v1';
const STATIC_CACHE = 'betwise-static-v1';

// Ressources à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// ── Install ─────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && k !== STATIC_CACHE)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ───────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ne pas intercepter les requêtes API — toujours réseau
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    return; // réseau direct
  }

  // Stratégie : Network First pour les pages, Cache First pour les assets statiques
  if (request.destination === 'document') {
    // Navigation : réseau d'abord, fallback cache
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/'))
    );
  } else if (['script', 'style', 'image', 'font'].includes(request.destination)) {
    // Assets : cache d'abord, puis réseau
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
  }
});
