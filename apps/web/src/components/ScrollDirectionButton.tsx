import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { useLocation } from 'react-router-dom';
import { FloatingActionControls } from './floating-action/FloatingActionControls';
import { ADD_TRIGGER_SELECTOR, type ScrollDirection } from './floating-action/floating-action-config';
import { shouldLimitMotion } from '@/lib/motion';

interface Props {
  hideDelay?: number;
  minDelta?: number;
}

const SPLASH_READY_KEY = 'livoria:splash-ready';

function isInitialSplashActive() {
  if (typeof window === 'undefined') return true;
  if (shouldLimitMotion()) return false;
  return window.sessionStorage.getItem(SPLASH_READY_KEY) !== '1';
}

export default function ScrollDirectionButton({
  hideDelay = 700,
  minDelta = 3,
}: Props) {
  const location = useLocation();
  const [direction, setDirection] = useState<ScrollDirection>('down');
  const [isVisible, setIsVisible] = useState(false);
  const [showAddButton, setShowAddButton] = useState(false);
  const [isSplashActiveState, setIsSplashActiveState] = useState(isInitialSplashActive);
  const [hasOpenDialog, setHasOpenDialog] = useState(false);

  const isAutoScrolling = useRef(false);
  const suppressScrollUntilRef = useRef(0);
  const lastY = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addTargetsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const addTargetsObserverRef = useRef<IntersectionObserver | null>(null);
  const wasVisible = useRef(false);
  const wasAddVisible = useRef(false);
  const isHovered = useRef(false);
  const isSplashActive = useRef(isInitialSplashActive());

  const addRouteKey = Object.keys(ADD_TRIGGER_SELECTOR).find((route) => location.pathname.startsWith(route));
  const isAddRoute = Boolean(addRouteKey);
  const overlaySuppressed = isSplashActiveState || hasOpenDialog;
  const shouldRaiseScrollButton = isAddRoute && showAddButton && isVisible && !overlaySuppressed;

  const getRouteTriggerElements = useCallback(() => {
    const selector = addRouteKey ? ADD_TRIGGER_SELECTOR[addRouteKey] : undefined;
    return selector ? Array.from(document.querySelectorAll<HTMLElement>(selector)) : [];
  }, [addRouteKey]);

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
    (newDir: ScrollDirection) => {
      if (isAutoScrolling.current || isSplashActive.current) return;
      setDirection(newDir);
      setIsVisible(true);
      clearHideTimer();
      hideTimer.current = setTimeout(hide, hideDelay);
    },
    [clearHideTimer, hide, hideDelay]
  );

  const refreshAddTriggerObserver = useCallback(() => {
    if (addTargetsObserverRef.current) {
      addTargetsObserverRef.current.disconnect();
      addTargetsObserverRef.current = null;
    }

    if (!isAddRoute) {
      setShowAddButton(false);
      return;
    }

    if (overlaySuppressed) {
      setShowAddButton(false);
      return;
    }

    const triggers = getRouteTriggerElements();
    if (triggers.length === 0) {
      setShowAddButton(true);
      return;
    }

    const visibilityMap = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibilityMap.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= 0.4);
        });
        const hasVisibleTrigger = Array.from(visibilityMap.values()).some(Boolean);
        setShowAddButton(!hasVisibleTrigger);
      },
      {
        threshold: [0, 0.2, 0.4, 0.6, 0.8, 1],
      }
    );

    triggers.forEach((trigger) => {
      visibilityMap.set(trigger, false);
      observer.observe(trigger);
    });

    addTargetsObserverRef.current = observer;
  }, [getRouteTriggerElements, isAddRoute, overlaySuppressed]);

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

  useEffect(() => {
    if (!addBtnRef.current) return;

    if (showAddButton && !wasAddVisible.current) {
      gsap.killTweensOf(addBtnRef.current);
      gsap.fromTo(
        addBtnRef.current,
        { opacity: 0, scale: 0.72, y: 18 },
        { opacity: 1, scale: 1, y: 0, duration: 0.28, ease: 'back.out(1.7)', overwrite: true }
      );
    } else if (!showAddButton && wasAddVisible.current) {
      gsap.killTweensOf(addBtnRef.current);
      gsap.to(addBtnRef.current, {
        opacity: 0,
        scale: 0.72,
        y: 18,
        duration: 0.22,
        ease: 'power2.in',
        overwrite: true,
      });
    } else if (!showAddButton && !wasAddVisible.current) {
      gsap.set(addBtnRef.current, { opacity: 0, scale: 0.72, y: 18 });
    }

    wasAddVisible.current = showAddButton;
  }, [showAddButton]);

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    const delta = Math.abs(currentY - lastY.current);

    if (Date.now() < suppressScrollUntilRef.current) {
      lastY.current = currentY;
      return;
    }

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
    }, 600);
  }, [direction, hide]);

  const openAddModal = useCallback(() => {
    const triggers = getRouteTriggerElements();
    if (triggers.length === 0) return;

    suppressScrollUntilRef.current = Date.now() + 700;
    clearHideTimer();
    isHovered.current = false;
    setIsVisible(false);

    if (btnRef.current) {
      gsap.killTweensOf(btnRef.current);
      gsap.set(btnRef.current, { opacity: 0, scale: 0.75, y: 12 });
    }

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const visibleTrigger = triggers.find((trigger) => {
      const rect = trigger.getBoundingClientRect();
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.right > 0 &&
        rect.top < viewportHeight &&
        rect.left < viewportWidth
      );
    });

    (visibleTrigger ?? triggers[0]).click();
  }, [clearHideTimer, getRouteTriggerElements]);

  useEffect(() => {
    let rafId = 0;

    const onScroll = () => {
      rafId = window.requestAnimationFrame(handleScroll);
    };

    const onResize = () => refreshAddTriggerObserver();
    const onSync = () => refreshAddTriggerObserver();

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
  }, [clearHideTimer, handleScroll, refreshAddTriggerObserver]);

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
    if (addBtnRef.current) {
      gsap.set(addBtnRef.current, { opacity: 0, scale: 0.72, y: 18 });
    }

    const markSplashDone = () => {
      isSplashActive.current = false;
      setIsSplashActiveState(false);
      refreshAddTriggerObserver();
    };

    if (!isSplashActive.current) {
      markSplashDone();
      return;
    }

    window.addEventListener('livoria-splash-complete', markSplashDone);
    const splashTimer = setTimeout(markSplashDone, 1200);

    return () => {
      window.removeEventListener('livoria-splash-complete', markSplashDone);
      clearTimeout(splashTimer);
    };
  }, [refreshAddTriggerObserver]);

  useEffect(() => {
    refreshAddTriggerObserver();

    if (!isAddRoute) return;

    const observer = new MutationObserver(() => {
      if (addTargetsRefreshTimerRef.current) {
        clearTimeout(addTargetsRefreshTimerRef.current);
      }
      addTargetsRefreshTimerRef.current = setTimeout(() => {
        refreshAddTriggerObserver();
        addTargetsRefreshTimerRef.current = null;
      }, 40);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return () => {
      observer.disconnect();
      if (addTargetsObserverRef.current) {
        addTargetsObserverRef.current.disconnect();
        addTargetsObserverRef.current = null;
      }
      if (addTargetsRefreshTimerRef.current) {
        clearTimeout(addTargetsRefreshTimerRef.current);
        addTargetsRefreshTimerRef.current = null;
      }
    };
  }, [isAddRoute, location.pathname, refreshAddTriggerObserver]);

  useEffect(() => {
    const syncDialogState = () => {
      setHasOpenDialog(document.querySelector('[role="dialog"]') !== null);
    };

    syncDialogState();

    const observer = new MutationObserver(() => {
      syncDialogState();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'data-state'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!overlaySuppressed) return;
    clearHideTimer();
    setIsVisible(false);
    setShowAddButton(false);
    if (btnRef.current) {
      gsap.killTweensOf(btnRef.current);
      gsap.set(btnRef.current, { opacity: 0, scale: 0.75, y: 12 });
    }
    if (addBtnRef.current) {
      gsap.killTweensOf(addBtnRef.current);
      gsap.set(addBtnRef.current, { opacity: 0, scale: 0.72, y: 18 });
    }
  }, [clearHideTimer, overlaySuppressed]);

  return (
    <FloatingActionControls
      addButtonRef={addBtnRef}
      scrollButtonRef={btnRef}
      direction={direction}
      isAddRoute={isAddRoute}
      isScrollVisible={isVisible}
      showAddButton={showAddButton}
      shouldRaiseScrollButton={shouldRaiseScrollButton}
      overlaySuppressed={overlaySuppressed}
      onAddClick={openAddModal}
      onScrollClick={scrollToTarget}
    />
  );
}
