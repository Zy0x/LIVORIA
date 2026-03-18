/**
 * LIVORIA Service Worker v5.0
 *
 * IMPROVEMENTS:
 * 1. Faster cache-first for static assets
 * 2. Network-first with shorter timeout for navigation
 * 3. Better offline fallback
 * 4. Proper cache versioning & cleanup
 * 5. Background sync for better reliability
 * 6. Reduced cache size for faster installs
 */

const APP_VERSION  = 'livoria-v5.0.0';
const STATIC_CACHE = `${APP_VERSION}-static`;
const DYNAMIC_CACHE = `${APP_VERSION}-dynamic`;
const IMAGE_CACHE  = `${APP_VERSION}-images`;
const FONT_CACHE   = `${APP_VERSION}-fonts`;

// Critical assets to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// External domains — always network, never cache
const BYPASS_DOMAINS = [
  'supabase.co',
  'supabase.io',
  'api.jikan.moe',
  'graphql.anilist.co',
  'api.groq.com',
  'api.mymemory.translated.net',
];

// Network timeout before falling back to cache (ms)
const NETWORK_TIMEOUT = 3000;

// ─────────────────────────────────────────────────────────────────────────────
// INSTALL
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW v5] Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(async (cache) => {
      const results = await Promise.allSettled(
        PRECACHE_URLS.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) console.warn(`[SW v5] ${failed} assets failed to precache`);
    })
  );
  // Skip waiting immediately — new SW takes control right away
  self.skipWaiting();
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTIVATE
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW v5] Activating...');
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(keys =>
        Promise.all(
          keys
            .filter(k => k.startsWith('livoria-') && ![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE, FONT_CACHE].includes(k))
            .map(k => { console.log('[SW v5] Removing old cache:', k); return caches.delete(k); })
        )
      ),
      self.clients.claim(),
    ])
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function shouldBypass(url) {
  return BYPASS_DOMAINS.some(d => url.hostname.includes(d));
}

function isStaticAsset(url) {
  return /\.(js|css|woff2?|ttf|eot|otf)(\?.*)?$/i.test(url.pathname);
}

function isImage(url, req) {
  return req.destination === 'image' || /\.(png|jpg|jpeg|gif|webp|svg|ico|avif)(\?.*)?$/i.test(url.pathname);
}

function isFont(url) {
  return url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com');
}

/** Race network against a timeout, resolve with network or null */
function fetchWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(null), ms);
    fetch(request)
      .then(r => { clearTimeout(timer); resolve(r); })
      .catch(e => { clearTimeout(timer); reject(e); });
  });
}

async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys  = await cache.keys();
  if (keys.length > max) {
    await Promise.all(keys.slice(0, keys.length - max).map(k => cache.delete(k)));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, non-http, extensions
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;
  if (url.protocol === 'chrome-extension:') return;

  // Always bypass external APIs
  if (shouldBypass(url)) return;

  // ── Strategy 1: Navigation (HTML pages) ──────────────────────────────────
  // Network-first with timeout → cache → offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetchWithTimeout(
            new Request(request.url, { cache: 'no-cache' }),
            NETWORK_TIMEOUT
          );
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, clone);
            return networkResponse;
          }
        } catch {}

        // Cache fallback
        const cached = await caches.match(request)
                    || await caches.match('/index.html')
                    || await caches.match('/');
        if (cached) return cached;

        // Ultimate fallback
        return new Response(
          '<!DOCTYPE html><html><head><meta charset="utf-8"><title>LIVORIA — Offline</title>' +
          '<meta name="viewport" content="width=device-width,initial-scale=1">' +
          '<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f4f5f0;color:#162010}' +
          '.card{text-align:center;padding:2rem;background:white;border-radius:1rem;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:320px}' +
          'h1{font-size:1.5rem;margin-bottom:.5rem}p{color:#666;margin-bottom:1.5rem}' +
          'button{background:#2d5040;color:white;border:none;padding:.75rem 1.5rem;border-radius:.5rem;cursor:pointer;font-size:1rem}' +
          '</style></head><body>' +
          '<div class="card"><div style="font-size:3rem">🌿</div><h1>LIVORIA</h1>' +
          '<p>Koneksi tidak tersedia. Periksa internet Anda.</p>' +
          '<button onclick="location.reload()">Coba Lagi</button></div></body></html>',
          { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        );
      })()
    );
    return;
  }

  // ── Strategy 2: Fonts — Cache First (very long TTL) ──────────────────────
  if (isFont(url)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) cache.put(request, response.clone());
          return response;
        } catch {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // ── Strategy 3: Images — Stale While Revalidate ──────────────────────────
  if (isImage(url, request)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          // Return cached immediately, update in background
          fetch(request)
            .then(r => { if (r.ok) { cache.put(request, r); trimCache(IMAGE_CACHE, 120); } })
            .catch(() => {});
          return cached;
        }
        try {
          const response = await fetch(request);
          if (response.ok) {
            cache.put(request, response.clone());
            trimCache(IMAGE_CACHE, 120);
          }
          return response;
        } catch {
          return new Response('', { status: 408 });
        }
      })
    );
    return;
  }

  // ── Strategy 4: JS/CSS — Cache First + Background Update ─────────────────
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request).then(r => {
          if (r.ok) cache.put(request, r.clone());
          return r;
        }).catch(() => null);

        return cached || networkPromise;
      })
    );
    return;
  }

  // ── Strategy 5: Everything else — Network First, cache fallback ──────────
  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(request, response.clone());
          trimCache(DYNAMIC_CACHE, 80);
        }
        return response;
      } catch {
        const cached = await caches.match(request);
        return cached || new Response(
          JSON.stringify({ error: 'Offline', message: 'Tidak ada koneksi internet' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      }
    })()
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// PUSH NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'LIVORIA', body: 'Ada notifikasi baru', url: '/' };
  if (event.data) {
    try { Object.assign(data, event.data.json()); } catch {}
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:    data.body,
      icon:    '/icons/icon-192x192.png',
      badge:   '/icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      tag:     'livoria-notification',
      data:    { url: data.url },
      actions: [
        { action: 'open',    title: 'Buka LIVORIA' },
        { action: 'dismiss', title: 'Tutup' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.startsWith(self.registration.scope));
      if (existing) { existing.focus(); existing.navigate(url); }
      else self.clients.openWindow(url);
    })
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  const { data, ports } = event;

  if (data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (data?.type === 'GET_VERSION') {
    ports?.[0]?.postMessage({ version: APP_VERSION });
  }

  if (data?.type === 'CLEAR_CACHE') {
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => ports?.[0]?.postMessage({ success: true }));
  }

  if (data?.type === 'CACHE_URLS') {
    const urls = data.urls || [];
    caches.open(STATIC_CACHE).then(cache => cache.addAll(urls));
  }
});

// Background sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'livoria-sync') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SYNC_COMPLETE', timestamp: Date.now() }));
      })
    );
  }
});

console.log('[SW v5] LIVORIA Service Worker v5.0 loaded ✓');