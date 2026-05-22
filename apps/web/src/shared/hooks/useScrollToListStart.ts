import { useCallback, useRef, type RefObject } from 'react';

type TargetMap<T extends string> = Record<T, RefObject<HTMLElement | null>>;

function getStickyOffset(fallback: number) {
  if (typeof document === 'undefined') return fallback;

  const stickyHeader = document.querySelector<HTMLElement>('.header-blur');
  if (!stickyHeader) return fallback;

  return Math.ceil(stickyHeader.getBoundingClientRect().height + 12);
}

export function useScrollToListStart<T extends string>(targets: TargetMap<T>, stickyOffset = 76) {
  return useCallback((target: T) => {
    const scrollAfterRender = (attempt = 0) => {
      const element = targets[target]?.current;
      if (!element) {
        if (attempt < 4) {
          window.requestAnimationFrame(() => scrollAfterRender(attempt + 1));
        }
        return;
      }

      const top = element.getBoundingClientRect().top + window.scrollY - getStickyOffset(stickyOffset);
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
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
  }, []);

  const flushListScroll = useCallback(() => {
    const target = pendingTargetRef.current;
    if (!target) return;

    pendingTargetRef.current = null;
    scrollToListStart(target);
  }, [scrollToListStart]);

  return { requestListScroll, flushListScroll };
}
