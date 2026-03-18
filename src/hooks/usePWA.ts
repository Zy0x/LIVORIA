/**
 * usePWA.ts
 * 
 * Comprehensive PWA hook untuk LIVORIA.
 * Features:
 * - Service Worker registration & lifecycle
 * - Install prompt (A2HS)
 * - Update detection & notification
 * - Online/offline detection
 * - Push notification subscription
 * - iOS Safari install instructions
 */

import { useState, useEffect, useCallback, useRef } from 'react';

export type InstallState = 'idle' | 'available' | 'installing' | 'installed' | 'unavailable';
export type UpdateState  = 'idle' | 'available' | 'updating';
export type NetworkState = 'online' | 'offline';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  // Install
  installState:   InstallState;
  isIOS:          boolean;
  isStandalone:   boolean;
  canInstall:     boolean;
  installPrompt:  () => Promise<void>;
  dismissInstall: () => void;

  // Update
  updateState:    UpdateState;
  applyUpdate:    () => void;

  // Network
  networkState:   NetworkState;
  isOnline:       boolean;

  // Registration
  isRegistered:   boolean;
  swVersion:      string | null;

  // Notifications
  notifPermission: NotificationPermission | null;
  requestNotifPermission: () => Promise<NotificationPermission>;
}

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (window.navigator as any).standalone === true;

export function usePWA(): PWAState {
  const [installState,     setInstallState]     = useState<InstallState>('idle');
  const [updateState,      setUpdateState]      = useState<UpdateState>('idle');
  const [networkState,     setNetworkState]     = useState<NetworkState>(navigator.onLine ? 'online' : 'offline');
  const [isRegistered,     setIsRegistered]     = useState(false);
  const [swVersion,        setSwVersion]        = useState<string | null>(null);
  const [notifPermission,  setNotifPermission]  = useState<NotificationPermission | null>(
    'Notification' in window ? Notification.permission : null
  );

  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);
  const newSW          = useRef<ServiceWorker | null>(null);
  const dismissedKey   = 'livoria-pwa-install-dismissed';

  const ios       = isIOS();
  const standalone = isStandalone();

  // ── Register Service Worker ──────────────────────────────────────────────
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        swRegistration.current = registration;
        setIsRegistered(true);
        console.log('[PWA] Service Worker registered ✓');

        // Get version
        if (navigator.serviceWorker.controller) {
          const channel = new MessageChannel();
          channel.port1.onmessage = (e) => {
            if (e.data?.version) setSwVersion(e.data.version);
          };
          navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        }

        // Check for waiting SW (update available)
        if (registration.waiting) {
          setUpdateState('available');
          newSW.current = registration.waiting;
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateState('available');
              newSW.current = installing;
              console.log('[PWA] Update available!');
            }
          });
        });

        // Periodic update check
        setInterval(() => registration.update(), 60 * 60 * 1000);

      } catch (err) {
        console.error('[PWA] Service Worker registration failed:', err);
      }
    };

    register();

    // Handle controller change (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (updateState === 'updating') {
        window.location.reload();
      }
    });

    // Background sync message
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        console.log('[PWA] Background sync complete');
      }
    });
  }, []);

  // ── Install Prompt ───────────────────────────────────────────────────────
  useEffect(() => {
    if (standalone) {
      setInstallState('installed');
      return;
    }

    if (ios) {
      const dismissed = sessionStorage.getItem(dismissedKey);
      if (!dismissed) setInstallState('available');
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      const dismissed = sessionStorage.getItem(dismissedKey);
      if (!dismissed) setInstallState('available');
      console.log('[PWA] Install prompt captured');
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setInstallState('installed');
      deferredPrompt.current = null;
      console.log('[PWA] App installed!');
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [ios, standalone]);

  // ── Network Status ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleOnline  = () => setNetworkState('online');
    const handleOffline = () => setNetworkState('offline');

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────
  const installPrompt = useCallback(async () => {
    if (ios) return; // iOS handled by UI instructions

    if (!deferredPrompt.current) return;
    setInstallState('installing');

    try {
      await deferredPrompt.current.prompt();
      const choice = await deferredPrompt.current.userChoice;
      if (choice.outcome === 'accepted') {
        setInstallState('installed');
        console.log('[PWA] User accepted install');
      } else {
        setInstallState('available');
        console.log('[PWA] User dismissed install');
      }
      deferredPrompt.current = null;
    } catch (err) {
      setInstallState('available');
      console.error('[PWA] Install prompt error:', err);
    }
  }, [ios]);

  const dismissInstall = useCallback(() => {
    sessionStorage.setItem(dismissedKey, '1');
    setInstallState('idle');
  }, []);

  const applyUpdate = useCallback(() => {
    if (!newSW.current) return;
    setUpdateState('updating');
    newSW.current.postMessage({ type: 'SKIP_WAITING' });
  }, []);

  const requestNotifPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) return 'denied';
    const permission = await Notification.requestPermission();
    setNotifPermission(permission);
    return permission;
  }, []);

  return {
    installState,
    isIOS: ios,
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