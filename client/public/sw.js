const CACHE_NAME = 'tutorbridge-v2';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/favicon.png',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

// API routes to cache with network-first strategy (fallback to cache when offline)
const CACHEABLE_APIS = [
  '/api/classes/my/enrolled',
  '/api/public/stats',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // WebSocket — skip
  if (url.pathname.startsWith('/ws')) return;

  // Cacheable API endpoints: network-first, cache fallback
  if (CACHEABLE_APIS.some((p) => url.pathname === p)) {
    event.respondWith(
      fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
        }
        return res;
      }).catch(() => caches.match(request))
    );
    return;
  }

  // Other API calls: network-only, never cache
  if (url.pathname.startsWith('/api/')) return;

  // Static assets (JS, CSS, images, fonts): cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/)) {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached || fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
      )
    );
    return;
  }

  // HTML navigation: network-first, offline fallback
  event.respondWith(
    fetch(request).catch(() =>
      caches.match('/offline.html').then((r) => r || new Response('Offline'))
    )
  );
});
