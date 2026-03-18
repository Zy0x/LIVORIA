/**
 * usePWA.ts — LIVORIA (FIXED)
 *
 * Root cause fix:
 * 1. Jangan tampilkan banner kecuali ada native prompt (Android Chrome)
 *    ATAU platform iOS (butuh panduan manual)
 * 2. Fallback "browser tidak mendukung" hanya tampil di desktop non-Chrome/Edge
 * 3. Race condition: cek window.__pwa_deferred_prompt lebih awal + listen event
 * 4. Hapus timeout fallback 3 detik yang memaksa banner tampil tanpa prompt
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

/**
 * Apakah browser ini BISA mendukung PWA install prompt?
 * Chrome/Edge/Samsung Browser on Android = YES
 * Safari iOS = NO (butuh manual guide)
 * Firefox = NO
 * Desktop Chrome/Edge = YES (tapi jarang fire tanpa kriteria tertentu)
 */
function canReceiveInstallPrompt(): boolean {
  const ua = navigator.userAgent;
  // Chrome atau Edge (bukan Firefox, bukan Safari pure)
  const isChromium = /Chrome|Chromium|CriOS/.test(ua) && !/Firefox|FxiOS/.test(ua);
  const isEdge     = /Edg\//.test(ua);
  const isSamsung  = /SamsungBrowser/.test(ua);
  return isChromium || isEdge || isSamsung;
}

function isDesktop(): boolean {
  return !('ontouchstart' in window) && window.innerWidth > 768;
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

  const isIOS     = isIOSDevice();
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track apakah prompt sudah pernah dicoba ditampilkan
  const bannerShownRef = useRef(false);

  const shouldShow = useCallback(() => {
    if (isInstalled || isStandaloneMode()) return false;
    if (isDismissed()) return false;
    return true;
  }, [isInstalled]);

  const tryShowBanner = useCallback((delay = 0) => {
    if (bannerShownRef.current) return;
    if (!shouldShow()) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setShowBanner(true);
      bannerShownRef.current = true;
    }, delay);
  }, [shouldShow]);

  // ── Main effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Sudah terinstall sebagai PWA
    if (isStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // iOS: tampilkan guide manual
    if (isIOS) {
      if (shouldShow()) tryShowBanner(2000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }

    // --- Android/Desktop Chrome ---

    // Cek apakah prompt sudah tersedia dari index.html (captured early)
    if ((window as any).__pwa_prompt_available && (window as any).__pwa_deferred_prompt) {
      const existingPrompt = (window as any).__pwa_deferred_prompt as BeforeInstallPromptEvent;
      setDeferredPrompt(existingPrompt);
      tryShowBanner(800);
    }

    // Handler untuk event baru
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      (window as any).__pwa_deferred_prompt = evt;
      (window as any).__pwa_prompt_available = true;
      setDeferredPrompt(evt);
      console.log('[PWA] beforeinstallprompt captured in React hook ✓');
      tryShowBanner(500);
    };

    // Custom event dari index.html (jika fired sebelum React mount)
    const handlePromptReady = () => {
      const evt = (window as any).__pwa_deferred_prompt;
      if (evt) {
        setDeferredPrompt(evt);
        tryShowBanner(500);
      }
    };

    const handleAppInstalled = () => {
      console.log('[PWA] App installed!');
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      bannerShownRef.current = false;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    // ── Desktop fallback ──────────────────────────────────────────────────
    // Di desktop Chrome/Edge yang support PWA tapi belum fire beforeinstallprompt
    // (misal: kriteria PWA belum terpenuhi), tampilkan info setelah 8 detik
    // HANYA jika browser memang capable menerima install prompt
    if (isDesktop() && canReceiveInstallPrompt() && shouldShow()) {
      timerRef.current = setTimeout(() => {
        if (!bannerShownRef.current) {
          setShowBanner(true);
          bannerShownRef.current = true;
        }
      }, 8000);
    }

    // Mobile non-iOS yang capable (Android Chrome) tapi belum fire prompt:
    // Tunggu lebih lama — browser mungkin masih evaluasi kriteria PWA
    if (!isIOS && !isDesktop() && canReceiveInstallPrompt() && shouldShow()) {
      timerRef.current = setTimeout(() => {
        // Cek sekali lagi apakah prompt sudah tersedia
        if ((window as any).__pwa_deferred_prompt && !bannerShownRef.current) {
          setDeferredPrompt((window as any).__pwa_deferred_prompt);
          setShowBanner(true);
          bannerShownRef.current = true;
        }
        // Jika masih belum ada prompt setelah 10 detik di Chrome Android,
        // kemungkinan kondisi PWA belum terpenuhi (HTTPS, manifest, SW, dll)
        // Jangan tampilkan banner yang misleading
      }, 10000);
    }

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

  // ── Service Worker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then(reg => {
      setSwRegistered(true);

      const mc = new MessageChannel();
      mc.port1.onmessage = e => {
        if (e.data?.version) setSwVersion(e.data.version);
      };
      reg.active?.postMessage({ type: 'GET_VERSION' }, [mc.port2]);

      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedsUpdate(true);
          }
        });
      });
    }).catch(() => {});
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