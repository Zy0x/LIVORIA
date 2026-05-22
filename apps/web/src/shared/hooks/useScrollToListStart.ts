import { useCallback, type RefObject } from 'react';

type TargetMap<T extends string> = Record<T, RefObject<HTMLElement | null>>;

export function useScrollToListStart<T extends string>(targets: TargetMap<T>, stickyOffset = 88) {
  return useCallback((target: T) => {
    const scrollAfterRender = () => {
      const element = targets[target]?.current;
      if (!element) return;

      const top = element.getBoundingClientRect().top + window.scrollY - stickyOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      element.focus({ preventScroll: true });
    };

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollAfterRender);
    });
  }, [stickyOffset, targets]);
}
