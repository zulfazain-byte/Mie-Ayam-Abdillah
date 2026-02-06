// sw.js - basic service worker for POS PWA
const CACHE_NAME = 'pos-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/enhancements.js',
  '/manifest.json',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE)).catch(err => console.error('Cache failed', err)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Network first for API calls, cache-first for static assets
  if (req.method !== 'GET') return;
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).then(resp => {
    caches.open(CACHE_NAME).then(cache => cache.put(req, resp.clone()));
    return resp.clone();
  }).catch(() => caches.match('/index.html'))));
});
