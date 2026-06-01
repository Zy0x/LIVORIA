import { useEffect, type RefObject } from 'react';

const RECOVERY_DELAYS = [650, 1400];

export function useMediaAnimationRecovery(
  containerRef: RefObject<HTMLElement>,
  animationKey: string,
  disabled = false,
) {
  useEffect(() => {
    if (disabled || !containerRef.current || !animationKey) return;

    let cancelled = false;
    const timers: number[] = [];

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !containerRef.current) return;

      const recover = () => {
        if (cancelled || !containerRef.current) return;
        const targets = containerRef.current.querySelectorAll<HTMLElement>([
          '.anime-page-header',
          '.donghua-page-header',
          '.anime-stat-pill',
          '.donghua-stat-pill',
          '.anime-toolbar',
          '.donghua-toolbar',
          '.anime-card',
          '.donghua-card',
          '.anime-watchlist-card',
          '.donghua-watchlist-card',
        ].join(','));

        if (targets.length === 0) return;
        gsap.set(targets, { opacity: 1, clearProps: 'opacity,transform' });
      };

      RECOVERY_DELAYS.forEach((delay) => {
        timers.push(window.setTimeout(recover, delay));
      });
    });

    return () => {
      cancelled = true;
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [animationKey, containerRef, disabled]);
}
