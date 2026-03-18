/**
 * PWAManager.tsx — LIVORIA v4.0
 *
 * Multi-platform PWA install manager:
 * - Android/Chrome: native beforeinstallprompt banner
 * - iOS Safari: step-by-step install guide modal
 * - Desktop Chrome/Edge/Brave: install banner
 * - Desktop Firefox/Safari: informational (not installable via prompt)
 * - Update banner: semua platform
 * - Offline indicator: semua platform
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';
import {
  Shield, Download, X, RefreshCw, WifiOff,
  Share, Plus, Smartphone, Monitor, Chrome,
  CheckCircle, ArrowRight, Info,
} from 'lucide-react';
import { usePWA } from '@/hooks/usePWA';

// ─── iOS Install Instructions Modal ────────────────────────────────────────
function IOSInstallModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(
        modalRef.current,
        { opacity: 0, y: 60, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const close = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0, y: 30, scale: 0.97, duration: 0.25, ease: 'power2.in',
        onComplete: onClose,
      });
    } else {
      onClose();
    }
  };

  const steps = [
    {
      icon: <Share className="w-4 h-4" />,
      title: 'Tap ikon Share',
      desc: 'Ketuk ikon kotak dengan panah ↑ di bagian bawah browser Safari',
      color: 'bg-blue-500/15 text-blue-500',
    },
    {
      icon: <Plus className="w-4 h-4" />,
      title: '"Add to Home Screen"',
      desc: 'Scroll ke bawah & pilih "Tambahkan ke Layar Utama" (Add to Home Screen)',
      color: 'bg-green-500/15 text-green-600',
    },
    {
      icon: <CheckCircle className="w-4 h-4" />,
      title: 'Konfirmasi & Tambah',
      desc: 'Tap tombol "Tambah" di pojok kanan atas untuk menyelesaikan instalasi',
      color: 'bg-primary/15 text-primary',
    },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-sm bg-card rounded-3xl border border-border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-primary/10 via-transparent to-transparent border-b border-border/50">
          <button
            onClick={close}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-muted/60 hover:bg-muted"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30 shrink-0">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-bold text-foreground text-base leading-tight">Install LIVORIA</h3>
              <p className="text-xs text-muted-foreground mt-0.5">iOS — Ikuti langkah berikut</p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="px-5 py-4 space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-muted/30 border border-border/50">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${step.color}`}>
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5">
          <div className="p-3 rounded-xl bg-info/5 border border-info/20 mb-3">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="font-semibold text-info">⚠️ Pastikan</span> kamu menggunakan <strong>Safari</strong> (bukan Chrome/Firefox) di iOS untuk menginstall PWA.
            </p>
          </div>
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

// ─── Desktop Install Guide (Firefox/Safari - no prompt support) ────────────
function DesktopInfoModal({ browser, onClose }: { browser: string; onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (modalRef.current) {
      gsap.fromTo(modalRef.current,
        { opacity: 0, scale: 0.95, y: -20 },
        { opacity: 1, scale: 1, y: 0, duration: 0.35, ease: 'back.out(1.7)' }
      );
    }
  }, []);

  const close = () => {
    if (modalRef.current) {
      gsap.to(modalRef.current, {
        opacity: 0, scale: 0.97, y: -10, duration: 0.2,
        onComplete: onClose,
      });
    } else onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div ref={modalRef} className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-2xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
              <Info className="w-5 h-5 text-info" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Install LIVORIA</h3>
              <p className="text-xs text-muted-foreground">Panduan untuk {browser}</p>
            </div>
          </div>
          <button onClick={close} className="p-1.5 rounded-lg hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {browser === 'firefox' ? (
            <div className="space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                Firefox belum mendukung instalasi PWA via prompt. Gunakan salah satu cara berikut:
              </p>
              <div className="p-3 rounded-xl bg-muted/40 space-y-2">
                <p className="font-medium text-foreground text-xs">Opsi 1: Gunakan Chrome/Edge</p>
                <p className="text-xs text-muted-foreground">Buka LIVORIA di Chrome atau Edge untuk install sebagai app.</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/40 space-y-2">
                <p className="font-medium text-foreground text-xs">Opsi 2: Bookmark</p>
                <p className="text-xs text-muted-foreground">Tekan Ctrl+D untuk bookmark halaman ini.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground leading-relaxed">
                Untuk menginstall di Safari desktop:
              </p>
              <div className="p-3 rounded-xl bg-muted/40 space-y-1.5">
                <p className="text-xs text-foreground">1. Klik menu <strong>File</strong> di menu bar</p>
                <p className="text-xs text-foreground">2. Pilih <strong>"Add to Dock"</strong></p>
                <p className="text-xs text-muted-foreground">(Safari 17+ / macOS Sonoma)</p>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={close}
          className="w-full mt-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all"
        >
          Mengerti
        </button>
      </div>
    </div>
  );
}

// ─── Install Banner ─────────────────────────────────────────────────────────
interface InstallBannerProps {
  onInstall: () => void;
  onDismiss: () => void;
  isIOS: boolean;
  isAndroid: boolean;
  isDesktop: boolean;
  browser: string;
  hasNativePrompt: boolean;
}

function InstallBanner({
  onInstall, onDismiss, isIOS, isAndroid, isDesktop, browser, hasNativePrompt
}: InstallBannerProps) {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bannerRef.current) {
      gsap.fromTo(
        bannerRef.current,
        { opacity: 0, y: isDesktop ? -80 : 80, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: 'back.out(1.4)', delay: 1.2 }
      );
    }
  }, [isDesktop]);

  const dismiss = () => {
    if (bannerRef.current) {
      gsap.to(bannerRef.current, {
        opacity: 0,
        y: isDesktop ? -60 : 60,
        scale: 0.96,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: onDismiss,
      });
    } else {
      onDismiss();
    }
  };

  const getInstallLabel = () => {
    if (isIOS) return 'Cara Install';
    if (!hasNativePrompt && isDesktop) return 'Panduan Install';
    return 'Install Sekarang';
  };

  const getDescription = () => {
    if (isIOS) return 'Buka di Safari → Share → Add to Home Screen';
    if (browser === 'firefox') return 'Gunakan Chrome/Edge untuk install sebagai app';
    return 'Akses cepat · Mode offline · Notifikasi tagihan';
  };

  const features = isIOS
    ? ['📱 Tampilan penuh', '⚡ Akses cepat', '🔒 Aman']
    : browser === 'firefox'
    ? ['ℹ️ Gunakan Chrome', '📌 Atau Bookmark', '🌐 Cross-platform']
    : ['⚡ Lebih cepat', '📱 Tampilan penuh', '🔔 Notifikasi'];

  const positionClass = isDesktop
    ? 'fixed top-4 right-4 z-[100] max-w-sm'
    : 'fixed bottom-4 left-4 right-4 z-[100] max-w-sm mx-auto';

  return (
    <div ref={bannerRef} className={positionClass}>
      <div className="relative bg-card border border-border/80 rounded-3xl shadow-2xl shadow-black/20 overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />

        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                {isDesktop ? <Monitor className="w-6 h-6 text-primary-foreground" /> : <Shield className="w-6 h-6 text-primary-foreground" />}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-success rounded-full border-2 border-card flex items-center justify-center">
                <span className="text-[6px] text-white font-black">✓</span>
              </div>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground text-sm leading-tight">Install LIVORIA</h3>
                <button
                  onClick={dismiss}
                  className="p-1 rounded-full hover:bg-muted/60 ml-1"
                  aria-label="Tutup"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {getDescription()}
              </p>
            </div>
          </div>

          <div className="flex gap-1.5 mb-3 flex-wrap">
            {features.map((feat, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground font-medium border border-border/40"
              >
                {feat}
              </span>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={onInstall}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            >
              <Download className="w-4 h-4" />
              {getInstallLabel()}
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

// ─── Update Banner ───────────────────────────────────────────────────────────
function UpdateBanner({ onUpdate, onDismiss }: { onUpdate: () => void; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current,
        { opacity: 0, y: -60 },
        { opacity: 1, y: 0, duration: 0.4, ease: 'back.out(1.4)' }
      );
    }
  }, []);

  return (
    <div ref={ref} className="fixed top-4 left-4 right-4 z-[100] max-w-sm mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-info/15 text-info flex items-center justify-center shrink-0">
          <RefreshCw className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground">Pembaruan tersedia</p>
          <p className="text-[10px] text-muted-foreground">LIVORIA versi terbaru siap</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onUpdate}
            className="px-2.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all"
          >
            Update
          </button>
          <button onClick={onDismiss} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Offline Indicator ──────────────────────────────────────────────────────
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
    <div ref={ref} className="fixed top-0 inset-x-0 z-[150] flex justify-center pointer-events-none">
      <div className="mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-foreground/90 backdrop-blur-sm text-background text-xs font-semibold shadow-lg">
        <WifiOff className="w-3.5 h-3.5" />
        <span>Mode Offline — Data tersimpan lokal</span>
      </div>
    </div>
  );
}

// ─── Main PWA Manager ────────────────────────────────────────────────────────
export default function PWAManager() {
  const pwa = usePWA();
  const [showIOSModal,        setShowIOSModal]        = useState(false);
  const [showDesktopInfo,     setShowDesktopInfo]     = useState(false);
  const [showUpdateBanner,    setShowUpdateBanner]    = useState(false);
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);

  // Show update banner when available
  useEffect(() => {
    if (pwa.needsUpdate && !updateBannerDismissed) {
      setShowUpdateBanner(true);
    }
  }, [pwa.needsUpdate, updateBannerDismissed]);

  const handleInstall = useCallback(() => {
    if (pwa.isIOS) {
      // iOS: show manual guide
      setShowIOSModal(true);
    } else if (pwa.browser === 'firefox' || (pwa.isDesktop && !pwa.debug.hasPrompt && pwa.browser === 'safari')) {
      // Browsers without native prompt support
      setShowDesktopInfo(true);
    } else {
      // Android/Chrome/Edge/Desktop Chrome: native prompt
      pwa.installPrompt();
    }
  }, [pwa]);

  const handleDismiss = useCallback(() => {
    pwa.dismissInstall();
  }, [pwa]);

  const handleUpdate = useCallback(() => {
    pwa.applyUpdate();
  }, [pwa]);

  return (
    <>
      {/* Offline indicator */}
      {!pwa.isOnline && <OfflineIndicator />}

      {/* Install banner — show when available and not standalone */}
      {pwa.canInstall && !pwa.isStandalone && (
        <InstallBanner
          onInstall={handleInstall}
          onDismiss={handleDismiss}
          isIOS={pwa.isIOS}
          isAndroid={pwa.isAndroid}
          isDesktop={pwa.isDesktop}
          browser={pwa.browser}
          hasNativePrompt={pwa.debug.hasPrompt}
        />
      )}

      {/* Update banner */}
      {showUpdateBanner && pwa.needsUpdate && (
        <UpdateBanner
          onUpdate={handleUpdate}
          onDismiss={() => {
            setShowUpdateBanner(false);
            setUpdateBannerDismissed(true);
          }}
        />
      )}

      {/* iOS install modal */}
      {showIOSModal && (
        <IOSInstallModal
          onClose={() => {
            setShowIOSModal(false);
            pwa.dismissInstall();
          }}
        />
      )}

      {/* Desktop info modal (Firefox/Safari) */}
      {showDesktopInfo && (
        <DesktopInfoModal
          browser={pwa.browser}
          onClose={() => {
            setShowDesktopInfo(false);
            pwa.dismissInstall();
          }}
        />
      )}
    </>
  );
}