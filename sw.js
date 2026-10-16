importScripts('./version.js');
const CACHE = 'noobhammer40k-' + APP_VERSION;
const ASSETS = ['./', './index.html', './style.css', './engine.js', './effects.js', './data.js', './importer.js', './alnpdf.js', './wahapedia.js', './kwfilter.js', './pdfexport.js', './sync-config.js', './rules11.js', './data/wahapedia/index.js', './version.js', './lib/pdf.classic.js', './lib/pdf.worker.classic.js', './app.js', './manifest.webmanifest',
  './icons/accueil.jpg', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
});
self.addEventListener('message', (e) => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  /* Réseau d'abord (toujours la dernière version en ligne), cache en secours hors connexion. */
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then((res) => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {}); }
      return res;
    }).catch(() => caches.match(e.request).then((hit) => hit || caches.match('./index.html')))
  );
});
