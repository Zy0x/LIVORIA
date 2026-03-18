/**
 * PWAManager.tsx — LIVORIA
 *
 * FIX:
 * 1. InstallBanner sekarang muncul untuk iOS DAN Android (kondisi sebelumnya terlalu restriktif).
 * 2. iOS: klik "Install" langsung buka IOSInstallModal (bukan memanggil installPrompt).
 * 3. Android: klik "Install" memanggil native installPrompt.
 * 4. Delay banner dikurangi ke 0.8s (dari 1.5s).
 * 5. Offline indicator, Update banner tetap berjalan seperti semula.
 */

import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import {
  Shield, Download, X, RefreshCw, WifiOff,
  Share, Plus, Smartphone,
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

// ─── iOS Install Instructions ──────────────────────────────────────────────
function IOSInstallModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 40, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const close = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0, y: 20, scale: 0.97, duration: 0.25, ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-sm bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-primary/10 to-transparent border-b border-border/50">
          <button
            onClick={close}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-bold text-foreground text-base">Install LIVORIA</h3>
              <p className="text-xs text-muted-foreground">Tambahkan ke layar utama</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            Langkah-langkah:
          </p>
          {[
            {
              icon: <Share className="w-4 h-4" />,
              title: 'Tap tombol Share',
              desc: 'Ketuk ikon kotak dengan panah ke atas di toolbar bawah Safari',
              color: 'bg-info/15 text-info',
            },
            {
              icon: <Plus className="w-4 h-4" />,
              title: 'Add to Home Screen',
              desc: 'Scroll ke bawah dan pilih "Tambahkan ke Layar Utama"',
              color: 'bg-success/15 text-success',
            },
            {
              icon: <Smartphone className="w-4 h-4" />,
              title: 'Konfirmasi Install',
              desc: 'Ketuk "Tambah" di pojok kanan atas untuk menyelesaikan instalasi',
              color: 'bg-primary/15 text-primary',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50"
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={close}
            className="w-full py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"
          >
            Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Install Banner ────────────────────────────────────────────────────────
function InstallBanner({
  onInstall,
  onDismiss,
  isIOS,
}: {
  onInstall: () => void;
  onDismiss: () => void;
  isIOS: boolean;
}) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { opacity: 0, y: 80, scale: 0.96 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.4)', delay: 0.8 }
      );
    }
  }, []);

  const dismiss = () => {
    if (bannerRef.current) {
      gsap.to(bannerRef.current, {
        opacity: 0, y: 80, scale: 0.96, duration: 0.3, ease: 'power2.in',
        onComplete: onDismiss,
      });
    } else {
      onDismiss();
    }
  };

  return (
    <div ref={bannerRef} className="fixed bottom-4 left-4 right-4 z-[100] max-w-sm mx-auto">
      <div className="relative bg-card border border-border/80 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
        {/* Decorative gradient bar */}
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <div className="p-4">
          {/* Top row */}
          <div className="flex items-start gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Shield className="w-6 h-6 text-primary-foreground" />
              </div>
              {/* "installed" green dot */}
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card flex items-center justify-center">
                <span className="text-[6px] text-white font-black">✓</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-foreground text-sm leading-tight">
                  Install LIVORIA
                </h3>
                <button
                  onClick={dismiss}
                  className="p-1 rounded-full hover:bg-muted/60 transition-colors ml-1"
                  aria-label="Tutup"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Akses cepat · Mode offline · Notifikasi tagihan
              </p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {['⚡ Lebih cepat', '📱 Tampilan penuh', '🔔 Notifikasi'].map((feat, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium border border-border/40"
              >
                {feat}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex gap-2">
            <button
              onClick={onInstall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            >
              <Download className="w-4 h-4" />
              {isIOS ? 'Cara Install' : 'Install Sekarang'}
            </button>
            <button
              onClick={dismiss}
              className="px-4 py-2.5 rounded-2xl bg-muted text-muted-foreground text-sm font-medium hover:bg-accent transition-all"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Update Banner ─────────────────────────────────────────────────────────
function UpdateBanner({
  onUpdate,
  onDismiss,
}: {
  onUpdate: () => void;
  onDismiss: () => void;
}) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerRef.current) {
      gsap.fromTo(bannerRef.current,
        { opacity: 0, y: -60 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' }
      );
    }
  }, []);

  return (
    <div ref={bannerRef} className="fixed top-4 left-4 right-4 z-[100] max-w-sm mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-info/15 text-info flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Pembaruan tersedia</p>
          <p className="text-[10px] text-muted-foreground">
            LIVORIA versi terbaru siap digunakan
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onUpdate}
            className="px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all"
          >
            Update
          </button>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Offline Indicator ────────────────────────────────────────────────────
function OfflineIndicator() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, []);

  return (
    <div ref={ref} className="fixed top-0 inset-x-0 z-[150] flex justify-center">
      <div className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/90 backdrop-blur-sm text-background text-xs font-semibold shadow-lg">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Mode Offline — Data tersimpan lokal</span>
      </div>
    </div>
  );
}

// ─── Main PWA Manager ──────────────────────────────────────────────────────
export default function PWAManager() {
  const pwa = usePWA();
  const [showIOSModal,     setShowIOSModal]     = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);

  // Tampilkan update banner saat update tersedia
  useEffect(() => {
    if (pwa.updateState === 'available') setShowUpdateBanner(true);
  }, [pwa.updateState]);

  // Handler install: iOS → buka modal petunjuk, Android → native prompt
  const handleInstall = () => {
    if (pwa.isIOS) {
      setShowIOSModal(true);
    } else {
      pwa.installPrompt();
    }
  };

  return (
    <>
      {/* Offline indicator */}
      {!pwa.isOnline && <OfflineIndicator />}

      {/*
        Install banner:
        Tampilkan jika canInstall=true (artinya available & belum dismissed)
        DAN aplikasi belum berjalan dalam mode standalone.
      */}
      {pwa.canInstall && !pwa.isStandalone && (
        <InstallBanner
          onInstall={handleInstall}
          onDismiss={pwa.dismissInstall}
          isIOS={pwa.isIOS}
        />
      )}

      {/* Update banner */}
      {showUpdateBanner && pwa.updateState === 'available' && (
        <UpdateBanner
          onUpdate={pwa.applyUpdate}
          onDismiss={() => setShowUpdateBanner(false)}
        />
      )}

      {/* iOS install instructions modal */}
      {showIOSModal && (
        <IOSInstallModal
          onClose={() => {
            setShowIOSModal(false);
            pwa.dismissInstall();
          }}
        />
      )}
    </>
  );
}