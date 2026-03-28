/**
 * LIVORIA Service Worker v4.0
 *
 * PERBAIKAN KOMPREHENSIF:
 * 1. Cache versioning yang tepat
 * 2. Navigation fallback yang benar untuk SPA
 * 3. Network-first untuk API calls
 * 4. Cache-first untuk static assets
 * 5. Stale-while-revalidate untuk konten
 * 6. Proper cleanup cache lama
 * 7. Cross-platform compatibility
 */

const CACHE_NAME    = 'livoria-v4.0.0';
const STATIC_CACHE  = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE   = `${CACHE_NAME}-images`;

// Assets yang WAJIB di-cache saat install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Domain yang TIDAK boleh di-cache (selalu fetch dari network)
const SKIP_CACHE_DOMAINS = [
  'supabase.co',
  'supabase.io',
  'api.jikan.moe',
  'graphql.anilist.co',
  'api.groq.com',
  'api.mymemory.translated.net',
  'fonts.googleapis.com',  // cache handled separately
  'cdnjs.cloudflare.com',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW v4] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      // Pre-cache satu per satu, jangan gagalkan install jika ada yang error
      const results = await Promise.allSettled(
        PRECACHE_ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0) {
        console.warn('[SW v4] Some assets failed to pre-cache:', failed.length);
      }
      return results;
    })
  );
  // Aktivasi langsung tanpa tunggu tab lama
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW v4] Activating...');
  event.waitUntil(
    Promise.all([
      // Hapus cache versi lama
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
              console.log('[SW v4] Removing old cache:', name);
              return caches.delete(name);
            })
        )
      ),
      // Ambil kontrol semua klien
      self.clients.claim(),
    ])
  );
});

// ── Helper: check if URL should skip cache ───────────────────────────────────
function shouldSkipCache(url) {
  return SKIP_CACHE_DOMAINS.some(domain => url.hostname.includes(domain));
}

// ── Helper: is static asset ──────────────────────────────────────────────────
function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|otf)$/i.test(url.pathname);
}

// ── Helper: is image ─────────────────────────────────────────────────────────
function isImage(url, request) {
  return (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico|avif)$/i.test(url.pathname)
  );
}

// ── Helper: is Google Font ───────────────────────────────────────────────────
function isGoogleFont(url) {
  return url.hostname.includes('fonts.googleapis.com') ||
         url.hostname.includes('fonts.gstatic.com');
}

// ── Fetch Strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: non-GET
  if (request.method !== 'GET') return;

  // Skip: non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Skip: external API calls (always network)
  if (shouldSkipCache(url)) return;

  // Chrome extension urls
  if (url.protocol === 'chrome-extension:') return;

  // ── Strategy 1: Navigation (HTML) → Network-first, fallback ke /index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          // Network gagal → serve cached version atau /index.html
          const cached = await caches.match(request);
          if (cached) return cached;
          const fallback = await caches.match('/index.html');
          if (fallback) return fallback;
          return caches.match('/');
        })
    );
    return;
  }

  // ── Strategy 2: Google Fonts → Cache-first (long TTL)
  if (isGoogleFont(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // ── Strategy 3: Images → Cache-first (stale-while-revalidate)
  if (isImage(url, request)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // Return cached, update in background
          fetch(request)
            .then(response => { if (response.ok) cache.put(request, response.clone()); })
            .catch(() => {});
          return cached;
        }
        // Not cached: fetch and cache
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            trimCache(IMAGE_CACHE, 100);
          }
          return response;
        } catch {
          return new Response('', { status: 408, statusText: 'Offline' });
        }
      })
    );
    return;
  }

  // ── Strategy 4: Static JS/CSS → Stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request).then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        });
        return cached || networkPromise;
      })
    );
    return;
  }

  // ── Strategy 5: Everything else → Network-first, fallback to cache
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
      .catch(async () => {
        const cached = await caches.match(request);
        return cached || new Response(
          JSON.stringify({ error: 'Offline', message: 'Tidak ada koneksi' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
  );
});

// ── Cache trimmer ─────────────────────────────────────────────────────────────
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map(key => cache.delete(key)));
  }
}

// ── Background Sync ───────────────────────────────────────────────────────────
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
    url: '/',
  };

  if (event.data) {
    try { Object.assign(data, event.data.json()); } catch {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    data.icon,
      badge:   data.badge,
      vibrate: [200, 100, 200],
      data:    { url: data.url },
      tag:     'livoria-notification',
      renotify: false,
      requireInteraction: false,
      actions: [
        { action: 'open',    title: 'Buka LIVORIA' },
        { action: 'dismiss', title: 'Tutup'         },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Fokus ke tab yang sudah ada jika ada
        const existing = clients.find(c =>
          c.url.startsWith(self.registration.scope)
        );
        if (existing) {
          existing.focus();
          existing.navigate(targetUrl);
        } else {
          self.clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Message Handler ────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { data, ports } = event;

  if (data?.type === 'SKIP_WAITING') {
    console.log('[SW v4] Skip waiting - applying update');
    self.skipWaiting();
  }

  if (data?.type === 'GET_VERSION') {
    ports?.[0]?.postMessage({ version: CACHE_NAME });
  }

  if (data?.type === 'CLEAR_CACHE') {
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => ports?.[0]?.postMessage({ success: true }));
  }
});

console.log('[SW v4] LIVORIA Service Worker v4.0 loaded ✓');