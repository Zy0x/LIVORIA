import type { Metadata } from 'next';
import { DM_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://livoria.web.id'),
  title: 'LIVORIA',
  description: 'LIVORIA - Personal archive app untuk tagihan, anime, donghua, waifu, dan obat-obatan.',
  applicationName: 'LIVORIA',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-512x512.png', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
    ],
    shortcut: '/icons/icon-256x256.png',
    apple: [
      { url: '/icons/icon-512x512.png', sizes: '512x512' },
      { url: '/icons/icon-256x256.png', sizes: '256x256' },
      { url: '/icons/icon-128x128.png', sizes: '128x128' },
    ],
  },
  openGraph: {
    title: 'LIVORIA',
    description: 'LIVORIA - Personal archive app untuk tagihan, anime, donghua, waifu, dan obat-obatan.',
    type: 'website',
    images: ['/icons/icon-512x512.png'],
  },
  twitter: {
    card: 'summary',
    title: 'LIVORIA',
    description: 'LIVORIA - Personal archive app untuk tagihan, anime, donghua, waifu, dan obat-obatan.',
    images: ['/icons/icon-512x512.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2d5040',
};

const pwaBootstrapScript = `
// Custom /sw.js is the single PWA runtime source of truth for the Next app.
// Do not enable VitePWA/Workbox here unless this registration is replaced.
window.__pwa_deferred_prompt = null;
window.__pwa_prompt_available = false;
window.__pwa_installed = false;

(function installLivoriaBootRecovery() {
  var reloadKey = 'livoria_boot_recover_attempted';
  var chunkPattern = /chunk|chunkloaderror|loading chunk|dynamically imported|module script|failed to fetch|import\\(\\)|turbopack|_next\\/static/i;

  function shouldRecover(value) {
    var message = '';
    try {
      if (value && value.message) message += ' ' + value.message;
      if (value && value.name) message += ' ' + value.name;
      if (typeof value === 'string') message += ' ' + value;
    } catch {}
    return chunkPattern.test(message);
  }

  function recover() {
    var lastAttempt = 0;
    try { lastAttempt = Number(window.sessionStorage.getItem(reloadKey) || 0); } catch {}
    if (Date.now() - lastAttempt < 60000) return;
    try { window.sessionStorage.setItem(reloadKey, String(Date.now())); } catch {}

    var clearCaches = 'caches' in window
      ? window.caches.keys().then(function(keys) {
          return Promise.all(keys.filter(function(key) { return key.indexOf('livoria-') === 0; }).map(function(key) {
            return window.caches.delete(key);
          }));
        }).catch(function() {})
      : Promise.resolve();

    clearCaches.finally(function() {
      window.location.reload();
    });
  }

  window.addEventListener('error', function(event) {
    var target = event && event.target;
    var source = target && target.src ? String(target.src) : '';
    if (source.indexOf('/_next/static/') !== -1 || shouldRecover(event.error || event.message)) {
      if (event.preventDefault) event.preventDefault();
      recover();
    }
  }, true);

  window.addEventListener('unhandledrejection', function(event) {
    if (shouldRecover(event.reason)) {
      if (event.preventDefault) event.preventDefault();
      recover();
    }
  });
})();

window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  window.__pwa_deferred_prompt = e;
  window.__pwa_prompt_available = true;
  window.dispatchEvent(new CustomEvent('pwa_prompt_ready', { detail: { prompt: e } }));
}, { once: false });

window.addEventListener('appinstalled', function() {
  window.__pwa_installed = true;
  window.__pwa_deferred_prompt = null;
  window.dispatchEvent(new CustomEvent('pwa_installed'));
});

if ('serviceWorker' in navigator) {
  var livoriaPwaCheckInFlight = false;
  var livoriaPwaVersionCheckInFlight = false;
  var livoriaPwaUpdateIntervalMs = 10 * 1000;
  var livoriaPwaVersionStorageKey = 'livoria:pwa-build-version';

  function dispatchPwaEvent(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function notifyWaitingWorker(reg) {
    if (!reg || !reg.waiting) return;
    dispatchPwaEvent('livoria-pwa-update-ready', { scope: reg.scope, waiting: true });
  }

  function triggerRegistrationUpdate(reg, reason) {
    if (!reg || livoriaPwaCheckInFlight) return;
    livoriaPwaCheckInFlight = true;
    reg.update()
      .then(function() { notifyWaitingWorker(reg); })
      .catch(function() {})
      .finally(function() { livoriaPwaCheckInFlight = false; });
  }

  function checkBuildVersion(reason) {
    if (livoriaPwaVersionCheckInFlight) return;
    livoriaPwaVersionCheckInFlight = true;

    fetch('/version.json?ts=' + Date.now(), {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    })
      .then(function(response) {
        if (!response.ok) return null;
        return response.json();
      })
      .then(function(payload) {
        if (!payload || typeof payload.version !== 'string') return;

        var currentVersion = null;
        try {
          currentVersion = window.localStorage.getItem(livoriaPwaVersionStorageKey);
        } catch {}

        if (!currentVersion) {
          try { window.localStorage.setItem(livoriaPwaVersionStorageKey, payload.version); } catch {}
          return;
        }

        if (currentVersion !== payload.version) {
          try { window.localStorage.setItem(livoriaPwaVersionStorageKey, payload.version); } catch {}
          dispatchPwaEvent('livoria-pwa-update-ready', {
            source: 'version-json',
            reason: reason,
            version: payload.version,
            previousVersion: currentVersion,
          });
        }
      })
      .catch(function() {})
      .finally(function() { livoriaPwaVersionCheckInFlight = false; });
  }

  function checkForPwaUpdates(reg, reason) {
    triggerRegistrationUpdate(reg, reason);
    checkBuildVersion(reason);
  }

  function wireRegistration(reg) {
    notifyWaitingWorker(reg);

    if (reg.installing) {
      reg.installing.addEventListener('statechange', function() {
        if (reg.installing && reg.installing.state === 'installed' && navigator.serviceWorker.controller) {
          notifyWaitingWorker(reg);
        }
      });
    }

    reg.addEventListener('updatefound', function() {
      var installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', function() {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          notifyWaitingWorker(reg);
        }
      });
    });

    checkForPwaUpdates(reg, 'initial');
    setInterval(function() { checkForPwaUpdates(reg, 'interval'); }, livoriaPwaUpdateIntervalMs);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') checkForPwaUpdates(reg, 'visibility');
    });
    window.addEventListener('online', function() { checkForPwaUpdates(reg, 'online'); });
    window.addEventListener('focus', function() { checkForPwaUpdates(reg, 'focus'); });
    window.addEventListener('pageshow', function() { checkForPwaUpdates(reg, 'pageshow'); });
  }

  navigator.serviceWorker
    .register('/sw.js', { scope: '/', updateViaCache: 'none' })
    .then(wireRegistration)
    .catch(function() {});

  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SYNC_COMPLETE') {
      dispatchPwaEvent('livoria-pwa-sync-complete', event.data);
    }
    if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
      dispatchPwaEvent('livoria-pwa-update-ready', { source: 'service-worker-message' });
    }
    if (event.data && event.data.type === 'PWA_READY') {
      dispatchPwaEvent('livoria-pwa-ready', event.data);
    }
    if (event.data && event.data.type === 'CACHE_CLEARED') {
      dispatchPwaEvent('livoria-pwa-cache-cleared', event.data);
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', function() {
    dispatchPwaEvent('livoria-pwa-controller-ready');
  });
}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${jakartaSans.variable} ${dmMono.variable}`}>
      <body>
        <script dangerouslySetInnerHTML={{ __html: pwaBootstrapScript }} />
        <noscript>
          <div
            style={{
              minHeight: '100vh',
              display: 'grid',
              placeItems: 'center',
              background: '#f6f8f4',
              color: '#1f2a24',
              padding: 24,
              fontFamily: 'system-ui, sans-serif',
              textAlign: 'center',
            }}
          >
            <main style={{ maxWidth: 380 }}>
              <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>LIVORIA membutuhkan JavaScript</h1>
              <p style={{ margin: 0, color: '#66736b', lineHeight: 1.55 }}>
                Aktifkan JavaScript untuk domain ini, lalu muat ulang halaman agar aplikasi dapat berjalan.
              </p>
            </main>
          </div>
        </noscript>
        <div
          id="livoria-boot-fallback"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            display: 'grid',
            placeItems: 'center',
            background: '#f6f8f4',
            color: '#1f2a24',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <main style={{ maxWidth: 420 }}>
            <div
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                margin: '0 auto 14px',
                borderRadius: 999,
                border: '2px solid rgba(45, 80, 64, 0.18)',
                borderTopColor: '#2d5040',
                animation: 'livoriaBootSpin 0.9s linear infinite',
              }}
            />
            <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Memuat LIVORIA</h1>
            <p style={{ margin: '0 0 14px', color: '#66736b', lineHeight: 1.55 }}>
              Menyiapkan aplikasi terbaru. Jika tetap tertahan, muat ulang halaman atau pastikan JavaScript
              diizinkan untuk livoria.web.id.
            </p>
            <a
              href="https://livoria.web.id/?reload=1"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 42,
                padding: '0 18px',
                borderRadius: 999,
                background: '#2d5040',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Muat Ulang
            </a>
            <style>{`@keyframes livoriaBootSpin{to{transform:rotate(360deg)}}`}</style>
          </main>
        </div>
        {children}
      </body>
    </html>
  );
}
