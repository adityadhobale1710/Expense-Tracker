const CACHE_NAME = 'my-expense-pro-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
];

// Install Event: cache static root files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: clear old cache
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
    })
  );
  self.clients.claim();
});

// Fetch Event: handle routing, bypass APIs, and use stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass API requests, non-GET methods, and external origins
  if (
    url.pathname.includes('/api/') ||
    request.method !== 'GET' ||
    !request.url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache validation (stale-while-revalidate)
        fetch(request)
          .then((freshResponse) => {
            if (freshResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, freshResponse));
            }
          })
          .catch(() => {
            /* Ignore network connectivity issues during background update */
          });
        return cachedResponse;
      }

      // Network first strategy for dynamic application bundle pages/chunks
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If offline and navigating to route pages, fallback to main SPA document
          if (request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
