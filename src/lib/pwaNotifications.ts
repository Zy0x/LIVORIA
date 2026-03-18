/**
 * pwaNotifications.ts
 * 
 * Layanan notifikasi lokal untuk LIVORIA PWA.
 * Mengirim notifikasi tagihan jatuh tempo, pengingat cicilan, dll.
 */

import type { Tagihan } from './types';
import { getReminderStatus, getActivePeriod } from './tagihan-cycle';

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

export function canSendNotifications(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function sendLocalNotification(options: {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  vibrate?: number[];
  requireInteraction?: boolean;
}) {
  if (!canSendNotifications()) return;

  const { title, ...rest } = options;
  
  // Use service worker registration if available for better notification support
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification(title, {
        icon:    '/icons/icon-192x192.png',
        badge:   '/icons/icon-96x96.png',
        vibrate: [200, 100, 200],
        ...rest,
      });
    });
  } else {
    new Notification(title, {
      icon: '/icons/icon-192x192.png',
      ...rest,
    });
  }
}

// ── Schedule bill reminders ────────────────────────────────────────────────────
export function scheduleBillReminders(bills: Tagihan[]) {
  if (!canSendNotifications()) return;

  const today = new Date();
  const criticalBills: Tagihan[] = [];
  const warningBills:  Tagihan[] = [];

  bills.forEach(bill => {
    const status = getReminderStatus(bill, today);
    if (status.level === 'critical' || status.level === 'overdue') {
      criticalBills.push(bill);
    } else if (status.level === 'warning') {
      warningBills.push(bill);
    }
  });

  if (criticalBills.length > 0) {
    const names = criticalBills.slice(0, 2).map(b => b.debitur_nama).join(', ');
    const extra = criticalBills.length > 2 ? ` +${criticalBills.length - 2} lainnya` : '';
    sendLocalNotification({
      title:   '⚠️ Tagihan Kritis!',
      body:    `${names}${extra} — jatuh tempo segera atau sudah overdue`,
      tag:     'livoria-critical',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      data:    { url: '/tagihan', type: 'critical' },
    });
  } else if (warningBills.length > 0) {
    const names = warningBills.slice(0, 2).map(b => b.debitur_nama).join(', ');
    const extra = warningBills.length > 2 ? ` +${warningBills.length - 2} lainnya` : '';
    sendLocalNotification({
      title: '🔔 Pengingat Tagihan',
      body:  `${names}${extra} — jatuh tempo dalam beberapa hari`,
      tag:   'livoria-warning',
      data:  { url: '/tagihan', type: 'warning' },
    });
  }
}

// ── Register periodic background check ────────────────────────────────────────
export async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  
  const registration = await navigator.serviceWorker.ready;
  
  if ('periodicSync' in registration) {
    try {
      await (registration as any).periodicSync.register('livoria-bill-check', {
        minInterval: 24 * 60 * 60 * 1000, // 24 hours
      });
      console.log('[PWA] Periodic sync registered');
    } catch (err) {
      console.log('[PWA] Periodic sync not supported:', err);
    }
  }
}

// ── Register for push notifications (VAPID) ──────────────────────────────────
// In production, replace VAPID_PUBLIC_KEY with your actual key
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjZFONjEJoMM3_VrRkHfgTZw';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding    = '='.repeat((4 - base64String.length % 4) % 4);
  const base64     = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData    = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[PWA] Push not supported');
    return null;
  }

  try {
    const registration   = await navigator.serviceWorker.ready;
    const existingSub    = await registration.pushManager.getSubscription();
    if (existingSub) return existingSub;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly:      true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    console.log('[PWA] Push subscription created:', subscription.endpoint.slice(-8));
    return subscription;
  } catch (err) {
    console.error('[PWA] Push subscription failed:', err);
    return null;
  }
}