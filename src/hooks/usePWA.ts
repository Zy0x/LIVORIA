/**
 * usePWA.ts — LIVORIA
 *
 * Perbaikan komprehensif:
 * 1. Expose semua properti yang dipakai PWASettings.tsx (isRegistered, swVersion, dll)
 * 2. Fallback banner untuk browser yang tidak support beforeinstallprompt (Firefox, desktop Chrome tanpa kondisi)
 * 3. Threshold dismiss diperpendek jadi 1 hari untuk testing
 * 4. showBanner logic diperbaiki agar lebih agresif
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Dismiss storage ───────────────────────────────────────────────────────────
const DISMISS_KEY = 'livoria_pwa_dismissed';
const DISMISS_MS  = 24 * 60 * 60 * 1000; // 1 hari (lebih pendek untuk testing)

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
    (window as any).__pwa_deferred_prompt || null
  );
  const [showBanner,    setShowBanner]    = useState(false);
  const [isInstalled,   setIsInstalled]   = useState(isStandaloneMode());
  const [isOnline,      setIsOnline]      = useState(navigator.onLine);
  const [needsUpdate,   setNeedsUpdate]   = useState(false);
  const [swRegistered,  setSwRegistered]  = useState(false);
  const [swVersion,     setSwVersion]     = useState<string | null>(null);
  const [notifPerm,     setNotifPerm]     = useState<NotificationPermission>(getNotifPermission());
  const isIOS = isIOSDevice();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Helper: should we show the banner? ──────────────────────────────────
  const shouldShow = useCallback(() => {
    if (isInstalled || isStandaloneMode()) return false;
    if (isDismissed()) return false;
    return true;
  }, [isInstalled]);

  // ── Main effect: capture prompt & decide banner visibility ───────────────
  useEffect(() => {
    // Already installed as PWA
    if (isStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    // iOS: show banner after 2s delay (no native prompt available)
    if (isIOS) {
      if (shouldShow()) {
        timerRef.current = setTimeout(() => setShowBanner(true), 2000);
      }
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }

    // Check if prompt was already captured in index.html before React loaded
    if ((window as any).__pwa_prompt_available && (window as any).__pwa_deferred_prompt) {
      const existingPrompt = (window as any).__pwa_deferred_prompt as BeforeInstallPromptEvent;
      setDeferredPrompt(existingPrompt);
      if (shouldShow()) {
        timerRef.current = setTimeout(() => setShowBanner(true), 1500);
      }
    }

    // Also listen for future prompt events
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      (window as any).__pwa_deferred_prompt = evt;
      (window as any).__pwa_prompt_available = true;
      setDeferredPrompt(evt);
      if (shouldShow()) {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setShowBanner(true), 500);
      }
    };

    // Custom event dispatched from index.html
    const handlePromptReady = () => {
      const evt = (window as any).__pwa_deferred_prompt;
      if (evt && shouldShow()) {
        setDeferredPrompt(evt);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setShowBanner(true), 500);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    // ── Fallback: show banner even without native prompt ──────────────────
    // For browsers that don't fire beforeinstallprompt (Firefox, some desktop Chrome)
    // We still show the banner with manual install instructions after 3s
    if (!isIOS && shouldShow()) {
      timerRef.current = setTimeout(() => {
        // Show banner regardless — let PWAManager handle the UX based on hasNativePrompt
        setShowBanner(true);
      }, 3000);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isIOS, shouldShow]);

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

      // Get SW version via message
      const mc = new MessageChannel();
      mc.port1.onmessage = e => {
        if (e.data?.version) setSwVersion(e.data.version);
      };
      reg.active?.postMessage({ type: 'GET_VERSION' }, [mc.port2]);

      // Update detection
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
    // Poll every 2s (Notification API doesn't have a change event)
    const interval = setInterval(checkPerm, 2000);
    return () => clearInterval(interval);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
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
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    saveDismiss();
    setShowBanner(false);
  }, []);

  const applyUpdate = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
      });
    }
    setTimeout(() => window.location.reload(), 500);
  }, []);

  // For PWASettings — install prompt trigger
  const installPrompt = useCallback(() => {
    if (deferredPrompt) {
      promptInstall();
    } else if (isIOS) {
      // iOS: trigger IOSGuide via showBanner
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
    installPrompt, // alias used by PWASettings

    // PWASettings properties
    isRegistered: swRegistered,
    swVersion,
    updateState: needsUpdate ? 'available' : ('idle' as 'available' | 'idle'),
    notifPermission: notifPerm,
    canInstall: !isInstalled && !isStandaloneMode(),
  };
}