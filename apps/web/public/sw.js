/**
 * LIVORIA Service Worker v4.3
 *
 * PERBAIKAN KOMPREHENSIF:
 * 1. Cache versioning yang tepat
 * 2. Navigation fallback yang benar untuk SPA
 * 3. Network-first untuk API calls
 * 4. Cache-first untuk static assets
 * 5. Stale-while-revalidate untuk konten
 * 6. Proper cleanup cache lama
 * 7. Cross-platform compatibility
 *
 * Source of truth PWA runtime: this custom /sw.js file.
 * Do not enable VitePWA/Workbox in the active Next app unless this file is replaced.
 */

const SW_DEBUG = false;
const swLog = (...args) => { if (SW_DEBUG) console.log(...args); };
const swWarn = (...args) => { if (SW_DEBUG) console.warn(...args); };

const CACHE_NAME    = 'livoria-v4.3.0';
const STATIC_CACHE  = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const IMAGE_CACHE   = `${CACHE_NAME}-images`;

// Assets yang WAJIB di-cache saat install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
];

// Domain yang TIDAK boleh di-cache (selalu fetch dari network)
const SKIP_CACHE_DOMAINS = [
  'supabase.co',
  'supabase.io',
  'supabase.in',
  'api.jikan.moe',
  'graphql.anilist.co',
  'api.groq.com',
  'api.mymemory.translated.net',
  'cdnjs.cloudflare.com',
];

const SKIP_CACHE_PATH_PREFIXES = [
  '/__pwa_ping',
  '/api/',
  '/functions/',
  '/.netlify/functions/',
  '/.netlify/edge-functions/',
  '/rest/v1/',
  '/auth/v1/',
  '/storage/v1/',
  '/realtime/v1/',
];

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  swLog('[SW v4] Installing...');
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
        swWarn('[SW v4] Some assets failed to pre-cache:', failed.length);
      }
      return results;
    })
  );
  // Jangan skipWaiting otomatis. Biarkan client menampilkan tombol update,
  // lalu aktifkan versi baru hanya setelah user menekan Update.
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  swLog('[SW v4] Activating...');
  event.waitUntil(
    Promise.all([
      'navigationPreload' in self.registration
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
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
              swLog('[SW v4] Removing old cache:', name);
              return caches.delete(name);
            })
        )
      ),
      // Ambil kontrol semua klien
      self.clients.claim(),
    ]).then(() => notifyClients({ type: 'PWA_READY', version: CACHE_NAME, timestamp: Date.now() }))
  );
});

// ── Helper: check if URL should skip cache ───────────────────────────────────
function shouldSkipCache(url) {
  return SKIP_CACHE_DOMAINS.some(domain => url.hostname.includes(domain));
}

function isSensitiveRequest(request) {
  return (
    request.headers.has('authorization') ||
    request.headers.has('apikey') ||
    request.headers.has('x-client-info')
  );
}

function isSameOriginApiPath(url) {
  if (url.origin !== self.location.origin) return false;
  return SKIP_CACHE_PATH_PREFIXES.some(prefix => url.pathname.startsWith(prefix));
}

function shouldBypassCache(request, url) {
  return shouldSkipCache(url) ||
    isSameOriginApiPath(url) ||
    isSensitiveRequest(request) ||
    isNextRuntimeRequest(url, request);
}

function isNextRuntimeRequest(url, request) {
  const accept = request.headers.get('accept') || '';
  return url.searchParams.has('_rsc') ||
    url.searchParams.has('__flight__') ||
    accept.includes('text/x-component') ||
    accept.includes('application/octet-stream') ||
    url.pathname.startsWith('/_next/data/');
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

function canCacheDynamicResponse(url, request, response) {
  if (url.origin !== self.location.origin) return false;
  if (isSensitiveRequest(request) || isSameOriginApiPath(url) || isNextRuntimeRequest(url, request)) return false;
  if (!response || !response.ok || response.type !== 'basic') return false;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return false;
  if (contentType.includes('text/html')) return false;
  if (contentType.includes('text/x-component')) return false;
  if (contentType.includes('application/octet-stream')) return false;

  return true;
}

function offlineShellResponse() {
  return new Response(
    '<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LIVORIA Offline</title></head><body style="font-family:system-ui,sans-serif;margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f8f4;color:#1f2a24"><main style="max-width:360px;padding:24px;text-align:center"><h1 style="font-size:20px;margin:0 0 8px">LIVORIA sedang offline</h1><p style="font-size:14px;line-height:1.5;margin:0;color:#66736b">Buka ulang saat koneksi tersedia. Data personal dan API tidak disajikan dari cache.</p></main></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => client.postMessage(message));
}

async function getCacheStatus() {
  const names = (await caches.keys()).filter(name => name.startsWith('livoria-'));
  const cachesInfo = await Promise.all(names.map(async (name) => {
    const cache = await caches.open(name);
    const entries = await cache.keys();
    return { name, entries: entries.length };
  }));
  return {
    version: CACHE_NAME,
    caches: cachesInfo,
    totalEntries: cachesInfo.reduce((total, item) => total + item.entries, 0),
    timestamp: Date.now(),
  };
}

// ── Fetch Strategy ───────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip: non-GET
  if (request.method !== 'GET') return;

  // Skip: non-http(s)
  if (!url.protocol.startsWith('http')) return;

  // Skip: API/auth/data calls (always network, never cache)
  if (shouldBypassCache(request, url)) return;

  // Chrome extension urls
  if (url.protocol === 'chrome-extension:') return;

  // Strategy 1: Navigation (HTML) -> network-first, fallback ke app shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      Promise.resolve(event.preloadResponse)
        .then(preloaded => preloaded || fetch(request, { cache: 'no-cache' }))
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put('/', clone));
          }
          return response;
        })
        .catch(async () => {
          // Network gagal -> serve cached route atau app shell.
          const cached = await caches.match(request);
          if (cached) return cached;
          const shell = await caches.match('/');
          return shell || offlineShellResponse();
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
        return fetch(request, { cache: 'no-cache' }).then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        }).catch(() => cached || new Response('', { status: 408, statusText: 'Offline' }));
      })
    );
    return;
  }

  // ── Strategy 5: Everything else → Network-first, fallback to cache
  event.respondWith(
    fetch(request)
      .then(response => {
        if (canCacheDynamicResponse(url, request, response)) {
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
    icon: '/icons/icon-128x128.png',
    badge: '/icons/icon-128x128.png',
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
    swLog('[SW v4] Skip waiting - applying update');
    self.skipWaiting();
  }

  if (data?.type === 'GET_VERSION') {
    ports?.[0]?.postMessage({ version: CACHE_NAME });
  }

  if (data?.type === 'GET_CACHE_STATUS') {
    getCacheStatus()
      .then(status => ports?.[0]?.postMessage({ success: true, status }))
      .catch(error => ports?.[0]?.postMessage({ success: false, error: String(error) }));
  }

  if (data?.type === 'CLEAR_CACHE') {
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('livoria-')).map(k => caches.delete(k))))
      .then(() => {
        ports?.[0]?.postMessage({ success: true });
        return notifyClients({ type: 'CACHE_CLEARED', timestamp: Date.now() });
      })
      .catch(error => ports?.[0]?.postMessage({ success: false, error: String(error) }));
  }
});

swLog('[SW v4] LIVORIA Service Worker v4.3.0 loaded');
