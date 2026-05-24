import { useCallback, useEffect, useRef, useState } from 'react';
import { pwaLog, pwaWarn } from '@/lib/pwaDebug';

export interface PwaCacheStatus {
  version: string;
  caches: Array<{ name: string; entries: number }>;
  totalEntries: number;
  timestamp: number;
}

type ServiceWorkerMessageResponse<T> =
  | { success: true; status?: T; version?: string }
  | { success: false; error?: string };

function postMessageToServiceWorker<T>(
  registration: ServiceWorkerRegistration,
  message: Record<string, unknown>,
  timeoutMs = 2500,
): Promise<T | null> {
  const worker = registration.active ?? navigator.serviceWorker.controller;
  if (!worker) return Promise.resolve(null);

  return new Promise((resolve) => {
    const channel = new MessageChannel();
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      resolve(null);
    }, timeoutMs);

    channel.port1.onmessage = (event: MessageEvent<ServiceWorkerMessageResponse<T>>) => {
      window.clearTimeout(timeout);
      channel.port1.close();

      if (event.data?.success === false) {
        resolve(null);
        return;
      }

      resolve((event.data?.status ?? event.data) as T);
    };

    worker.postMessage(message, [channel.port2]);
  });
}

export function useServiceWorkerUpdate() {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [swVersion, setSwVersion] = useState<string | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [cacheStatus, setCacheStatus] = useState<PwaCacheStatus | null>(null);
  const reloadPendingRef = useRef(false);

  const refreshCacheStatus = useCallback(async (registration?: ServiceWorkerRegistration) => {
    if (!('serviceWorker' in navigator)) return null;

    const activeRegistration = registration ?? (await navigator.serviceWorker.ready);
    const status = await postMessageToServiceWorker<PwaCacheStatus>(
      activeRegistration,
      { type: 'GET_CACHE_STATUS' },
    );

    if (status) {
      setCacheStatus(status);
      setSwVersion(status.version);
    }

    return status;
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      setLastCheckedAt(Date.now());
      await registration.update().catch(() => {});

      const hasWaitingUpdate = Boolean(registration.waiting);
      if (hasWaitingUpdate) setNeedsUpdate(true);
      await refreshCacheStatus(registration);

      return hasWaitingUpdate;
    } catch (error) {
      pwaWarn('[PWA] Manual update check failed:', error);
      return false;
    }
  }, [refreshCacheStatus]);

  const clearAppCache = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return false;

    try {
      const registration = await navigator.serviceWorker.ready;
      const response = await postMessageToServiceWorker<{ success?: boolean }>(
        registration,
        { type: 'CLEAR_CACHE' },
        5000,
      );

      if (!response && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('livoria-')).map((key) => caches.delete(key)));
      }

      setCacheStatus(null);
      await refreshCacheStatus(registration);
      return true;
    } catch (error) {
      pwaWarn('[PWA] Clear app cache failed:', error);
      return false;
    }
  }, [refreshCacheStatus]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let active = true;
    let cleanupRegistration: (() => void) | undefined;

    navigator.serviceWorker.ready
      .then((registration) => {
        if (!active) return;

        setIsRegistered(true);
        setLastCheckedAt(Date.now());

        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data?.version) setSwVersion(event.data.version);
        };
        registration.active?.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
        refreshCacheStatus(registration);

        if (registration.waiting) {
          pwaLog('[PWA] Update already waiting. Showing banner immediately.');
          setNeedsUpdate(true);
        }

        const handleUpdateFound = () => {
          pwaLog('[PWA] Update found, installing.');
          const serviceWorker = registration.installing;
          if (!serviceWorker) return;

          const handleStateChange = () => {
            pwaLog('[PWA] SW state:', serviceWorker.state);
            if (serviceWorker.state === 'installed' && navigator.serviceWorker.controller) {
              pwaLog('[PWA] Update ready. Showing banner.');
              setNeedsUpdate(true);
            }
          };

          serviceWorker.addEventListener('statechange', handleStateChange);
        };

        registration.addEventListener('updatefound', handleUpdateFound);
        cleanupRegistration = () => registration.removeEventListener('updatefound', handleUpdateFound);
      })
      .catch((error) => {
        pwaWarn('[PWA] SW ready failed:', error);
      });

    return () => {
      active = false;
      cleanupRegistration?.();
    };
  }, []);

  useEffect(() => {
    const handleUpdateReady = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      pwaLog('[PWA] Instant update event received');
      if (detail?.version) setSwVersion(String(detail.version));
      setNeedsUpdate(true);
    };

    const handleControllerReady = () => {
      if (!reloadPendingRef.current) return;
      window.location.reload();
    };

    window.addEventListener('livoria-pwa-update-ready', handleUpdateReady as EventListener);
    window.addEventListener('livoria-pwa-controller-ready', handleControllerReady as EventListener);

    return () => {
      window.removeEventListener('livoria-pwa-update-ready', handleUpdateReady as EventListener);
      window.removeEventListener('livoria-pwa-controller-ready', handleControllerReady as EventListener);
    };
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_AVAILABLE') {
        pwaLog('[PWA] Service worker notified: update available.');
        setNeedsUpdate(true);
      }
      if (event.data?.type === 'PWA_READY') {
        setIsRegistered(true);
        if (event.data.version) setSwVersion(event.data.version);
        refreshCacheStatus();
      }
      if (event.data?.type === 'CACHE_CLEARED') {
        setCacheStatus(null);
        refreshCacheStatus();
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, []);

  const applyUpdate = useCallback(() => {
    reloadPendingRef.current = true;

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (registration) => {
        await postMessageToServiceWorker<{ success?: boolean }>(
          registration,
          { type: 'CLEAR_CACHE' },
          5000,
        ).catch(() => null);

        registration.update().catch(() => {});
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      }).catch(() => {
        window.location.reload();
      });
    } else {
      window.location.reload();
    }

    window.setTimeout(() => {
      if (reloadPendingRef.current) {
        window.location.reload();
      }
    }, 1500);
  }, []);

  return {
    needsUpdate,
    isRegistered,
    swVersion,
    lastCheckedAt,
    cacheStatus,
    checkForUpdate,
    clearAppCache,
    applyUpdate,
  };
}
