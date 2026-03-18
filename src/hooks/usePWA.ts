/**
 * usePWA.ts — LIVORIA
 *
 * PERBAIKAN KRITIS:
 * 1. beforeinstallprompt ditangkap LANGSUNG di useEffect pertama, tanpa kondisi apapun.
 * 2. Dismiss hanya menyembunyikan banner UI — tidak memblokir event dari browser.
 * 3. Setelah dismiss, jika user buka halaman baru, banner tidak muncul lagi (sesuai UX).
 * 4. Android & desktop: ikuti standar beforeinstallprompt.
 * 5. iOS: tetap tampil manual instruction.
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

// Dismiss hanya berlaku selama sesi saat ini (sessionStorage)
// Sehingga saat user reload/buka baru, banner muncul lagi
const DISMISS_KEY = 'livoria-pwa-install-dismissed';

function isDismissedThisSession(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

function setDismissedThisSession(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, '1');
  } catch {}
}

// Juga clear localStorage lama jika ada (migration)
function clearOldDismiss(): void {
  try {
    localStorage.removeItem('livoria-pwa-install-dismissed');
  } catch {}
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

  // Simpan deferred prompt di ref agar tidak trigger re-render
  const deferredPromptRef   = useRef<BeforeInstallPromptEvent | null>(null);
  const swRegistration      = useRef<ServiceWorkerRegistration | null>(null);
  const newSW               = useRef<ServiceWorker | null>(null);

  // ── 1. Tangkap beforeinstallprompt PERTAMA KALI — tanpa kondisi apapun ──
  // Ini WAJIB dipasang sedini mungkin karena Chrome hanya dispatch event ini
  // sekali saat pertama kali memenuhi PWA criteria
  useEffect(() => {
    // Clear dismiss lama dari localStorage
    clearOldDismiss();

    // Jika sudah standalone (sudah terinstall), tidak perlu apa-apa
    if (standalone) {
      setInstallState('installed');
      return;
    }

    // iOS tidak punya beforeinstallprompt
    if (ios) {
      if (!isDismissedThisSession()) {
        setInstallState('available');
      }
      return;
    }

    // Android/Chrome/Edge/Desktop: tangkap event
    const handler = (e: Event) => {
      // Selalu prevent default dan simpan event
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;

      console.log('[PWA] beforeinstallprompt ditangkap!');

      // Tampilkan banner kecuali user sudah dismiss di sesi ini
      if (!isDismissedThisSession()) {
        setInstallState('available');
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Dengarkan jika sudah terinstall
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App berhasil diinstall!');
      setInstallState('installed');
      deferredPromptRef.current = null;
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Service Worker Registration ──────────────────────────────────────
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

        console.log('[PWA] Service Worker terdaftar:', reg.scope);

        if (navigator.serviceWorker.controller) {
          const ch = new MessageChannel();
          ch.port1.onmessage = (e) => {
            if (e.data?.version) setSwVersion(e.data.version);
          };
          navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [ch.port2]);
        }

        if (reg.waiting) {
          setUpdateState('available');
          newSW.current = reg.waiting;
        }

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

        // Cek update setiap 1 jam
        setInterval(() => reg.update(), 60 * 60 * 1000);
      } catch (err) {
        console.error('[PWA] SW registration gagal:', err);
      }
    };

    register();

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updateState === 'updating') window.location.reload();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 3. Network ──────────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => setNetworkState('online');
    const off = () => setNetworkState('offline');
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online',  on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // ── 4. Actions ──────────────────────────────────────────────────────────
  const installPrompt = useCallback(async () => {
    if (ios) return; // iOS: caller buka IOSInstallModal

    const prompt = deferredPromptRef.current;
    if (!prompt) {
      console.warn('[PWA] Tidak ada deferred prompt tersimpan');
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
        // User tolak native prompt — simpan di session
        setDismissedThisSession();
        setInstallState('idle');
      }
      deferredPromptRef.current = null;
    } catch (err) {
      console.error('[PWA] installPrompt error:', err);
      setInstallState('available');
    }
  }, [ios]);

  const dismissInstall = useCallback(() => {
    setDismissedThisSession();
    setInstallState('idle');
    // Jangan null-kan deferredPrompt — masih bisa dipakai nanti di sesi ini
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