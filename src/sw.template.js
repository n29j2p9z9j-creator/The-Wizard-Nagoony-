/* Service Worker – wird von build.js nach public/sw.js geschrieben (__VERSION__ = Hash des Builds).
   Strategie: Netzwerk zuerst, bei Offline aus dem Cache. So sieht man nach einem Deploy sofort die neue Version. */
const CACHE = 'nagoony-__VERSION__';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'manifest.webmanifest', 'assets/music.mp3', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || r.headers.has('range') || new URL(r.url).origin !== location.origin) return;
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }))
  );
});
