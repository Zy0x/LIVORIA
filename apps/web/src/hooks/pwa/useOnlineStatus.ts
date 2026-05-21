import { useEffect, useState } from 'react';

const PWA_PING_TIMEOUT_MS = 3000;

async function verifyNetworkReachable() {
  if (!navigator.onLine) return false;

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), PWA_PING_TIMEOUT_MS);

  try {
    await fetch(`/__pwa_ping?t=${Date.now()}`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeout);
  }
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    let active = true;

    const syncOnlineStatus = async () => {
      if (!navigator.onLine) {
        if (active) setIsOnline(false);
        return;
      }

      const reachable = await verifyNetworkReachable();
      if (active) setIsOnline(reachable);
    };

    const handleOnline = () => {
      setIsOnline(true);
      syncOnlineStatus();
    };
    const handleOffline = () => setIsOnline(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncOnlineStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', syncOnlineStatus);
    document.addEventListener('visibilitychange', handleVisibility);
    syncOnlineStatus();

    return () => {
      active = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', syncOnlineStatus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return isOnline;
}
