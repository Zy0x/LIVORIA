export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'livoria_pwa_dismissed';
const DISMISS_MS = 3 * 24 * 60 * 60 * 1000;

declare global {
  interface Window {
    __pwa_deferred_prompt?: BeforeInstallPromptEvent | null;
    __pwa_prompt_available?: boolean;
  }
}

export function isDismissed(): boolean {
  try {
    const ts = localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number.parseInt(ts, 10) < DISMISS_MS;
  } catch {
    return false;
  }
}

export function saveDismiss(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export function isIOSDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandaloneMode(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function getNotifPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

export function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return window.__pwa_deferred_prompt ?? null;
}

export function setDeferredPrompt(prompt: BeforeInstallPromptEvent | null): void {
  window.__pwa_deferred_prompt = prompt;
  window.__pwa_prompt_available = Boolean(prompt);
}
