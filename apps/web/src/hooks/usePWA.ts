import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type BeforeInstallPromptEvent,
  getDeferredPrompt,
  isDismissed,
  isIOSDevice,
  isStandaloneMode,
  saveDismiss,
  setDeferredPrompt as setGlobalDeferredPrompt,
} from './pwa/pwa-platform';
import { useNotificationPermission } from './pwa/useNotificationPermission';
import { useOnlineStatus } from './pwa/useOnlineStatus';
import { useServiceWorkerUpdate } from './pwa/useServiceWorkerUpdate';
import { pwaLog, pwaWarn } from '@/lib/pwaDebug';

export type { BeforeInstallPromptEvent } from './pwa/pwa-platform';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => getDeferredPrompt());
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode());

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bannerShownRef = useRef(false);

  const isIOS = isIOSDevice();
  const isOnline = useOnlineStatus();
  const notifPerm = useNotificationPermission();
  const {
    needsUpdate,
    isRegistered,
    swVersion,
    lastCheckedAt,
    cacheStatus,
    checkForUpdate,
    clearAppCache,
    applyUpdate,
  } = useServiceWorkerUpdate();

  const clearBannerTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const shouldShow = useCallback(() => {
    if (isInstalled || isStandaloneMode()) return false;
    if (isDismissed()) return false;
    return true;
  }, [isInstalled]);

  const tryShowBanner = useCallback((delay = 0) => {
    if (bannerShownRef.current) return;
    if (!shouldShow()) return;

    clearBannerTimer();

    if (delay === 0) {
      setShowBanner(true);
      bannerShownRef.current = true;
      return;
    }

    timerRef.current = setTimeout(() => {
      if (!bannerShownRef.current && shouldShow()) {
        setShowBanner(true);
        bannerShownRef.current = true;
      }
    }, delay);
  }, [clearBannerTimer, shouldShow]);

  useEffect(() => {
    if (isStandaloneMode()) {
      setIsInstalled(true);
      return;
    }

    if (!shouldShow()) return;

    if (isIOS) {
      tryShowBanner(1000);
      return clearBannerTimer;
    }

    const existingPrompt = getDeferredPrompt();
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
      tryShowBanner(0);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const promptEvent = event as BeforeInstallPromptEvent;
      setGlobalDeferredPrompt(promptEvent);
      setDeferredPrompt(promptEvent);
      pwaLog('[PWA] beforeinstallprompt captured.');
      tryShowBanner(0);
    };

    const handlePromptReady = () => {
      const promptEvent = getDeferredPrompt();
      if (promptEvent && !bannerShownRef.current) {
        setDeferredPrompt(promptEvent);
        tryShowBanner(0);
      }
    };

    const handleAppInstalled = () => {
      pwaLog('[PWA] App installed.');
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      bannerShownRef.current = false;
      clearBannerTimer();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('pwa_prompt_ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      clearBannerTimer();
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [clearBannerTimer, isIOS, shouldShow, tryShowBanner]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      pwaWarn('[PWA] No deferred prompt available');
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      pwaLog('[PWA] User choice:', outcome);
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowBanner(false);
      } else {
        saveDismiss();
        setShowBanner(false);
      }
    } catch (error) {
      pwaWarn('[PWA] prompt() failed:', error);
    }

    setDeferredPrompt(null);
    setGlobalDeferredPrompt(null);
    bannerShownRef.current = false;
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    saveDismiss();
    setShowBanner(false);
    bannerShownRef.current = false;
  }, []);

  const installPrompt = useCallback(() => {
    if (deferredPrompt) {
      promptInstall();
    } else if (isIOS) {
      setShowBanner(true);
    }
  }, [deferredPrompt, isIOS, promptInstall]);

  return {
    showBanner: showBanner && !isInstalled,
    isInstalled,
    isStandalone: isStandaloneMode(),
    isIOS,
    isOnline,
    needsUpdate,
    hasNativePrompt: Boolean(deferredPrompt),

    promptInstall,
    dismissBanner,
    applyUpdate,
    installPrompt,

    isRegistered,
    swVersion,
    lastCheckedAt,
    cacheStatus,
    checkForUpdate,
    clearAppCache,
    updateState: needsUpdate ? 'available' : ('idle' as 'available' | 'idle'),
    notifPermission: notifPerm,
    canInstall: !isInstalled && !isStandaloneMode(),
  };
}
