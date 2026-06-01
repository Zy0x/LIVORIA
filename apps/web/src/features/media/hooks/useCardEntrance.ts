import { useEffect, type RefObject } from 'react';
import { dur, shouldLimitMotion, stag } from '@/lib/motion';

interface UseCardEntranceOptions {
  selector: string;
  disabled?: boolean;
  y?: number;
  rotateX?: number;
  scale?: number;
  duration?: number;
  stagger?: number;
  ease?: string;
}

export function useCardEntrance(
  containerRef: RefObject<HTMLElement>,
  animationKey: string,
  {
    selector,
    disabled = false,
    y = 22,
    rotateX = 4,
    scale = 0.96,
    duration = 0.42,
    stagger = 0.035,
    ease = 'power2.out',
  }: UseCardEntranceOptions,
) {
  useEffect(() => {
    if (disabled || shouldLimitMotion() || !containerRef.current || !animationKey) return;

    let context: { revert: () => void } | undefined;
    let frame = 0;
    let cancelled = false;
    let restoreInterruptedCards: (() => void) | undefined;

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !containerRef.current) return;

      frame = window.requestAnimationFrame(() => {
        if (cancelled || !containerRef.current) return;

        context = gsap.context(() => {
          const cards = Array.from(containerRef.current?.querySelectorAll<HTMLElement>(selector) ?? [])
            .filter((card) => card.offsetParent !== null);

          if (cards.length === 0) return;

          const revealCards = () => {
            gsap.set(cards, { opacity: 1, clearProps: 'opacity,transform' });
          };
          restoreInterruptedCards = revealCards;

          gsap.fromTo(
            cards,
            { opacity: 0, y, rotateX, scale },
            {
              opacity: 1,
              y: 0,
              rotateX: 0,
              scale: 1,
              duration: dur(duration),
              stagger: stag(stagger),
              ease,
              force3D: true,
              clearProps: 'opacity,transform',
              onInterrupt: revealCards,
              onComplete: revealCards,
            },
          );
        }, containerRef);
      });
    });

    return () => {
      cancelled = true;
      if (frame) window.cancelAnimationFrame(frame);
      context?.revert();
      restoreInterruptedCards?.();
    };
  }, [animationKey, containerRef, disabled, duration, ease, rotateX, scale, selector, stagger, y]);
}
