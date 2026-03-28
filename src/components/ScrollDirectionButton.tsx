/**
 * ScrollDirectionButton.tsx — LIVORIA
 *
 * Tombol mengambang yang muncul sesuai arah scroll pengguna.
 * Menggunakan GSAP untuk animasi yang smooth dan powerful.
 * Responsif di semua ukuran layar.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import gsap from 'gsap';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface Props {
  hideDelay?: number;
  minDelta?: number;
}

export default function ScrollDirectionButton({ 
  hideDelay = 700, 
  minDelta = 3 
}: Props) {
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [isVisible, setIsVisible] = useState(false);
  
  const isAutoScrolling = useRef(false);
  const lastY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wasVisible = useRef(false);
  const isHovered = useRef(false);
  const isSplashActive = useRef(true);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const animateIn = useCallback(() => {
    if (!btnRef.current) return;
    gsap.killTweensOf(btnRef.current);
    gsap.to(btnRef.current, {
      opacity: 0.95,
      scale: 1,
      y: 0,
      duration: 0.3,
      ease: 'back.out(1.7)',
      overwrite: true,
    });
  }, []);

  const animateOut = useCallback(() => {
    if (!btnRef.current) return;
    gsap.killTweensOf(btnRef.current);
    gsap.to(btnRef.current, {
      opacity: 0,
      scale: 0.75,
      y: 12,
      duration: 0.25,
      ease: 'power2.in',
      overwrite: true,
    });
  }, []);

  const hide = useCallback(() => {
    if (isHovered.current) return;        // ← Jangan hide jika sedang hover
    setIsVisible(false);
    clearHideTimer();
  }, [clearHideTimer]);

  const show = useCallback(
    (newDir: 'up' | 'down') => {
      if (isAutoScrolling.current || isSplashActive.current) return;
      setDirection(newDir);
      setIsVisible(true);
      clearHideTimer();
      hideTimer.current = setTimeout(hide, hideDelay);
    },
    [hideDelay, hide, clearHideTimer]
  );

  // Animate visibility changes
  useEffect(() => {
    if (isVisible && !wasVisible.current) {
      animateIn();
    } else if (!isVisible && wasVisible.current) {
      animateOut();
    }
    wasVisible.current = isVisible;
  }, [isVisible, animateIn, animateOut]);

  // Animate direction change
  useEffect(() => {
    if (!btnRef.current || !isVisible) return;
    gsap.fromTo(
      btnRef.current.querySelector('.scroll-icon'),
      { rotateX: 90, opacity: 0 },
      { rotateX: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }
    );
  }, [direction, isVisible]);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastY.current);
    if (delta < minDelta) return;

    const newDir = currentY > lastY.current ? 'down' : 'up';
    lastY.current = currentY;
    show(newDir);
  }, [minDelta, show]);

  const scrollToTarget = useCallback(() => {
    hide();
    const target = direction === 'up' ? 0 : document.documentElement.scrollHeight;
    isAutoScrolling.current = true;

    if (btnRef.current) {
      gsap.timeline()
        .to(btnRef.current, { scale: 0.85, duration: 0.1, ease: 'power2.in' })
        .to(btnRef.current, { 
          scale: 0, 
          opacity: 0, 
          y: direction === 'up' ? -20 : 20, 
          duration: 0.25, 
          ease: 'power3.in' 
        });
    }

    window.scrollTo({ top: target, behavior: 'smooth' });

    setTimeout(() => {
      isAutoScrolling.current = false;
      lastY.current = window.scrollY;
    }, 600);
  }, [direction, hide]);

  // Scroll listener
  useEffect(() => {
    let rafId: number;
    const onScroll = () => {
      rafId = requestAnimationFrame(handleScroll);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
      clearHideTimer();
    };
  }, [handleScroll, clearHideTimer]);

  // Hover handler (baru)
  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleMouseEnter = () => {
      isHovered.current = true;
      clearHideTimer();           // batalkan timer hide saat hover
    };

    const handleMouseLeave = () => {
      isHovered.current = false;
      // mulai lagi timer hide
      hideTimer.current = setTimeout(hide, hideDelay);
    };

    btn.addEventListener('mouseenter', handleMouseEnter);
    btn.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      btn.removeEventListener('mouseenter', handleMouseEnter);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hide, hideDelay, clearHideTimer]);

  // Initial setup — hide during splash screen
  useEffect(() => {
    lastY.current = window.scrollY;
    if (btnRef.current) {
      gsap.set(btnRef.current, { opacity: 0, scale: 0.75, y: 12 });
    }
    // Splash screen typically lasts ~2.5s
    const splashTimer = setTimeout(() => {
      isSplashActive.current = false;
    }, 3000);
    return () => clearTimeout(splashTimer);
  }, []);

  const Icon = direction === 'up' ? ChevronUp : ChevronDown;

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={scrollToTarget}
      aria-label={direction === 'up' ? 'Scroll ke atas' : 'Scroll ke bawah'}
      className={`
        fixed bottom-6 right-6 z-[9999]
        w-12 h-12 sm:w-14 sm:h-14
        rounded-full flex items-center justify-center
        shadow-xl border-2 border-white/20
        touch-manipulation select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
        transition-colors duration-200
        ${direction === 'up'
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
          : 'bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500'
        }
        ${!isVisible ? 'pointer-events-none' : ''}
      `}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <Icon 
        className="scroll-icon w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white drop-shadow-sm"
        strokeWidth={4} 
      />
    </button>
  );
}