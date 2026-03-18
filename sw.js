const CACHE = 'costadoro-v8';
const URLS = ['./', 'css/app.css', 'js/db.js?v=3', 'js/utils.js?v=3', 'js/app.js?v=3',
  'js/pages/route.js?v=3', 'js/pages/orders.js?v=3', 'js/pages/customers.js?v=3', 'js/pages/profile.js?v=3',
  'js/pages/reports.js?v=3', 'js/pages/settings.js?v=3', 'js/pages/catalog.js?v=3', 'js/pages/map.js?v=3',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put('./', clone)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
    return;
  }
  // Network-first for same-origin (JS/CSS) — always get fresh code when online
  const url = new URL(e.request.url);
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
    return;
  }
  // Cache-first for CDN resources (rarely change)
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
    return res;
  }).catch(() => caches.match('./'))));
});
