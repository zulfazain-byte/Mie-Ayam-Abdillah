const CACHE_NAME = 'kasir-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  // tambahkan file lain jika perlu, misal gambar ikon
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
