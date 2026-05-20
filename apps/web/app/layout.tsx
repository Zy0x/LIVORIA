import type { Metadata } from 'next';
import './globals.css';

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
window.__pwa_deferred_prompt = null;
window.__pwa_prompt_available = false;
window.__pwa_installed = false;

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

    triggerRegistrationUpdate(reg, 'initial');
    setInterval(function() { triggerRegistrationUpdate(reg, 'interval'); }, 60 * 1000);
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') triggerRegistrationUpdate(reg, 'visibility');
    });
    window.addEventListener('online', function() { triggerRegistrationUpdate(reg, 'online'); });
    window.addEventListener('focus', function() { triggerRegistrationUpdate(reg, 'focus'); });
    window.addEventListener('pageshow', function() { triggerRegistrationUpdate(reg, 'pageshow'); });
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
  });

  navigator.serviceWorker.addEventListener('controllerchange', function() {
    dispatchPwaEvent('livoria-pwa-controller-ready');
  });
}
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <script dangerouslySetInnerHTML={{ __html: pwaBootstrapScript }} />
        {children}
      </body>
    </html>
  );
}
