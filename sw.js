/* Pakistan Games — Service Worker v2 */
'use strict';

var CACHE_NAME = 'pakistan-games-v2';
var SHELL = [
  '/',
  '/index.html',
  '/manifest.json'
];

/* ===== INSTALL: cache app shell ===== */
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

/* ===== ACTIVATE: purge old caches ===== */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* ===== FETCH: single unified handler =====
   Strategy:
   - Navigation (HTML pages): network-first with cache fallback
   - Same-origin assets + Google Fonts: stale-while-revalidate
   - Everything else: passthrough (no respondWith)
*/
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  var url = new URL(req.url);
  var isSameOrigin = url.origin === self.location.origin;
  var isFonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  // Skip cross-origin requests except Google Fonts
  if (!isSameOrigin && !isFonts) return;

  // Navigation requests: network-first, fallback to cached shell
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(function(response) {
        if (response && response.status === 200) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(req, response.clone());
          });
        }
        return response;
      }).catch(function() {
        return caches.match('/index.html').then(function(cached) {
          return cached || Response.error();
        });
      })
    );
    return;
  }

  // Static assets & fonts: stale-while-revalidate
  e.respondWith(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.match(req).then(function(cached) {
        var networkFetch = fetch(req).then(function(response) {
          if (response && response.status === 200) {
            cache.put(req, response.clone());
          }
          return response;
        }).catch(function() {
          return cached || Response.error();
        });

        // Return cached immediately if available; update cache in background
        return cached || networkFetch;
      });
    })
  );
});
