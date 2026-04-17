/* Service worker mínimo para PWA (instalable en Chrome/Android)
 * Bump este comentario/fecha cuando cambien JS/CSS críticos (2026-01-17). */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
