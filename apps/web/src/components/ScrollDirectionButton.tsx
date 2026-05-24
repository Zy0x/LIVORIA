import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FloatingActionControls } from './floating-action/FloatingActionControls';
import { ADD_TRIGGER_SELECTOR, type ScrollDirection } from './floating-action/floating-action-config';
import { shouldLimitMotion } from '@/lib/motion';

interface Props {
  hideDelay?: number;
  minDelta?: number;
}

const SPLASH_READY_KEY = 'livoria:splash-ready';
const VIEWPORT_VISIBILITY_RATIO = 0.4;
const ADD_OBSERVER_DEBOUNCE_MS = 120;
const AUTO_SCROLL_GUARD_MS = 650;
const SCROLL_EDGE_PX = 24;
const SCROLL_SETTLE_MS = 80;

function isInitialSplashActive() {
  if (typeof window === 'undefined') return true;
  if (shouldLimitMotion()) return false;
  return window.sessionStorage.getItem(SPLASH_READY_KEY) !== '1';
}

function getScrollY() {
  if (typeof window === 'undefined') return 0;
  return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function getScrollMax() {
  if (typeof document === 'undefined') return 0;
  const root = document.documentElement;
  return Math.max(0, root.scrollHeight - window.innerHeight);
}

function getVisibleRatio(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;

  if (rect.width <= 0 || rect.height <= 0 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= viewportHeight || rect.left >= viewportWidth) {
    return 0;
  }

  const visibleWidth = Math.max(0, Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
  return (visibleWidth * visibleHeight) / (rect.width * rect.height);
}

export function resolveScrollButtonDirection({
  currentY,
  previousY,
  scrollMax,
  previousDirection,
  minDelta,
}: {
  currentY: number;
  previousY: number;
  scrollMax: number;
  previousDirection: ScrollDirection;
  minDelta: number;
}): ScrollDirection {
  if (scrollMax <= SCROLL_EDGE_PX) return 'down';
  if (currentY >= scrollMax - SCROLL_EDGE_PX) return 'up';
  if (currentY <= SCROLL_EDGE_PX) return 'down';

  const delta = currentY - previousY;
  if (Math.abs(delta) < minDelta) return previousDirection;

  return delta > 0 ? 'down' : 'up';
}

export default function ScrollDirectionButton({
  hideDelay = 1200,
  minDelta = 2,
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
  const directionRef = useRef<ScrollDirection>('down');
  const scrollRafRef = useRef<number | null>(null);
  const scrollSettleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addTargetsRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogSyncRafRef = useRef<number | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const addTargetsObserverRef = useRef<IntersectionObserver | null>(null);
  const isHovered = useRef(false);
  const isSplashActive = useRef(isInitialSplashActive());
  const hasOpenDialogRef = useRef(false);

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

  const clearScrollSettleTimer = useCallback(() => {
    if (scrollSettleTimerRef.current) {
      clearTimeout(scrollSettleTimerRef.current);
      scrollSettleTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    if (isHovered.current) return;
    setIsVisible(false);
    clearHideTimer();
  }, [clearHideTimer]);

  const show = useCallback(
    (newDir: ScrollDirection) => {
      if (isAutoScrolling.current || isSplashActive.current) return;
      directionRef.current = newDir;
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

    const initialHasVisibleTrigger = triggers.some((trigger) => getVisibleRatio(trigger) >= VIEWPORT_VISIBILITY_RATIO);
    setShowAddButton(!initialHasVisibleTrigger);

    const visibilityMap = new Map<Element, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibilityMap.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= VIEWPORT_VISIBILITY_RATIO);
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

  const handleScroll = useCallback(() => {
    const currentY = getScrollY();
    const previousY = lastY.current;
    const delta = Math.abs(currentY - previousY);

    if (Date.now() < suppressScrollUntilRef.current) {
      lastY.current = currentY;
      return;
    }

    if (delta < minDelta) return;

    const newDir = resolveScrollButtonDirection({
      currentY,
      previousY,
      scrollMax: getScrollMax(),
      previousDirection: directionRef.current,
      minDelta,
    });
    lastY.current = currentY;
    show(newDir);
  }, [minDelta, show]);

  const syncSettledScrollState = useCallback(() => {
    if (Date.now() < suppressScrollUntilRef.current || isAutoScrolling.current || isSplashActive.current) return;
    const currentY = getScrollY();
    const nextDirection = resolveScrollButtonDirection({
      currentY,
      previousY: currentY,
      scrollMax: getScrollMax(),
      previousDirection: directionRef.current,
      minDelta,
    });
    lastY.current = currentY;
    directionRef.current = nextDirection;
    setDirection(nextDirection);
    setIsVisible(true);
    clearHideTimer();
    hideTimer.current = setTimeout(hide, hideDelay);
  }, [clearHideTimer, hide, hideDelay]);

  const scrollToTarget = useCallback(() => {
    hide();
    const target = direction === 'up' ? 0 : document.documentElement.scrollHeight;
    isAutoScrolling.current = true;

    window.scrollTo({ top: target, behavior: 'smooth' });

    setTimeout(() => {
      isAutoScrolling.current = false;
      lastY.current = getScrollY();
      const nextDirection = direction === 'up' ? 'down' : 'up';
      directionRef.current = nextDirection;
      setDirection(nextDirection);
    }, AUTO_SCROLL_GUARD_MS);
  }, [direction, hide]);

  const openAddModal = useCallback(() => {
    const triggers = getRouteTriggerElements();
    if (triggers.length === 0) return;

    suppressScrollUntilRef.current = Date.now() + 700;
    clearHideTimer();
    isHovered.current = false;
    setIsVisible(false);

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
    const onScroll = () => {
      if (scrollRafRef.current !== null) return;
      scrollRafRef.current = window.requestAnimationFrame(() => {
        scrollRafRef.current = null;
        handleScroll();
      });
      clearScrollSettleTimer();
      scrollSettleTimerRef.current = setTimeout(syncSettledScrollState, SCROLL_SETTLE_MS);
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
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
        scrollRafRef.current = null;
      }
      clearScrollSettleTimer();
      clearHideTimer();
    };
  }, [clearHideTimer, clearScrollSettleTimer, handleScroll, refreshAddTriggerObserver, syncSettledScrollState]);

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
    lastY.current = getScrollY();
    directionRef.current = resolveScrollButtonDirection({
      currentY: lastY.current,
      previousY: lastY.current,
      scrollMax: getScrollMax(),
      previousDirection: 'down',
      minDelta,
    });
    setDirection(directionRef.current);
    setIsVisible(false);
  }, [location.pathname, minDelta]);

  useEffect(() => {
    lastY.current = getScrollY();

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
      }, ADD_OBSERVER_DEBOUNCE_MS);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
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
      const next = document.querySelector('[role="dialog"]') !== null;
      if (next === hasOpenDialogRef.current) return;
      hasOpenDialogRef.current = next;
      setHasOpenDialog(next);
    };

    syncDialogState();

    const observer = new MutationObserver(() => {
      if (dialogSyncRafRef.current !== null) return;
      dialogSyncRafRef.current = window.requestAnimationFrame(() => {
        dialogSyncRafRef.current = null;
        syncDialogState();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      if (dialogSyncRafRef.current !== null) {
        cancelAnimationFrame(dialogSyncRafRef.current);
        dialogSyncRafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!overlaySuppressed) return;
    clearHideTimer();
    setIsVisible(false);
    setShowAddButton(false);
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
