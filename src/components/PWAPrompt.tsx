import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from "lucide-react";
import gsap from "gsap";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const bannerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const duration = prefersReducedMotion ? 0.01 : 0.35;

  // Check if app is already installed
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(isIOSDevice);

    const dismissedAt = localStorage.getItem("pwa_banner_dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) {
        return;
      }
    }

    if (isIOSDevice) {
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for beforeinstallprompt event
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    if ((window as any).deferredPrompt) {
      setDeferredPrompt((window as any).deferredPrompt);
      setShowBanner(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Listen for app installed event
  useEffect(() => {
    const handler = () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handler);
    return () => window.removeEventListener("appinstalled", handler);
  }, []);

  // GSAP entrance/exit animation
  useEffect(() => {
    if (showBanner && !isInstalled) {
      setIsVisible(true);
      
      if (bannerRef.current) {
        gsap.fromTo(bannerRef.current,
          { y: 100, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration,
            ease: "back.out(1.5)"
          }
        );
      }
    } else if (!showBanner && isVisible) {
      if (bannerRef.current) {
        gsap.to(bannerRef.current, {
          y: 100,
          opacity: 0,
          duration: duration * 0.7,
          ease: "power2.in",
          onComplete: () => setIsVisible(false)
        });
      }
    }
  }, [showBanner, isInstalled, duration, isVisible]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowIOSGuide(true);
      }
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setIsInstalled(true);
        setShowBanner(false);
      }
    } catch (error) {
      console.error("Install error:", error);
    } finally {
      setDeferredPrompt(null);
    }
  }, [deferredPrompt, isIOS]);

  const handleDismiss = useCallback(() => {
    setShowBanner(false);
    setShowIOSGuide(false);
    localStorage.setItem("pwa_banner_dismissed", Date.now().toString());
  }, []);

  if (isInstalled || !isVisible) return null;

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm"
      style={{ opacity: 0, transform: "translateY(100px)" }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl p-4 backdrop-blur-lg">
        {/* iOS Guide Modal */}
        {showIOSGuide && isIOS ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                <span className="font-semibold text-foreground">Install di iPhone/iPad</span>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-muted rounded-full">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <ol className="text-sm text-muted-foreground space-y-2 pl-1">
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">1.</span>
                <span>Ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">2.</span>
                <span>Scroll ke bawah dan ketuk <strong>"Add to Home Screen"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-primary">3.</span>
                <span>Ketuk <strong>"Add"</strong> di pojok kanan atas</span>
              </li>
            </ol>
            <Button size="sm" variant="outline" onClick={handleDismiss} className="w-full mt-2">
              Mengerti
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">Install SIPENA</p>
              <p className="text-xs text-muted-foreground truncate">
                Akses cepat dari home screen
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleInstall}
                className="h-9 px-4 bg-primary hover:bg-primary/90"
              >
                Install
              </Button>
              <button
                onClick={handleDismiss}
                className="p-2 hover:bg-muted rounded-full transition-colors"
                aria-label="Tutup"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}