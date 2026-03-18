/**
 * usePWA.ts — LIVORIA
 *
 * FIX:
 * 1. iOS: canInstall = true saat iOS Safari & belum standalone & belum di-dismiss
 * 2. Android/Chrome: canInstall = true saat beforeinstallprompt tertangkap & belum di-dismiss
 * 3. Dismiss disimpan di localStorage (bukan sessionStorage) supaya persist antar sesi,
 *    tapi reset setelah 7 hari agar user tetap bisa install di kemudian hari.
 * 4. `isIOS` diperbaiki: cek navigator.userAgent + standalone display mode.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type InstallState   = 'idle' | 'available' | 'installing' | 'installed' | 'unavailable';
export type UpdateState    = 'idle' | 'available' | 'updating';
export type NetworkState   = 'online' | 'offline';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  installState:   InstallState;
  isIOS:          boolean;
  isStandalone:   boolean;
  canInstall:     boolean;
  installPrompt:  () => Promise<void>;
  dismissInstall: () => void;

  updateState:    UpdateState;
  applyUpdate:    () => void;

  networkState:   NetworkState;
  isOnline:       boolean;

  isRegistered:   boolean;
  swVersion:      string | null;

  notifPermission: NotificationPermission | null;
  requestNotifPermission: () => Promise<NotificationPermission>;
}

// ── helpers ──────────────────────────────────────────────────────────────────

function detectIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPad on iOS 13+ reports itself as MacIntel
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

const DISMISS_KEY       = 'livoria-pwa-install-dismissed';
const DISMISS_TTL_MS    = 7 * 24 * 60 * 60 * 1000; // 7 hari

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (Date.now() - ts > DISMISS_TTL_MS) {
      localStorage.removeItem(DISMISS_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function setDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePWA(): PWAState {
  const ios        = detectIOS();
  const standalone = detectStandalone();

  const [installState,    setInstallState]    = useState<InstallState>('idle');
  const [updateState,     setUpdateState]     = useState<UpdateState>('idle');
  const [networkState,    setNetworkState]    = useState<NetworkState>(
    typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
  );
  const [isRegistered,    setIsRegistered]    = useState(false);
  const [swVersion,       setSwVersion]       = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    typeof Notification !== 'undefined' ? Notification.permission : null
  );

  const deferredPrompt  = useRef<BeforeInstallPromptEvent | null>(null);
  const swRegistration  = useRef<ServiceWorkerRegistration | null>(null);
  const newSW           = useRef<ServiceWorker | null>(null);

  // ── Service Worker ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        swRegistration.current = reg;
        setIsRegistered(true);

        // Ambil versi dari SW yang aktif
        if (navigator.serviceWorker.controller) {
          const ch = new MessageChannel();
          ch.port1.onmessage = (e) => { if (e.data?.version) setSwVersion(e.data.version); };
          navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
        }

        // Update tersedia di waiting
        if (reg.waiting) { setUpdateState('available'); newSW.current = reg.waiting; }

        reg.addEventListener('updatefound', () => {
          const installing = reg.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateState('available');
              newSW.current = installing;
            }
          });
        });

        setInterval(() => reg.update(), 60 * 60 * 1000);
      } catch (err) {
        console.error('[PWA] SW registration failed:', err);
      }
    };

    register();

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updateState === 'updating') window.location.reload();
    });
  }, []);

  // ── Install Prompt ──────────────────────────────────────────────────────
  useEffect(() => {
    // Sudah terinstall sebagai standalone → tidak perlu banner
    if (standalone) { setInstallState('installed'); return; }

    if (!isDismissed()) {
      if (ios) {
        // iOS Safari: tidak ada event beforeinstallprompt,
        // langsung set available agar banner iOS muncul
        setInstallState('available');
      }
    }

    // Android / Chrome / Edge — tangkap beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      if (!isDismissed()) setInstallState('available');
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstallState('installed');
      deferredPrompt.current = null;
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [ios, standalone]);

  // ── Network ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => setNetworkState('online');
    const off = () => setNetworkState('offline');
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────
  const installPrompt = useCallback(async () => {
    // iOS: tidak ada native prompt — caller membuka modal instruksi manual
    if (ios) return;

    if (!deferredPrompt.current) return;
    setInstallState('installing');
    try {
      await deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      setInstallState(outcome === 'accepted' ? 'installed' : 'available');
      deferredPrompt.current = null;
    } catch {
      setInstallState('available');
    }
  }, [ios]);

  const dismissInstall = useCallback(() => {
    setDismissed();
    setInstallState('idle');
  }, []);

  const applyUpdate = useCallback(() => {
    if (!newSW.current) return;
    setUpdateState('updating');
    newSW.current.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  const requestNotifPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    const p = await Notification.requestPermission();
    setNotifPermission(p);
    return p;
  }, []);

  return {
    installState,
    isIOS:      ios,
    isStandalone: standalone,
    // canInstall = true jika banner harus ditampilkan
    canInstall: installState === 'available',
    installPrompt,
    dismissInstall,

    updateState,
    applyUpdate,

    networkState,
    isOnline: networkState === 'online',

    isRegistered,
    swVersion,

    notifPermission,
    requestNotifPermission,
  };
}