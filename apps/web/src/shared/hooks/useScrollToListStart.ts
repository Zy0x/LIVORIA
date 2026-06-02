import { useCallback, useRef, type RefObject } from 'react';
import { isMobile } from '@/lib/motion';

type TargetMap<T extends string> = Record<T, RefObject<HTMLElement | null>>;

const ROOT_CORRECTION_DELAYS = [120, 280];
const INSTANT_SCROLL_CORRECTION_DELAYS = [32, 120, 280];
const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);
const FEEDBACK_ID = 'livoria-pagination-feedback';
let pendingListScrollTarget: string | null = null;

function getStickyOffset(fallback: number) {
  if (typeof document === 'undefined') return fallback;

  const stickyHeader = document.querySelector<HTMLElement>('.header-blur');
  if (!stickyHeader) return fallback;

  return Math.ceil(stickyHeader.getBoundingClientRect().height + 12);
}

function isDocumentScroller(scroller: HTMLElement | null) {
  return !scroller || scroller === document.documentElement || scroller === document.body;
}

function getScrollTop(scroller: HTMLElement | null) {
  if (isDocumentScroller(scroller)) {
    return window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
  }

  return scroller.scrollTop;
}

function isScrollableElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  return (
    SCROLLABLE_OVERFLOW.has(style.overflowY) &&
    element.scrollHeight > element.clientHeight + 1
  );
}

function getScrollRoot(element: HTMLElement) {
  let current = element.parentElement;

  while (current && current !== document.body && current !== document.documentElement) {
    if (isScrollableElement(current)) return current;
    current = current.parentElement;
  }

  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

function getElementTop(element: HTMLElement, scroller: HTMLElement | null) {
  if (isDocumentScroller(scroller)) {
    return element.getBoundingClientRect().top + getScrollTop(null);
  }

  return element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
}

function scrollToTop(scroller: HTMLElement | null, top: number, behavior: ScrollBehavior) {
  const safeTop = Math.max(0, top);

  if (isDocumentScroller(scroller)) {
    window.scrollTo({ top: safeTop, behavior });
    return;
  }

  scroller.scrollTo({ top: safeTop, behavior });
}

function disableBrowserScrollRestoration() {
  if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) return;
  window.history.scrollRestoration = 'manual';
}

function showPaginationFeedback() {
  if (typeof document === 'undefined' || !isMobile()) return;
  let element = document.getElementById(FEEDBACK_ID);

  if (!element) {
    element = document.createElement('div');
    element.id = FEEDBACK_ID;
    element.className = 'pagination-route-feedback';
    element.setAttribute('role', 'status');
    element.setAttribute('aria-live', 'polite');
    element.innerHTML = '<span class="pagination-route-feedback-dot"></span><span>Memuat halaman...</span>';
    document.body.appendChild(element);
  }

  element.dataset.visible = 'true';
}

function hidePaginationFeedback() {
  if (typeof window === 'undefined') return;
  const element = document.getElementById(FEEDBACK_ID);
  if (!element) return;

  window.setTimeout(() => {
    element.dataset.visible = 'false';
  }, 180);
}

export function useScrollToListStart<T extends string>(targets: TargetMap<T>, stickyOffset = 76) {
  return useCallback((target: T) => {
    disableBrowserScrollRestoration();

    const scrollAfterRender = (attempt = 0) => {
      const element = targets[target]?.current;
      if (!element) {
        if (attempt < 4) {
          window.requestAnimationFrame(() => scrollAfterRender(attempt + 1));
        }
        return;
      }

      const scrollOnce = (behavior: ScrollBehavior) => {
        const scroller = getScrollRoot(element);
        const top = getElementTop(element, scroller) - getStickyOffset(stickyOffset);
        scrollToTop(scroller, top, behavior);
      };

      const instant = isMobile();
      scrollOnce(instant ? 'auto' : 'smooth');
      (instant ? INSTANT_SCROLL_CORRECTION_DELAYS : ROOT_CORRECTION_DELAYS).forEach((delay) => {
        window.setTimeout(() => window.requestAnimationFrame(() => scrollOnce('auto')), delay);
      });
      element.focus({ preventScroll: true });
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollAfterRender);
    });
  }, [stickyOffset, targets]);
}

export function useDeferredListScroll<T extends string>(scrollToListStart: (target: T) => void) {
  const pendingTargetRef = useRef<T | null>(null);

  const requestListScroll = useCallback((target: T) => {
    pendingTargetRef.current = target;
    pendingListScrollTarget = target;

    if (isMobile()) {
      showPaginationFeedback();
      scrollToListStart(target);
    }
  }, [scrollToListStart]);

  const flushListScroll = useCallback(() => {
    const target = pendingTargetRef.current ?? (pendingListScrollTarget as T | null);
    if (!target) return;

    pendingTargetRef.current = null;
    pendingListScrollTarget = null;
    scrollToListStart(target);
    hidePaginationFeedback();
  }, [scrollToListStart]);

  return { requestListScroll, flushListScroll };
}
