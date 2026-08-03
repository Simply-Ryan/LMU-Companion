// ServiceWorker for LMU Telemetry Companion & DuckDB Offline PWA Support
const CACHE_NAME = 'lmu-telemetry-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/lmu_telemetry_bridge.py',
];

// Install Event - Pre-cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-while-revalidate strategy with WASM & DuckDB CDN caching
self.addEventListener('fetch', (event) => {
  // Handle cross-origin or CDN WASM requests (DuckDB / jsDelivr)
  const url = new URL(event.request.url);

  if (url.origin.includes('jsdelivr.net') || url.pathname.endsWith('.wasm') || url.pathname.endsWith('.worker.js')) {
    event.respondWith(
      caches.open('duckdb-wasm-cache').then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If offline and request failed, return fallback if available
          return cachedResponse || new Response('Offline resource unavailable', { status: 503 });
        }
      })
    );
    return;
  }

  // Default app assets - Cache First, then Network
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        // Fetch background update
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return response;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
