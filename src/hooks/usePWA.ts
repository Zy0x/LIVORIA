/**
 * usePWA.ts — LIVORIA
 *
 * Disederhanakan mengikuti pola SIPENA yang berhasil:
 * 1. Cek window.__pwa_deferred_prompt yang sudah ditangkap di index.html
 * 2. Juga listen event baru jika belum tertangkap
 * 3. localStorage (bukan sessionStorage) untuk dismiss — hilang setelah 3 hari
 * 4. iOS: tampilkan panduan tanpa butuh native prompt
 * 5. Logika showBanner sesederhana mungkin
 */

import { useState, useEffect, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Dismiss storage (localStorage, expiry 3 hari) ────────────────────────────
const DISMISS_KEY = 'livoria_pwa_dismissed';
const DISMISS_MS  = 3 * 24 * 60 * 60 * 1000;

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

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    (window as any).__pwa_deferred_prompt || null
  );
  const [showBanner,  setShowBanner]  = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline,    setIsOnline]    = useState(navigator.onLine);
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const isIOS = isIOSDevice();

  useEffect(() => {
    if (isStandaloneMode()) { setIsInstalled(true); return; }
    if (isDismissed()) return;

    // iOS: tampilkan tanpa butuh native prompt
    if (isIOSDevice()) {
      const t = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(t);
    }

    // Cek prompt yang sudah ditangkap di index.html
    if ((window as any).__pwa_prompt_available) {
      setDeferredPrompt((window as any).__pwa_deferred_prompt);
      setShowBanner(true);
    }

    const handlePrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      (window as any).__pwa_deferred_prompt = evt;
      (window as any).__pwa_prompt_available = true;
      setDeferredPrompt(evt);
      if (!isDismissed()) setShowBanner(true);
    };

    const handleReady = () => {
      const evt = (window as any).__pwa_deferred_prompt;
      if (evt && !isDismissed()) { setDeferredPrompt(evt); setShowBanner(true); }
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('pwa_prompt_ready', handleReady);
    window.addEventListener('appinstalled', () => { setIsInstalled(true); setShowBanner(false); });

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('pwa_prompt_ready', handleReady);
    };
  }, []);

  useEffect(() => {
    const on  = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) setNeedsUpdate(true);
        });
      });
    });
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setIsInstalled(true); setShowBanner(false); }
      else { saveDismiss(); setShowBanner(false); }
    } catch {}
    setDeferredPrompt(null);
    (window as any).__pwa_deferred_prompt = null;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => { saveDismiss(); setShowBanner(false); }, []);
  const applyUpdate   = useCallback(() => {
    navigator.serviceWorker.ready.then(r => r.waiting?.postMessage({ type: 'SKIP_WAITING' }));
    setTimeout(() => window.location.reload(), 500);
  }, []);

  return {
    showBanner: showBanner && !isInstalled,
    isInstalled,
    isStandalone: isStandaloneMode(),
    isIOS,
    isOnline,
    needsUpdate,
    hasNativePrompt: !!deferredPrompt,
    promptInstall,
    dismissBanner,
    applyUpdate,
  };
}