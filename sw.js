const CACHE_NAME = 'rodeo-bull-v1.0.0';
const urlsToCache = [
  '/manifest.json',
  '/style.css',           // voeg je eigen statische assets toe
  '/sync-client.js',
  '/socket.io.min.js',
  // let op: geen index.html hier!
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('♻️ Cleaning old caches...');
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      )
    )
  );
});

// Fetch event - special treatment for index.html
self.addEventListener('fetch', event => {
  const request = event.request;

  // Force network for index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html');
      })
    );
    return;
  }

  // Normal cache-first strategy
  event.respondWith(
    caches.match(request).then(response => {
      return response || fetch(request);
    })
  );
});
