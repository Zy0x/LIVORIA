/**
 * PWASettings.tsx
 *
 * Komponen pengaturan PWA dan notifikasi tagihan.
 */

import { useState, useEffect } from 'react';
import {
  Bell, BellOff, RefreshCw, Wifi, WifiOff, Smartphone, Shield,
  Clock, AlertTriangle, Calendar, Volume2,
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';
import {
  requestNotificationPermission,
  canSendNotifications,
  sendLocalNotification,
  registerPeriodicSync,
} from '@/lib/pwaNotifications';

export default function PWASettings() {
  const pwa = usePWA();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Notification preferences (localStorage-based)
  const [notifOverdue, setNotifOverdue] = useState(
    localStorage.getItem('livoria-notif-overdue') !== 'false'
  );
  const [notifWarning, setNotifWarning] = useState(
    localStorage.getItem('livoria-notif-warning') !== 'false'
  );
  const [notifSummary, setNotifSummary] = useState(
    localStorage.getItem('livoria-notif-summary') !== 'false'
  );
  const [notifTime, setNotifTime] = useState(
    localStorage.getItem('livoria-notif-time') || '08:00'
  );

  useEffect(() => {
    setNotifEnabled(canSendNotifications());
  }, []);

  const handleRequestNotif = async () => {
    setNotifLoading(true);
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
    if (granted) {
      registerPeriodicSync();
    }
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

  const togglePref = (key: string, value: boolean, setter: (v: boolean) => void) => {
    setter(value);
    localStorage.setItem(key, String(value));
  };

  const handleTimeChange = (time: string) => {
    setNotifTime(time);
    localStorage.setItem('livoria-notif-time', time);
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

        {/* ── Notifikasi Toggle ── */}
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

        {/* ── Notification Preferences (only if enabled) ── */}
        {notifEnabled && (
          <div className="space-y-2 pt-1">
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.12em]">
              Preferensi Notifikasi
            </p>

            {/* Overdue alerts */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                <div>
                  <span className="text-xs text-foreground font-medium">Peringatan Overdue</span>
                  <p className="text-[10px] text-muted-foreground">Notifikasi harian untuk tagihan lewat jatuh tempo</p>
                </div>
              </div>
              <button
                onClick={() => togglePref('livoria-notif-overdue', !notifOverdue, setNotifOverdue)}
                className={`relative w-9 h-5 rounded-full transition-colors ${notifOverdue ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${notifOverdue ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Warning alerts */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Bell className="w-3.5 h-3.5 text-warning" />
                <div>
                  <span className="text-xs text-foreground font-medium">Pengingat Jatuh Tempo</span>
                  <p className="text-[10px] text-muted-foreground">H-7, H-3, H-1 sebelum jatuh tempo</p>
                </div>
              </div>
              <button
                onClick={() => togglePref('livoria-notif-warning', !notifWarning, setNotifWarning)}
                className={`relative w-9 h-5 rounded-full transition-colors ${notifWarning ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${notifWarning ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Monthly summary */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-info" />
                <div>
                  <span className="text-xs text-foreground font-medium">Rangkuman Bulanan</span>
                  <p className="text-[10px] text-muted-foreground">Total tagihan di awal bulan</p>
                </div>
              </div>
              <button
                onClick={() => togglePref('livoria-notif-summary', !notifSummary, setNotifSummary)}
                className={`relative w-9 h-5 rounded-full transition-colors ${notifSummary ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${notifSummary ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>

            {/* Notification time */}
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-foreground font-medium">Waktu Notifikasi</span>
              </div>
              <select
                value={notifTime}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="text-xs px-2 py-1.5 rounded-lg border border-input bg-background text-foreground"
              >
                <option value="06:00">06:00 Pagi</option>
                <option value="08:00">08:00 Pagi</option>
                <option value="12:00">12:00 Siang</option>
                <option value="18:00">18:00 Sore</option>
                <option value="21:00">21:00 Malam</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Test notifikasi ── */}
        {notifEnabled && (
          <div className="py-2">
            <button
              onClick={handleTestNotif}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted text-xs sm:text-sm font-medium hover:bg-accent transition-all min-h-[40px]"
            >
              <Volume2 className="w-4 h-4" />
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
