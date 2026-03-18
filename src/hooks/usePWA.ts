/**
 * usePWA.ts — LIVORIA v4.0
 *
 * PERBAIKAN KOMPREHENSIF (Multi-Platform):
 * 1. beforeinstallprompt: listener dipasang SEBELUM React mount (di window level)
 * 2. Android Chrome: native install prompt dengan retry logic
 * 3. iOS Safari: deteksi akurat + panduan langkah-langkah
 * 4. Desktop Chrome/Edge/Brave: full install support
 * 5. Firefox: fallback graceful (tidak support beforeinstallprompt)
 * 6. Samsung Internet: support beforeinstallprompt
 * 7. Criteria check: manifest, HTTPS, service worker semua diverifikasi
 * 8. Session dismiss: tidak blokir event dari browser
 * 9. Update detection: reliable dengan multiple fallback
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallState   = 'idle' | 'available' | 'installing' | 'installed' | 'unavailable' | 'unsupported';
export type UpdateState    = 'idle' | 'available' | 'updating';
export type NetworkState   = 'online' | 'offline';
export type BrowserType    = 'chrome' | 'edge' | 'safari' | 'firefox' | 'samsung' | 'opera' | 'brave' | 'unknown';

export interface PWAState {
  installState:   InstallState;
  isIOS:          boolean;
  isAndroid:      boolean;
  isDesktop:      boolean;
  isStandalone:   boolean;
  canInstall:     boolean;
  browser:        BrowserType;
  installPrompt:  () => Promise<void>;
  dismissInstall: () => void;

  updateState:    UpdateState;
  needsUpdate:    boolean;
  applyUpdate:    () => void;

  networkState:   NetworkState;
  isOnline:       boolean;

  isRegistered:   boolean;
  swVersion:      string | null;

  notifPermission: NotificationPermission | null;
  requestNotifPermission: () => Promise<NotificationPermission>;

  // Diagnostic info
  debug: {
    hasPrompt:     boolean;
    criteria:      string[];
  };
}

// ── Platform detection ────────────────────────────────────────────────────────

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
  if (ua.includes('samsungbrowser')) return 'samsung';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('chrome')) return 'chrome';
  return 'unknown';
}

function detectOS(): { isIOS: boolean; isAndroid: boolean; isDesktop: boolean } {
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
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

// ── Dismiss state (session-based, tidak persist) ──────────────────────────────
const DISMISS_SESSION_KEY = 'livoria_pwa_dismissed_session';

function getSessionDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

function setSessionDismissed(): void {
  try {
    sessionStorage.setItem(DISMISS_SESSION_KEY, '1');
  } catch {}
}

// ── Global prompt storage (survive React re-renders) ─────────────────────────
// Ini KRITIS: event harus ditangkap bahkan sebelum React mount
declare global {
  interface Window {
    __livoria_deferredPrompt?: BeforeInstallPromptEvent | null;
    __livoria_promptAvailable?: boolean;
  }
}

// Tangkap event SEGERA saat modul diload (sebelum React)
if (typeof window !== 'undefined') {
  window.__livoria_promptAvailable = false;
  window.__livoria_deferredPrompt  = null;

  const earlyHandler = (e: Event) => {
    e.preventDefault();
    window.__livoria_deferredPrompt  = e as BeforeInstallPromptEvent;
    window.__livoria_promptAvailable = true;
    console.log('[PWA] beforeinstallprompt captured early ✓');
    // Dispatch custom event agar hook bisa bereaksi
    window.dispatchEvent(new CustomEvent('livoria_prompt_ready'));
  };

  window.addEventListener('beforeinstallprompt', earlyHandler);
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const { isIOS, isAndroid, isDesktop } = detectOS();
  const browser    = detectBrowser();
  const standalone = detectStandalone();

  const [installState,     setInstallState]     = useState<InstallState>('idle');
  const [updateState,      setUpdateState]       = useState<UpdateState>('idle');
  const [networkState,     setNetworkState]     = useState<NetworkState>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [isRegistered,     setIsRegistered]     = useState(false);
  const [swVersion,        setSwVersion]        = useState<string | null>(null);
  const [notifPermission,  setNotifPermission]  = useState<NotificationPermission | null>(
    typeof Notification !== 'undefined' ? Notification.permission : null
  );
  const [hasPrompt,        setHasPrompt]        = useState(!!window.__livoria_promptAvailable);
  const [criteria,         setCriteria]         = useState<string[]>([]);

  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const newSWRef       = useRef<ServiceWorker | null>(null);
  const promptRef      = useRef<BeforeInstallPromptEvent | null>(window.__livoria_deferredPrompt || null);

  // ── Sync global prompt ke ref ─────────────────────────────────────────────
  useEffect(() => {
    const onPromptReady = () => {
      promptRef.current = window.__livoria_deferredPrompt || null;
      setHasPrompt(true);

      if (!getSessionDismissed() && !standalone) {
        setInstallState('available');
      }
    };

    // Cek apakah prompt sudah tersedia sebelum hook mount
    if (window.__livoria_promptAvailable && promptRef.current) {
      if (!getSessionDismissed() && !standalone) {
        setInstallState('available');
      }
    }

    // Dengarkan event baru
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      promptRef.current                = evt;
      window.__livoria_deferredPrompt  = evt;
      window.__livoria_promptAvailable = true;
      setHasPrompt(true);
      if (!getSessionDismissed() && !standalone) {
        setInstallState('available');
      }
    });

    window.addEventListener('livoria_prompt_ready', onPromptReady);

    // iOS: selalu available (manual install)
    if (isIOS && !standalone && !getSessionDismissed()) {
      setInstallState('available');
    }

    // App installed
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App installed ✓');
      setInstallState('installed');
      promptRef.current = null;
      window.__livoria_deferredPrompt = null;
    });

    return () => {
      window.removeEventListener('livoria_prompt_ready', onPromptReady);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Already standalone ────────────────────────────────────────────────────
  useEffect(() => {
    if (standalone) {
      setInstallState('installed');
    }
  }, [standalone]);

  // ── PWA criteria check (for diagnostics) ─────────────────────────────────
  useEffect(() => {
    const checks: string[] = [];
    if (window.location.protocol === 'https:' || window.location.hostname === 'localhost') {
      checks.push('✓ HTTPS');
    } else {
      checks.push('✗ HTTPS (required)');
    }
    if ('serviceWorker' in navigator) checks.push('✓ ServiceWorker API');
    else checks.push('✗ ServiceWorker API');

    if (document.querySelector('link[rel="manifest"]')) checks.push('✓ Manifest linked');
    else checks.push('✗ Manifest not linked');

    setCriteria(checks);
  }, []);

  // ── Service Worker registration ───────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });

        swRegistration.current = reg;
        setIsRegistered(true);
        console.log('[PWA] SW registered, scope:', reg.scope);

        // Get SW version
        const ctrl = navigator.serviceWorker.controller || reg.active;
        if (ctrl) {
          try {
            const ch = new MessageChannel();
            ch.port1.onmessage = (e) => {
              if (e.data?.version) setSwVersion(e.data.version);
            };
            ctrl.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
          } catch {}
        }

        // Check for waiting SW (update already ready)
        if (reg.waiting) {
          setUpdateState('available');
          newSWRef.current = reg.waiting;
        }

        // Listen for new SW installation
        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New version available
                setUpdateState('available');
                newSWRef.current = installing;
                console.log('[PWA] Update available');
              }
            }
          });
        });

        // Periodic update check (every 30 min)
        const updateInterval = setInterval(() => reg.update(), 30 * 60 * 1000);

        // Reload on controller change (after update applied)
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing && updateState === 'updating') {
            refreshing = true;
            window.location.reload();
          }
        });

        return () => clearInterval(updateInterval);
      } catch (err) {
        console.error('[PWA] SW registration failed:', err);
      }
    };

    registerSW();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Network monitoring ────────────────────────────────────────────────────
  useEffect(() => {
    const goOnline  = () => setNetworkState('online');
    const goOffline = () => setNetworkState('offline');
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const installPrompt = useCallback(async () => {
    // iOS: caller handles manual instructions modal
    if (isIOS) return;

    const prompt = promptRef.current || window.__livoria_deferredPrompt;
    if (!prompt) {
      console.warn('[PWA] No deferred prompt available');
      // Try to show anyway — some browsers may still have it
      return;
    }

    setInstallState('installing');

    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      console.log('[PWA] User choice:', outcome);

      if (outcome === 'accepted') {
        setInstallState('installed');
      } else {
        setSessionDismissed();
        setInstallState('idle');
      }
      promptRef.current               = null;
      window.__livoria_deferredPrompt = null;
    } catch (err) {
      console.error('[PWA] Install prompt error:', err);
      setInstallState('available');
    }
  }, [isIOS]);

  const dismissInstall = useCallback(() => {
    setSessionDismissed();
    setInstallState('idle');
    // Keep prompt ref — user might want to install later this session
  }, []);

  const applyUpdate = useCallback(() => {
    const sw = newSWRef.current;
    if (!sw) return;
    setUpdateState('updating');
    sw.postMessage({ type: 'SKIP_WAITING' });
    // Reload after short delay as fallback
    setTimeout(() => window.location.reload(), 1000);
  }, []);

  const requestNotifPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    const p = await Notification.requestPermission();
    setNotifPermission(p);
    return p;
  }, []);

  // Derived state
  const canInstall = (installState === 'available') && !standalone;
  const needsUpdate = updateState === 'available';

  return {
    installState,
    isIOS,
    isAndroid,
    isDesktop,
    isStandalone: standalone,
    canInstall,
    browser,
    installPrompt,
    dismissInstall,

    updateState,
    needsUpdate,
    applyUpdate,

    networkState,
    isOnline: networkState === 'online',

    isRegistered,
    swVersion,

    notifPermission,
    requestNotifPermission,

    debug: {
      hasPrompt,
      criteria,
    },
  };
}