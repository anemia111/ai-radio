const VERSION = 'ai-radio-v1'
self.addEventListener('install', (event) => { event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(['./', './manifest.webmanifest', './favicon.svg']))); self.skipWaiting() })
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))); self.clients.claim() })
self.addEventListener('fetch', (event) => { if (event.request.method !== 'GET') return; event.respondWith(fetch(event.request).then((response) => { const copy = response.clone(); caches.open(VERSION).then((cache) => cache.put(event.request, copy)); return response }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./')))) })
