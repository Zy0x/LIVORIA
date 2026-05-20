import { useCallback, type RefObject } from 'react';

type TargetMap<T extends string> = Record<T, RefObject<HTMLElement | null>>;

export function useScrollToListStart<T extends string>(targets: TargetMap<T>, stickyOffset = 88) {
  return useCallback((target: T) => {
    const element = targets[target]?.current;
    if (!element) return;

    window.requestAnimationFrame(() => {
      const top = element.getBoundingClientRect().top + window.scrollY - stickyOffset;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    });
  }, [stickyOffset, targets]);
}
