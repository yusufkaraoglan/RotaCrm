const CACHE = 'costadoro-v9';
const URLS = ['./', 'css/app.css', 'js/db.js?v=4', 'js/utils.js?v=4', 'js/app.js?v=4',
  'js/pages/route.js?v=4', 'js/pages/orders.js?v=4', 'js/pages/customers.js?v=4', 'js/pages/profile.js?v=4',
  'js/pages/reports.js?v=4', 'js/pages/settings.js?v=4', 'js/pages/catalog.js?v=4', 'js/pages/map.js?v=4',
  'js/pages/neworder.js?v=4',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(URLS)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // NEVER cache Supabase API calls — always go to network
  if (url.hostname.includes('supabase')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', {
      status: 503, headers: { 'Content-Type': 'application/json' }
    })));
    return;
  }
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put('./', clone)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
    return;
  }
  // Network-first for same-origin (JS/CSS) — always get fresh code when online
  if (url.origin === self.location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match('./'))));
    return;
  }
  // Cache-first for CDN resources only (leaflet, xlsx — rarely change)
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).then(res => {
    if (res.ok) { const clone = res.clone(); caches.open(CACHE).then(c => c.put(e.request, clone)); }
    return res;
  }).catch(() => caches.match('./'))));
});
