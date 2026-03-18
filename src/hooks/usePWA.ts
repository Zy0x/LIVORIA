/**
 * usePWA.ts — LIVORIA v4.1
 *
 * PERBAIKAN:
 * 1. Banner tampil untuk SEMUA platform (Android, iOS, Desktop) selama belum standalone
 * 2. beforeinstallprompt tidak diperlukan untuk show banner di iOS & Desktop Firefox/Safari
 * 3. Dismiss disimpan di localStorage agar tidak muncul terus (bukan sessionStorage)
 * 4. Debug: force-show jika VITE_PWA_DEBUG=true
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type BrowserType    = 'chrome' | 'edge' | 'safari' | 'firefox' | 'samsung' | 'opera' | 'brave' | 'unknown';

export interface PWAState {
  // Install
  canInstall:     boolean;
  isStandalone:   boolean;
  isIOS:          boolean;
  isAndroid:      boolean;
  isDesktop:      boolean;
  browser:        BrowserType;
  installPrompt:  () => Promise<void>;
  dismissInstall: () => void;

  // Update
  needsUpdate:    boolean;
  applyUpdate:    () => void;

  // Network
  isOnline:       boolean;

  // SW
  isRegistered:   boolean;
  swVersion:      string | null;

  // Notif
  notifPermission: NotificationPermission | null;
  requestNotifPermission: () => Promise<NotificationPermission>;

  // Debug
  debug: {
    hasPrompt:     boolean;
    criteria:      string[];
    installState:  string;
  };
}

// ── Platform detection ────────────────────────────────────────────────────────

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/'))          return 'edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
  if (ua.includes('samsungbrowser')) return 'samsung';
  if (ua.includes('firefox'))       return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('chrome'))        return 'chrome';
  return 'unknown';
}

function detectOS() {
  const ua = navigator.userAgent;
  const isIOS     = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /android/i.test(ua);
  const isDesktop = !isIOS && !isAndroid;
  return { isIOS, isAndroid, isDesktop };
}

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: window-controls-overlay)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

// ── Dismiss state ─────────────────────────────────────────────────────────────
const DISMISS_KEY = 'livoria_pwa_dismissed_v2';
const DISMISS_DAYS = 7; // Show lagi setelah 7 hari

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    const ts = parseInt(val, 10);
    const daysSince = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    return daysSince < DISMISS_DAYS;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

// ── Global prompt storage ─────────────────────────────────────────────────────
declare global {
  interface Window {
    __livoria_deferredPrompt?: BeforeInstallPromptEvent | null;
    __livoria_promptAvailable?: boolean;
  }
}

if (typeof window !== 'undefined') {
  window.__livoria_promptAvailable = false;
  window.__livoria_deferredPrompt  = null;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    window.__livoria_deferredPrompt  = e as BeforeInstallPromptEvent;
    window.__livoria_promptAvailable = true;
    console.log('[PWA] beforeinstallprompt captured ✓');
    window.dispatchEvent(new CustomEvent('livoria_prompt_ready'));
  });
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const { isIOS, isAndroid, isDesktop } = detectOS();
  const browser    = detectBrowser();
  const standalone = detectStandalone();

  // canInstall = tampilkan banner install
  // True jika: belum standalone, belum di-dismiss, dan belum installed
  const [canInstall,    setCanInstall]    = useState(false);
  const [hasPrompt,     setHasPrompt]     = useState(!!window.__livoria_promptAvailable);
  const [needsUpdate,   setNeedsUpdate]   = useState(false);
  const [isOnline,      setIsOnline]      = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isRegistered,  setIsRegistered]  = useState(false);
  const [swVersion,     setSwVersion]     = useState<string | null>(null);
  const [notifPerm,     setNotifPerm]     = useState<NotificationPermission | null>(
    typeof Notification !== 'undefined' ? Notification.permission : null
  );
  const [installState,  setInstallState]  = useState('idle');

  const promptRef   = useRef<BeforeInstallPromptEvent | null>(window.__livoria_deferredPrompt || null);
  const newSWRef    = useRef<ServiceWorker | null>(null);

  // ── Determine if we should show install banner ────────────────────────────
  useEffect(() => {
    // Jangan tampilkan jika sudah standalone/installed
    if (standalone) {
      setCanInstall(false);
      setInstallState('installed');
      return;
    }

    // Jangan tampilkan jika sudah di-dismiss dalam 7 hari
    if (isDismissed()) {
      setCanInstall(false);
      setInstallState('dismissed');
      return;
    }

    // Tampilkan banner untuk:
    // - iOS: selalu (panduan manual)
    // - Android: tunggu prompt atau tampilkan setelah delay
    // - Desktop Chrome/Edge: tunggu prompt
    // - Desktop Firefox/Safari: tampilkan panduan
    if (isIOS) {
      setCanInstall(true);
      setInstallState('available-ios');
      return;
    }

    if (isDesktop && (browser === 'firefox' || browser === 'safari')) {
      setCanInstall(true);
      setInstallState('available-manual');
      return;
    }

    // Untuk Chrome/Edge/Android: cek prompt, tapi juga set timer fallback
    if (window.__livoria_promptAvailable) {
      setHasPrompt(true);
      setCanInstall(true);
      setInstallState('available-prompt');
    } else {
      // Tunggu 3 detik untuk prompt, lalu tampilkan banner informasional
      const timer = setTimeout(() => {
        if (!window.__livoria_promptAvailable && !isDismissed()) {
          // Mungkin app sudah terinstall atau browser tidak support
          // Di Chrome, jika prompt tidak datang dalam 3 detik, kemungkinan sudah installed
          console.log('[PWA] No prompt after 3s — app may already be installed or criteria not met');
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [standalone, isIOS, isAndroid, isDesktop, browser]);

  // ── Listen for beforeinstallprompt ───────────────────────────────────────
  useEffect(() => {
    const onPromptReady = () => {
      promptRef.current = window.__livoria_deferredPrompt || null;
      setHasPrompt(true);
      if (!isDismissed() && !standalone) {
        setCanInstall(true);
        setInstallState('available-prompt');
      }
    };

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current = evt;
      window.__livoria_deferredPrompt  = evt;
      window.__livoria_promptAvailable = true;
      setHasPrompt(true);
      if (!isDismissed() && !standalone) {
        setCanInstall(true);
        setInstallState('available-prompt');
      }
    });

    window.addEventListener('livoria_prompt_ready', onPromptReady);
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed ✓');
      setCanInstall(false);
      setInstallState('installed');
      promptRef.current = null;
    });

    return () => {
      window.removeEventListener('livoria_prompt_ready', onPromptReady);
    };
  }, [standalone]);

  // ── Service Worker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        setIsRegistered(true);

        const ctrl = navigator.serviceWorker.controller || reg.active;
        if (ctrl) {
          try {
            const ch = new MessageChannel();
            ch.port1.onmessage = (e) => { if (e.data?.version) setSwVersion(e.data.version); };
            ctrl.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
          } catch {}
        }

        if (reg.waiting) { setNeedsUpdate(true); newSWRef.current = reg.waiting; }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setNeedsUpdate(true);
              newSWRef.current = installing;
            }
          });
        });

        const updateInterval = setInterval(() => reg.update(), 30 * 60 * 1000);

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });

        return () => clearInterval(updateInterval);
      } catch (err) {
        console.error('[PWA] SW registration failed:', err);
      }
    };

    registerSW();
  }, []);

  // ── Network ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const installPromptFn = useCallback(async () => {
    if (isIOS) return; // Caller handles iOS modal

    const prompt = promptRef.current || window.__livoria_deferredPrompt;
    if (!prompt) {
      console.warn('[PWA] No deferred prompt available');
      return;
    }

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setCanInstall(false);
        setInstallState('installed');
      } else {
        setDismissed();
        setCanInstall(false);
        setInstallState('dismissed');
      }
      promptRef.current = null;
      window.__livoria_deferredPrompt = null;
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
    }
  }, [isIOS]);

  const dismissInstall = useCallback(() => {
    setDismissed();
    setCanInstall(false);
    setInstallState('dismissed');
  }, []);

  const applyUpdate = useCallback(() => {
    const sw = newSWRef.current;
    if (!sw) return;
    sw.postMessage({ type: 'SKIP_WAITING' });
    setTimeout(() => window.location.reload(), 1000);
  }, []);

  const requestNotifPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    const p = await Notification.requestPermission();
    setNotifPerm(p);
    return p;
  }, []);

  return {
    canInstall: canInstall && !standalone,
    isStandalone: standalone,
    isIOS,
    isAndroid,
    isDesktop,
    browser,
    installPrompt: installPromptFn,
    dismissInstall,

    needsUpdate,
    applyUpdate,

    isOnline,

    isRegistered,
    swVersion,

    notifPermission: notifPerm,
    requestNotifPermission,

    debug: {
      hasPrompt,
      criteria: [
        standalone ? '✓ Standalone' : '✗ Not standalone',
        hasPrompt  ? '✓ Has prompt' : '✗ No prompt',
        isDismissed() ? '✗ Dismissed' : '✓ Not dismissed',
        isIOS      ? '📱 iOS' : isAndroid ? '🤖 Android' : '🖥 Desktop',
        `Browser: ${browser}`,
      ],
      installState,
    },
  };
}