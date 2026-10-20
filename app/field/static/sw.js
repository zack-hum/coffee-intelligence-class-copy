/* Field mode service worker: keeps the app shell on the phone so it opens with no signal.
   Data never goes through this cache — the page keeps records in IndexedDB and talks to
   /api/crm itself. Bump VERSION whenever a shell file changes. */
const VERSION = 'field-v2';
const SHELL = ['/field/', '/field/static/field.js', '/field/static/field.css', '/field/manifest.webmanifest',
  '/field/static/icon-180.png', '/field/static/icon-192.png', '/field/static/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  if (e.request.mode === 'navigate') {
    // Network first so updates arrive when there's signal; the cached shell when there isn't,
    // or when a weak farm signal hasn't answered within 3 seconds.
    const net = fetch(e.request).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(VERSION).then(c => c.put('/field/', copy)); }
      return r;
    });
    const slow = new Promise(res => setTimeout(res, 3000)).then(() => caches.match('/field/'));
    e.respondWith(Promise.race([net.catch(() => caches.match('/field/')), slow])
      .then(r => r || net));
    return;
  }
  if (SHELL.includes(url.pathname)) {
    // Stale-while-revalidate: instant from cache, refreshed in the background.
    e.respondWith(caches.open(VERSION).then(async c => {
      const hit = await c.match(e.request);
      const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
