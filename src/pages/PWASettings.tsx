/**
 * PWASettings.tsx
 *
 * Komponen pengaturan PWA untuk halaman Settings.
 * Menampilkan status Service Worker, notifikasi, dan versi cache.
 */

import { useState, useEffect } from 'react';
import { Bell, BellOff, RefreshCw, Wifi, WifiOff, Smartphone, Shield } from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import {
  requestNotificationPermission,
  canSendNotifications,
  sendLocalNotification,
} from '@/lib/pwaNotifications';

export default function PWASettings() {
  const pwa = usePWA();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    setNotifEnabled(canSendNotifications());
  }, []);

  const handleRequestNotif = async () => {
    setNotifLoading(true);
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
    setNotifLoading(false);
  };

  const handleTestNotif = () => {
    sendLocalNotification({
      title: 'LIVORIA Test 🔔',
      body: 'Notifikasi berhasil diaktifkan! Kamu akan menerima pengingat tagihan.',
      tag: 'livoria-test',
    });
    setTestSent(true);
    setTimeout(() => setTestSent(false), 3000);
  };

  const handleUpdate = () => {
    pwa.applyUpdate();
  };

  return (
    <div className="stat-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h3 className="font-semibold text-foreground text-sm sm:text-base">PWA & Notifikasi</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Pengaturan Progressive Web App dan notifikasi tagihan
          </p>
        </div>
      </div>

      <div className="space-y-3 sm:pl-[52px]">

        {/* ── Status Online/Offline ── */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            {pwa.isOnline
              ? <Wifi className="w-4 h-4 text-success" />
              : <WifiOff className="w-4 h-4 text-destructive" />
            }
            <span className="text-xs sm:text-sm text-muted-foreground">Status Koneksi</span>
          </div>
          <span className={`text-xs sm:text-sm font-medium ${pwa.isOnline ? 'text-success' : 'text-destructive'}`}>
            {pwa.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* ── Service Worker ── */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-info" />
            <span className="text-xs sm:text-sm text-muted-foreground">Service Worker</span>
          </div>
          <div className="flex items-center gap-2">
            {pwa.isRegistered
              ? <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Aktif
                </span>
              : <span className="text-xs text-muted-foreground">Tidak aktif</span>
            }
            {pwa.swVersion && (
              <span className="text-[10px] text-muted-foreground font-mono">
                v{pwa.swVersion}
              </span>
            )}
          </div>
        </div>

        {/* ── Install Status ── */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <span className="text-xs sm:text-sm text-muted-foreground">Mode Instalasi</span>
          <span className="text-xs sm:text-sm font-medium text-foreground">
            {pwa.isStandalone ? '📱 Standalone (Terinstal)' : '🌐 Browser'}
          </span>
        </div>

        {/* ── Update ── */}
        {pwa.updateState === 'available' && (
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-info" />
              <span className="text-xs sm:text-sm text-muted-foreground">Pembaruan Tersedia</span>
            </div>
            <button
              onClick={handleUpdate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-info text-white text-xs font-medium hover:opacity-90 transition-all min-h-[32px]"
            >
              <RefreshCw className="w-3 h-3" /> Update Sekarang
            </button>
          </div>
        )}

        {/* ── Notifikasi ── */}
        <div className="flex items-center justify-between py-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            {notifEnabled
              ? <Bell className="w-4 h-4 text-success" />
              : <BellOff className="w-4 h-4 text-muted-foreground" />
            }
            <span className="text-xs sm:text-sm text-muted-foreground">Notifikasi Tagihan</span>
          </div>
          <div className="flex items-center gap-2">
            {notifEnabled ? (
              <span className="text-xs text-success font-medium">Aktif</span>
            ) : (
              <button
                onClick={handleRequestNotif}
                disabled={notifLoading || pwa.notifPermission === 'denied'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50 min-h-[32px]"
              >
                {notifLoading ? 'Meminta...' : 'Aktifkan'}
              </button>
            )}
          </div>
        </div>

        {/* ── Permission denied info ── */}
        {pwa.notifPermission === 'denied' && (
          <div className="rounded-lg bg-warning/10 border border-warning/20 p-3">
            <p className="text-xs text-warning font-medium">⚠️ Notifikasi Diblokir</p>
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
              Notifikasi diblokir di browser. Buka pengaturan browser → Izin Situs → aktifkan notifikasi untuk situs ini.
            </p>
          </div>
        )}

        {/* ── Test notifikasi ── */}
        {notifEnabled && (
          <div className="py-2">
            <button
              onClick={handleTestNotif}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-xs sm:text-sm font-medium hover:bg-accent transition-all min-h-[40px]"
            >
              <Bell className="w-4 h-4" />
              {testSent ? '✓ Notifikasi terkirim!' : 'Kirim Notifikasi Test'}
            </button>
          </div>
        )}

        {/* ── Install prompt ── */}
        {pwa.canInstall && !pwa.isStandalone && (
          <div className="py-2">
            <button
              onClick={pwa.isIOS ? undefined : pwa.installPrompt}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs sm:text-sm font-medium hover:bg-primary/20 transition-all min-h-[40px]"
            >
              <Smartphone className="w-4 h-4" />
              Install LIVORIA ke Perangkat
            </button>
          </div>
        )}
      </div>
    </div>
  );
}