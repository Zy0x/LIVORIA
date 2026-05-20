import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import { dur, isMobile } from '@/lib/motion';

export function useMediaPageEntrance(containerRef: RefObject<HTMLElement>, prefix: 'anime' | 'donghua', isLoading: boolean) {
  useEffect(() => {
    if (isMobile() || !containerRef.current || isLoading) return;
    const ctx = gsap.context(() => {
      const header = containerRef.current?.querySelector(`.${prefix}-page-header`);
      const pills = containerRef.current?.querySelectorAll(`.${prefix}-stat-pill`);
      const cards = containerRef.current?.querySelectorAll(`.${prefix}-card`);
      const toolbar = containerRef.current?.querySelector(`.${prefix}-toolbar`);

      const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });
      if (header) tl.fromTo(header, { opacity: 0, y: -20, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: dur(0.45), clearProps: 'all' });
      if (pills && pills.length > 0) tl.fromTo(pills, { opacity: 0, y: 14, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: dur(0.35), stagger: dur(0.06), ease: 'back.out(1.5)', clearProps: 'all' }, '-=0.2');
      if (toolbar) tl.fromTo(toolbar, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: dur(0.4), clearProps: 'all' }, '-=0.15');
      if (cards && cards.length > 0) {
        tl.fromTo(cards, { opacity: 0, y: 24, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: dur(0.4), stagger: dur(0.035), ease: 'power2.out', clearProps: 'all' }, '-=0.2');
      }
    }, containerRef);
    return () => ctx.revert();
  }, [containerRef, isLoading, prefix]);
}
