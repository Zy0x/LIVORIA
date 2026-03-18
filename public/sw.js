/**
 * LIVORIA Service Worker v3.0
 * 
 * PERBAIKAN:
 * 1. Scope diperjelas
 * 2. Fetch handler lebih robust
 * 3. Cache strategy yang benar untuk SPA
 */

const CACHE_VERSION  = 'livoria-v3.0.0';
const STATIC_CACHE   = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE  = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE    = `${CACHE_VERSION}-images`;

// Asset statis yang WAJIB di-cache saat install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Installing LIVORIA Service Worker v3.0...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      // addAll dengan error handling — jangan gagal install hanya karena 1 asset
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' })).catch(err => {
            console.warn('[SW] Gagal cache:', url, err);
          })
        )
      );
    })
  );
  // Langsung aktifkan tanpa tunggu tab lama tutup
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating LIVORIA Service Worker v3.0...');
  event.waitUntil(
    Promise.all([
      // Hapus cache lama
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter(name =>
              name.startsWith('livoria-') &&
              name !== STATIC_CACHE &&
              name !== DYNAMIC_CACHE &&
              name !== IMAGE_CACHE
            )
            .map(name => {
              console.log('[SW] Hapus cache lama:', name);
              return caches.delete(name);
            })
        )
      ),
      // Ambil kontrol semua tab
      self.clients.claim(),
    ])
  );
});

// ── Fetch Strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Hanya handle GET
  if (request.method !== 'GET') return;

  // Skip request ke API eksternal — biarkan network menangani
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('api.jikan.moe') ||
    url.hostname.includes('graphql.anilist.co') ||
    url.hostname.includes('api.groq.com') ||
    url.hostname.includes('api.mymemory.translated.net')
  ) return;

  // Skip non-http(s)
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // ── Navigasi (HTML pages) → Network first, fallback ke /index.html ──
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then(cached => cached || caches.match('/'))
        )
    );
    return;
  }

  // ── Gambar → Cache first, lalu network ──
  if (
    request.destination === 'image' ||
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache =>
        cache.match(request).then(cached => {
          if (cached) return cached;
          return fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => new Response('', { status: 408 }));
        })
      )
    );
    return;
  }

  // ── JS/CSS/Font → Stale-while-revalidate ──
  if (
    url.pathname.match(/\.(js|css|woff2?|ttf|eot)$/i) ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(cache =>
        cache.match(request).then(cached => {
          const networkFetch = fetch(request).then(response => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          return cached || networkFetch;
        })
      )
    );
    return;
  }

  // ── Sisanya → Network first, fallback ke cache ──
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(request, clone);
            trimCache(DYNAMIC_CACHE, 60);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// ── Trim cache ────────────────────────────────────────────────────────────────
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    trimCache(cacheName, maxItems);
  }
}

// ── Background Sync ──────────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'livoria-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_COMPLETE', timestamp: Date.now() });
  });
}

// ── Push Notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'LIVORIA',
    body: 'Ada notifikasi baru',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
  };

  if (event.data) {
    try { data = { ...data, ...event.data.json() }; } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon,
      badge:   data.badge,
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' },
      actions: [
        { action: 'open',    title: 'Buka' },
        { action: 'dismiss', title: 'Tutup' },
      ],
      tag:              'livoria-notification',
      renotify:         true,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes(self.registration.scope));
      if (existing) {
        existing.focus();
        existing.navigate(url);
      } else {
        self.clients.openWindow(url);
      }
    })
  );
});

// ── Message Handler ───────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});

console.log('[SW] LIVORIA Service Worker v3.0 loaded ✓');