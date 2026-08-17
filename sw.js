// Service Worker: macht das Spiel offline-fähig und installierbar.
//
// Bewusst NETWORK-FIRST: solange am Handy entwickelt wird, muss ein Reload
// nach dem Push sofort die neue Version zeigen. Der Cache ist nur das
// Sicherheitsnetz für Funkloch/Flugmodus.

const CACHE = 'tiefenschacht-v1';

const PRECACHE = [
  './',
  './index.html',
  './styles.css',
  './manifest.webmanifest',
  './assets/icon.svg',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './src/main.js',
  './src/core/state.js',
  './src/core/balance.js',
  './src/core/engine.js',
  './src/core/actions.js',
  './src/data/layers.js',
  './src/data/miners.js',
  './src/data/upgrades.js',
  './src/ui/ui.js',
  './src/util/format.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll bricht ab, sobald eine Datei fehlt — deshalb einzeln.
      .then((cache) => Promise.all(PRECACHE.map((url) => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        return response;
      })
      .catch(() =>
        caches.match(request).then((hit) => hit || caches.match('./index.html'))
      )
  );
});
