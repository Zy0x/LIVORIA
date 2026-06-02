import { useEffect, type RefObject } from 'react';
import { dur, shouldLimitMotion } from '@/lib/motion';

export function useMediaPageEntrance(containerRef: RefObject<HTMLElement>, prefix: 'anime' | 'donghua', isLoading: boolean) {
  useEffect(() => {
    if (shouldLimitMotion() || !containerRef.current || isLoading) return;
    let restoreElements: (() => void) | undefined;
    let cancelled = false;
    let ctx: { revert: () => void } | undefined;

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !containerRef.current) return;
      ctx = gsap.context(() => {
      const header = containerRef.current?.querySelector(`.${prefix}-page-header`);
      const pills = containerRef.current?.querySelectorAll(`.${prefix}-stat-pill`);
      const toolbar = containerRef.current?.querySelector(`.${prefix}-toolbar`);
      const targets = [
        header,
        ...(pills ? Array.from(pills) : []),
        toolbar,
      ].filter(Boolean);
      restoreElements = () => gsap.set(targets, { opacity: 1, clearProps: 'opacity,transform' });

      const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });
      tl.eventCallback('onInterrupt', restoreElements);
      tl.eventCallback('onComplete', restoreElements);
      if (header) tl.fromTo(header, { y: -20, scale: 0.97 }, { y: 0, scale: 1, duration: dur(0.45), clearProps: 'transform' });
      if (pills && pills.length > 0) tl.fromTo(pills, { y: 14, scale: 0.9 }, { y: 0, scale: 1, duration: dur(0.35), stagger: dur(0.06), ease: 'back.out(1.5)', clearProps: 'transform' }, '-=0.2');
      if (toolbar) tl.fromTo(toolbar, { y: 18 }, { y: 0, duration: dur(0.4), clearProps: 'transform' }, '-=0.15');
      }, containerRef);
    });

    return () => {
      cancelled = true;
      ctx?.revert();
      restoreElements?.();
    };
  }, [containerRef, isLoading, prefix]);
}
