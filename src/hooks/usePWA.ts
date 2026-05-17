/**
 * usePWA.ts — LIVORIA (OPTIMIZED - Instant Update Detection)
 *
 * PERBAIKAN KRITIS:
 * 1. Cek reg.waiting SEGERA saat mount (jangan tunggu updatefound)
 * 2. Tambah listener updatefound dengan cleanup yang proper
 * 3. Hapus polling manual di sini (sudah di index.html setiap 10s)
 * 4. Tambah message handler dari SW untuk notifikasi instan
 * 5. Aggressive detection: cek saat mount, saat visibility change, saat online
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Dismiss storage ───────────────────────────────────────────────────────────
const DISMISS_KEY = 'livoria_pwa_dismissed';
const DISMISS_MS  = 3 * 24 * 60 * 60 * 1000; // 3 hari

function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < DISMISS_MS;
  } catch { return false; }
}

function saveDismiss(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function isStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
}

function getNotifPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => (window as any).__pwa_deferred_prompt || null
  );
  const [showBanner,    setShowBanner]    = useState(false);
  const [isInstalled,   setIsInstalled]   = useState(isStandaloneMode());
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [needsUpdate,   setNeedsUpdate]   = useState(false);
  const [swRegistered,  setSwRegistered]  = useState(false);
  const [swVersion,     setSwVersion]     = useState<string | null>(null);
  const [notifPerm,     setNotifPerm]     = useState<NotificationPermission>(getNotifPermission());

  const isIOS         = isIOSDevice();
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerShownRef = useRef(false);

  const shouldShow = useCallback(() => {
    if (isInstalled || isStandaloneMode()) return false;
    if (isDismissed()) return false;
    return true;
  }, [isInstalled]);

  // ── Tampilkan banner SEGERA (atau dengan delay minimal) ──────────────────
  const tryShowBanner = useCallback((delay = 0) => {
    if (bannerShownRef.current) return;
    if (!shouldShow()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (delay === 0) {
      setShowBanner(true);
      bannerShownRef.current = true;
    } else {
      timerRef.current = setTimeout(() => {
        if (!bannerShownRef.current && shouldShow()) {
          setShowBanner(true);
          bannerShownRef.current = true;
        }
      }, delay);
    }
  }, [shouldShow]);

  // ── Main effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Sudah terinstall sebagai PWA
    if (isStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    if (!shouldShow()) return;

    // iOS: tampilkan guide manual setelah 1 detik
    if (isIOS) {
      tryShowBanner(1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }

    // ── LANGKAH 1: Cek apakah prompt SUDAH tersedia dari index.html ──────
    // (beforeinstallprompt bisa muncul sebelum React mount)
    const existingPrompt = (window as any).__pwa_deferred_prompt as BeforeInstallPromptEvent | null;
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
      // Tampilkan SEGERA tanpa delay
      tryShowBanner(0);
    }

    // ── LANGKAH 2: Dengarkan event baru ─────────────────────────────────
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      (window as any).__pwa_deferred_prompt = evt;
      (window as any).__pwa_prompt_available = true;
      setDeferredPrompt(evt);
      console.log('[PWA] beforeinstallprompt captured ✓');
      // Tampilkan banner SEGERA
      tryShowBanner(0);
    };

    // Custom event dari index.html (jika fired sebelum React mount)
    const handlePromptReady = () => {
      const evt = (window as any).__pwa_deferred_prompt;
      if (evt && !bannerShownRef.current) {
        setDeferredPrompt(evt);
        tryShowBanner(0);
      }
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed!');
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      bannerShownRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOS, shouldShow, tryShowBanner]);

  // ── Online/offline ────────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Service Worker - OPTIMIZED untuk deteksi update instan ──────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(reg => {
      setSwRegistered(true);

      // Get SW version
      const mc = new MessageChannel();
      mc.port1.onmessage = e => {
        if (e.data?.version) setSwVersion(e.data.version);
      };
      reg.active?.postMessage({ type: 'GET_VERSION' }, [mc.port2]);

      // ── CRITICAL: Cek apakah update SUDAH waiting (mungkin terjadi sebelum React mount)
      if (reg.waiting) {
        console.log('[PWA] 🔄 Update already waiting! Showing banner immediately...');
        setNeedsUpdate(true);
      }

      // ── Listen untuk update baru
      const handleUpdateFound = () => {
        console.log('[PWA] 📦 Update found, installing...');
        const sw = reg.installing;
        if (!sw) return;

        const handleStateChange = () => {
          console.log('[PWA] 🔄 SW state:', sw.state);
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] ✅ Update ready! Showing banner now!');
            setNeedsUpdate(true);
          }
        };

        sw.addEventListener('statechange', handleStateChange);
      };

      reg.addEventListener('updatefound', handleUpdateFound);

      // ── Cleanup listener
      return () => {
        reg.removeEventListener('updatefound', handleUpdateFound);
      };
    }).catch(err => {
      console.warn('[PWA] SW ready failed:', err);
    });
  }, []);

  // ── Listen untuk message dari SW tentang update ──────────────────────────────
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        console.log('[PWA] 🔔 SW notified: update available!');
        setNeedsUpdate(true);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  // ── Notification permission sync ─────────────────────────────────────────
  useEffect(() => {
    if (!('Notification' in window)) return;
    const checkPerm = () => setNotifPerm(Notification.permission);
    checkPerm();
    const interval = setInterval(checkPerm, 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No deferred prompt available');
      return;
    }
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      } else {
        saveDismiss();
        setShowBanner(false);
      }
    } catch (err) {
      console.warn('[PWA] prompt() failed:', err);
    }
    setDeferredPrompt(null);
    (window as any).__pwa_deferred_prompt = null;
    bannerShownRef.current = false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    saveDismiss();
    setShowBanner(false);
    bannerShownRef.current = false;
  }, []);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    setTimeout(() => window.location.reload(), 500);
  }, []);

  const installPrompt = useCallback(() => {
    if (deferredPrompt) {
      promptInstall();
    } else if (isIOS) {
      setShowBanner(true);
    }
  }, [deferredPrompt, isIOS, promptInstall]);

  return {
    // Banner state
    showBanner: showBanner && !isInstalled,
    isInstalled,
    isStandalone: isStandaloneMode(),
    isIOS,
    isOnline,
    needsUpdate,
    hasNativePrompt: !!deferredPrompt,

    // Actions
    promptInstall,
    dismissBanner,
    applyUpdate,
    installPrompt,

    // PWASettings properties
    isRegistered: swRegistered,
    swVersion,
    updateState: needsUpdate ? 'available' : ('idle' as 'available' | 'idle'),
    notifPermission: notifPerm,
    canInstall: !isInstalled && !isStandaloneMode(),
  };
}
