/**
 * usePWA.ts — LIVORIA v2
 *
 * Improved PWA hook:
 * 1. More reliable install prompt detection (captures early event from index.html)
 * 2. Cleaner state management
 * 3. Proper iOS detection including iPadOS
 * 4. Better banner timing logic
 * 5. Tracks installed state accurately
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ── Persistence helpers ───────────────────────────────────────────────────────
const DISMISS_KEY   = 'livoria_pwa_dismissed_at';
const DISMISS_HOURS = 72; // re-show banner after 3 days

function wasDismissedRecently(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - parseInt(ts, 10) < DISMISS_HOURS * 60 * 60 * 1000;
  } catch { return false; }
}

function saveDismiss() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
}

// ── Platform detection ────────────────────────────────────────────────────────
function detectIOS(): boolean {
  // iPadOS 13+ reports as Mac, but has touch points
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isChromiumBrowser(): boolean {
  const ua = navigator.userAgent;
  return /Chrome|Chromium|CriOS|EdgA|SamsungBrowser/.test(ua) && !/Firefox|FxiOS/.test(ua);
}

// ─────────────────────────────────────────────────────────────────────────────

export function usePWA() {
  const isIOS     = detectIOS();
  const isDesktop = !('ontouchstart' in window) && window.innerWidth > 768;

  const [prompt,       setPrompt]       = useState<BeforeInstallPromptEvent | null>(
    () => (window as any).__pwa_deferred_prompt || null
  );
  const [showBanner,   setShowBanner]   = useState(false);
  const [isInstalled,  setIsInstalled]  = useState(() => isStandalone() || !!(window as any).__pwa_installed);
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);
  const [needsUpdate,  setNeedsUpdate]  = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);
  const [swVersion,    setSwVersion]    = useState<string | null>(null);
  const [notifPerm,    setNotifPerm]    = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const bannerTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerShownRef  = useRef(false);

  // ── Show banner if conditions are met ────────────────────────────────────
  const maybeShowBanner = useCallback((delay = 0) => {
    if (bannerShownRef.current) return;
    if (isInstalled || isStandalone()) return;
    if (wasDismissedRecently()) return;

    if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = setTimeout(() => {
      if (!isStandalone() && !bannerShownRef.current) {
        setShowBanner(true);
        bannerShownRef.current = true;
      }
    }, delay);
  }, [isInstalled]);

  // ── Main effect ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    // iOS: manual guide (no native install API)
    if (isIOS) {
      maybeShowBanner(2500);
    }

    // Handle prompt already captured by index.html before React mounted
    if ((window as any).__pwa_prompt_available && (window as any).__pwa_deferred_prompt) {
      setPrompt((window as any).__pwa_deferred_prompt);
      maybeShowBanner(1000);
    }

    // Listen for prompt fired after React mounted
    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const evt = e as BeforeInstallPromptEvent;
      (window as any).__pwa_deferred_prompt  = evt;
      (window as any).__pwa_prompt_available = true;
      setPrompt(evt);
      maybeShowBanner(800);
    };

    // Custom event from index.html (early capture)
    const onPromptReady = () => {
      const evt = (window as any).__pwa_deferred_prompt;
      if (evt) { setPrompt(evt); maybeShowBanner(600); }
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setPrompt(null);
      bannerShownRef.current = false;
      (window as any).__pwa_installed = true;
      (window as any).__pwa_deferred_prompt = null;
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('pwa_prompt_ready',    onPromptReady);
    window.addEventListener('pwa_installed',       onAppInstalled);
    window.addEventListener('appinstalled',        onAppInstalled);

    // Desktop Chrome/Edge: show banner even if prompt not fired
    // (browser evaluates PWA criteria asynchronously)
    if (isDesktop && isChromiumBrowser() && !isInstalled) {
      maybeShowBanner(8000);
    }

    return () => {
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('pwa_prompt_ready',    onPromptReady);
      window.removeEventListener('pwa_installed',       onAppInstalled);
      window.removeEventListener('appinstalled',        onAppInstalled);
    };
  }, [isIOS, isInstalled, isDesktop, maybeShowBanner]);

  // ── Online / Offline ──────────────────────────────────────────────────
  useEffect(() => {
    const setOnline  = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online',  setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online',  setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  // ── Service Worker ────────────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      setSwRegistered(true);
      // Get SW version
      const ch = new MessageChannel();
      ch.port1.onmessage = e => { if (e.data?.version) setSwVersion(e.data.version); };
      reg.active?.postMessage({ type: 'GET_VERSION' }, [ch.port2]);

      // Listen for updates
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

    // Poll notification permission (permission can change externally)
    const permCheck = setInterval(() => {
      if ('Notification' in window) setNotifPerm(Notification.permission);
    }, 3000);
    return () => clearInterval(permCheck);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────
  const promptInstall = useCallback(async () => {
    if (!prompt) { console.warn('[PWA] No prompt available'); return; }
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      } else {
        saveDismiss();
        setShowBanner(false);
      }
    } catch (err) {
      console.warn('[PWA] prompt() error:', err);
    }
    setPrompt(null);
    (window as any).__pwa_deferred_prompt = null;
    bannerShownRef.current = false;
  }, [prompt]);

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
    // Small delay so SW can take control before reload
    setTimeout(() => window.location.reload(), 300);
  }, []);

  const installPrompt = useCallback(() => {
    if (prompt) promptInstall();
    // For iOS or no-prompt situations, the banner handles UI
  }, [prompt, promptInstall]);

  return {
    // State
    showBanner:      showBanner && !isInstalled,
    isInstalled,
    isStandalone:    isStandalone(),
    isIOS,
    isOnline,
    needsUpdate,
    hasNativePrompt: !!prompt,

    // SW state
    isRegistered:  swRegistered,
    swVersion,
    updateState:   needsUpdate ? 'available' : ('idle' as 'available' | 'idle'),
    notifPermission: notifPerm,
    canInstall:    !isInstalled && !isStandalone(),

    // Actions
    promptInstall,
    dismissBanner,
    applyUpdate,
    installPrompt,
  };
}