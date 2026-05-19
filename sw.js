/* Treumarkt Kasa — basit cache-first service worker
 * Strateji: kendi dosyalarımız + Tailwind CDN'i kuruluşta cache'le,
 *           sonrasında network'e değil cache'e bak. SW versiyonu artırıldığında
 *           eski cache temizlenir, böylece güncellemeler hızlı yayılır.
 */
const CACHE = 'treumarkt-kasa-v3';
const PRECACHE = [
  './manifest.webmanifest',
  'https://cdn.tailwindcss.com',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Strateji:
//   - HTML (uygulama kabuğu)  → network-first, fallback cache  → deploy'lar anında gelir
//   - CDN / static assets     → cache-first, network'ten arka planda yenile
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(hit => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.ok && (url.origin === self.location.origin || url.host === 'cdn.tailwindcss.com')) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => hit);
      return hit || fetchPromise;
    })
  );
});
