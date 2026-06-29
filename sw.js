const CACHE = 'pakistan-games-v3';
const STATIC = ['/', '/manifest.json', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    fetch(e.request).then(res => {
      if (res.status === 200 && e.request.url.includes(self.location.origin)) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }).catch(() =>
      caches.match(e.request).then(cached =>
        cached || (e.request.mode === 'navigate' ? caches.match('/') : new Response('Offline', { status: 503 }))
      )
    )
  );
});

self.addEventListener('push', e => {
  if (!e.data) return;
  let d = {};
  try { d = e.data.json(); } catch(e) {}
  self.registration.showNotification(d.title || 'Pakistan Games', {
    body: d.body || 'New update available',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  });
});