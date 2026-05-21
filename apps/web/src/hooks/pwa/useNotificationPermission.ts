import { useEffect, useState } from 'react';
import { getNotifPermission } from './pwa-platform';

const PERMISSION_SYNC_INTERVAL_MS = 30 * 1000;

export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(getNotifPermission());

  useEffect(() => {
    if (!('Notification' in window)) return;

    const syncPermission = () => setPermission(Notification.permission);
    const syncWhenVisible = () => {
      if (document.visibilityState === 'visible') syncPermission();
    };

    syncPermission();

    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncWhenVisible);

    const interval = window.setInterval(syncPermission, PERMISSION_SYNC_INTERVAL_MS);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncWhenVisible);
    };
  }, []);

  return permission;
}
