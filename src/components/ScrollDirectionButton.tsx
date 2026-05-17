import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import gsap from 'gsap';
import { useLocation } from 'react-router-dom';

interface Props {
  hideDelay?: number;
  minDelta?: number;
}

const ADD_TRIGGER_SELECTOR: Record<string, string> = {
  '/anime': '[data-add-card-trigger="anime"]',
  '/donghua': '[data-add-card-trigger="donghua"]',
};

export default function ScrollDirectionButton({
  hideDelay = 700,
  minDelta = 3,
}: Props) {
  const location = useLocation();
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [isVisible, setIsVisible] = useState(false);
  const [showAddButton, setShowAddButton] = useState(false);

  const isAutoScrolling = useRef(false);
  const lastY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const wasVisible = useRef(false);
  const isHovered = useRef(false);
  const isSplashActive = useRef(true);

  const isAddRoute = location.pathname.startsWith('/anime') || location.pathname.startsWith('/donghua');

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
    if (isHovered.current) return;
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
    [clearHideTimer, hide, hideDelay]
  );

  useEffect(() => {
    if (isVisible && !wasVisible.current) {
      animateIn();
    } else if (!isVisible && wasVisible.current) {
      animateOut();
    }
    wasVisible.current = isVisible;
  }, [animateIn, animateOut, isVisible]);

  useEffect(() => {
    if (!btnRef.current || !isVisible) return;
    gsap.fromTo(
      btnRef.current.querySelector('.scroll-icon'),
      { rotateX: 90, opacity: 0 },
      { rotateX: 0, opacity: 1, duration: 0.2, ease: 'power2.out' }
    );
  }, [direction, isVisible]);

  const syncAddButtonVisibility = useCallback(() => {
    if (!isAddRoute) {
      setShowAddButton(false);
      return;
    }

    const routeKey = location.pathname.startsWith('/donghua') ? '/donghua' : '/anime';
    const selector = ADD_TRIGGER_SELECTOR[routeKey];
    const trigger = selector ? document.querySelector<HTMLElement>(selector) : null;

    if (!trigger) {
      setShowAddButton(true);
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const visible =
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < viewportHeight &&
      rect.left < viewportWidth;

    setShowAddButton(!visible);
  }, [isAddRoute, location.pathname]);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastY.current);

    syncAddButtonVisibility();
    if (delta < minDelta) return;

    const newDir = currentY > lastY.current ? 'down' : 'up';
    lastY.current = currentY;
    show(newDir);
  }, [minDelta, show, syncAddButtonVisibility]);

  const scrollToTarget = useCallback(() => {
    hide();
    const target = direction === 'up' ? 0 : document.documentElement.scrollHeight;
    isAutoScrolling.current = true;

    if (btnRef.current) {
      gsap
        .timeline()
        .to(btnRef.current, { scale: 0.85, duration: 0.1, ease: 'power2.in' })
        .to(btnRef.current, {
          scale: 0,
          opacity: 0,
          y: direction === 'up' ? -20 : 20,
          duration: 0.25,
          ease: 'power3.in',
        });
    }

    window.scrollTo({ top: target, behavior: 'smooth' });

    setTimeout(() => {
      isAutoScrolling.current = false;
      lastY.current = window.scrollY;
      syncAddButtonVisibility();
    }, 600);
  }, [direction, hide, syncAddButtonVisibility]);

  const openAddModal = useCallback(() => {
    window.dispatchEvent(new CustomEvent('livoria-open-add-current-page'));
  }, []);

  useEffect(() => {
    let rafId = 0;

    const onScroll = () => {
      rafId = window.requestAnimationFrame(handleScroll);
    };

    const onResize = () => syncAddButtonVisibility();
    const onSync = () => syncAddButtonVisibility();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('livoria-sync-add-visibility', onSync);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('livoria-sync-add-visibility', onSync);
      if (rafId) cancelAnimationFrame(rafId);
      clearHideTimer();
    };
  }, [clearHideTimer, handleScroll, syncAddButtonVisibility]);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleMouseEnter = () => {
      isHovered.current = true;
      clearHideTimer();
    };

    const handleMouseLeave = () => {
      isHovered.current = false;
      hideTimer.current = setTimeout(hide, hideDelay);
    };

    btn.addEventListener('mouseenter', handleMouseEnter);
    btn.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      btn.removeEventListener('mouseenter', handleMouseEnter);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [clearHideTimer, hide, hideDelay]);

  useEffect(() => {
    lastY.current = window.scrollY;
    if (btnRef.current) {
      gsap.set(btnRef.current, { opacity: 0, scale: 0.75, y: 12 });
    }

    const splashTimer = setTimeout(() => {
      isSplashActive.current = false;
      syncAddButtonVisibility();
    }, 3000);

    return () => clearTimeout(splashTimer);
  }, [syncAddButtonVisibility]);

  useEffect(() => {
    syncAddButtonVisibility();

    if (!isAddRoute) return;

    const observer = new MutationObserver(() => {
      syncAddButtonVisibility();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return () => observer.disconnect();
  }, [isAddRoute, location.pathname, syncAddButtonVisibility]);

  const Icon = direction === 'up' ? ChevronUp : ChevronDown;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {showAddButton && (
        <button
          type="button"
          onClick={openAddModal}
          aria-label={location.pathname.startsWith('/donghua') ? 'Tambah donghua baru' : 'Tambah anime baru'}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-xl transition-all duration-300 ease-out sm:h-14 sm:w-14 ${
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-100'
          }`}
          style={{
            WebkitTapHighlightColor: 'transparent',
            marginBottom: isVisible ? 0 : -12,
          }}
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2.6} />
        </button>
      )}

      <button
        ref={btnRef}
        type="button"
        onClick={scrollToTarget}
        aria-label={direction === 'up' ? 'Scroll ke atas' : 'Scroll ke bawah'}
        className={`h-12 w-12 rounded-full border-2 border-white/20 shadow-xl transition-colors duration-200 sm:h-14 sm:w-14 ${
          direction === 'up'
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500'
            : 'bg-gradient-to-br from-rose-500 to-rose-600 hover:from-rose-400 hover:to-rose-500'
        } ${!isVisible ? 'pointer-events-none' : ''} flex items-center justify-center touch-manipulation select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Icon
          className="scroll-icon h-2.5 w-2.5 text-white drop-shadow-sm sm:h-3.5 sm:w-3.5"
          strokeWidth={4}
        />
      </button>
    </div>
  );
}
