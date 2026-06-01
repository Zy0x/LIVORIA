import { useEffect, type RefObject } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

interface UseGsapCardHoverOptions {
  selector?: string;
  disabled?: boolean;
}

type QuickSetter = (value: number) => void;

export function useGsapCardHover(
  containerRef: RefObject<HTMLElement>,
  animationKey: string,
  { selector = '.media-hover-card', disabled = false }: UseGsapCardHoverOptions = {},
) {
  useEffect(() => {
    if (disabled || prefersReducedMotion() || !containerRef.current || !animationKey) return;

    let cancelled = false;
    let cleanups: Array<() => void> = [];

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !containerRef.current) return;

      const cards = Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector))
        .filter((card) => card.offsetParent !== null);

      cleanups = cards.map((card) => {
        const faceSelector = '.media-card, .anime-card, .donghua-card, .waifu-card, .obat-card, .catatan-card';
        const face = card.matches(faceSelector)
          ? card
          : card.querySelector<HTMLElement>(faceSelector);
        const cover = face?.querySelector<HTMLElement>('img');
        const fanOne = card.querySelector<HTMLElement>('.media-card-fan-1');
        const fanTwo = card.querySelector<HTMLElement>('.media-card-fan-2');
        const isStacked = Boolean(fanOne || fanTwo);

        card.dataset.gsapHover = 'ready';
        card.style.transformOrigin = '50% 55%';
        card.style.willChange = 'transform, filter';
        if (face) {
          face.style.transformOrigin = '50% 55%';
          face.style.willChange = 'transform, box-shadow, border-color';
        }
        if (cover) {
          cover.style.transformOrigin = '50% 50%';
          cover.style.willChange = 'transform';
        }

        let active = false;
        let hoverTo: QuickSetter | null = null;
        let scaleTo: QuickSetter | null = null;
        let rotateXTo: QuickSetter | null = null;
        let rotateYTo: QuickSetter | null = null;
        let coverXTo: QuickSetter | null = null;
        let coverYTo: QuickSetter | null = null;
        const hoverTweenTargets = Array.from(new Set([card, cover, fanOne, fanTwo].filter(Boolean) as HTMLElement[]));

        const ensureQuickSetters = () => {
          hoverTo ??= gsap.quickTo(card, 'y', { duration: 0.28, ease: 'power3.out' });
          scaleTo ??= gsap.quickTo(card, 'scale', { duration: 0.28, ease: 'power3.out' });
          rotateXTo ??= gsap.quickTo(card, 'rotateX', { duration: 0.26, ease: 'power3.out' });
          rotateYTo ??= gsap.quickTo(card, 'rotateY', { duration: 0.26, ease: 'power3.out' });
          if (cover) {
            coverXTo ??= gsap.quickTo(cover, 'x', { duration: 0.34, ease: 'power3.out' });
            coverYTo ??= gsap.quickTo(cover, 'y', { duration: 0.34, ease: 'power3.out' });
          }
        };

        const handlePointerEnter = () => {
          active = true;
          ensureQuickSetters();
          gsap.set(card, { transformPerspective: 900 });
          // Keep the face element out of blanket kills so entrance opacity tweens
          // cannot be interrupted during heavy load/scroll.
          gsap.killTweensOf(hoverTweenTargets);
          if (face) {
            gsap.to(face, {
              borderColor: isStacked ? 'hsl(var(--primary) / 0.42)' : 'hsl(var(--primary) / 0.3)',
              boxShadow: isStacked
                ? '0 26px 48px -20px hsl(var(--foreground) / 0.55)'
                : '0 24px 44px -20px hsl(var(--foreground) / 0.5)',
              duration: 0.28,
              ease: 'back.out(1.25)',
              overwrite: 'auto',
            });
          }
          if (cover) {
            gsap.to(cover, {
              scale: isStacked ? 1.055 : 1.05,
              duration: 0.52,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          }
          if (fanOne) {
            gsap.to(fanOne, {
              x: fanTwo ? -13 : -10,
              y: fanTwo ? -10 : -8,
              rotate: fanTwo ? -8 : -7,
              scale: 0.99,
              duration: 0.42,
              ease: 'back.out(1.65)',
              overwrite: 'auto',
            });
          }
          if (fanTwo) {
            gsap.to(fanTwo, {
              x: -25,
              y: -16,
              rotate: -15,
              scale: 0.97,
              duration: 0.48,
              ease: 'back.out(1.45)',
              overwrite: 'auto',
            });
          }
          hoverTo(isStacked ? -11 : -10);
          scaleTo(isStacked ? 1.02 : 1.026);
        };

        const handlePointerMove = (event: PointerEvent) => {
          if (!active) return;
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          const tilt = isStacked ? 5.5 : 4.8;
          rotateXTo(-y * tilt);
          rotateYTo(x * tilt);
          coverXTo?.(x * (isStacked ? -5 : -4));
          coverYTo?.(y * (isStacked ? -5 : -4));
        };

        const resetHover = () => {
          if (!active) return;
          active = false;
          gsap.killTweensOf(hoverTweenTargets);
          gsap.to(card, {
            y: 0,
            scale: 1,
            rotateX: 0,
            rotateY: 0,
              duration: 0.32,
              ease: 'power3.out',
              overwrite: 'auto',
              onComplete: () => {
                if (!active) {
                  gsap.set(card, { clearProps: 'transform,translate,rotate,scale,transformPerspective' });
                }
              },
            });
          if (cover) {
            gsap.to(cover, {
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.42,
              ease: 'power3.out',
              overwrite: 'auto',
              onComplete: () => {
                if (!active) {
                  gsap.set(cover, { clearProps: 'transform,translate,rotate,scale' });
                }
              },
            });
          }
          if (face) {
            gsap.to(face, {
              clearProps: 'boxShadow,borderColor',
              duration: 0.24,
              ease: 'power2.out',
              overwrite: 'auto',
            });
          }
          if (fanOne) {
            gsap.to(fanOne, {
              x: 0,
              y: -1,
              rotate: -1.5,
              scale: 1,
              duration: 0.3,
              ease: 'power3.out',
              overwrite: 'auto',
              onComplete: () => {
                if (!active) {
                  gsap.set(fanOne, { clearProps: 'transform,translate,rotate,scale' });
                }
              },
            });
          }
          if (fanTwo) {
            gsap.to(fanTwo, {
              x: 0,
              y: -2,
              rotate: -3,
              scale: 1,
              duration: 0.32,
              ease: 'power3.out',
              overwrite: 'auto',
              onComplete: () => {
                if (!active) {
                  gsap.set(fanTwo, { clearProps: 'transform,translate,rotate,scale' });
                }
              },
            });
          }
        };

        card.addEventListener('pointerenter', handlePointerEnter);
        card.addEventListener('pointermove', handlePointerMove);
        card.addEventListener('pointerleave', resetHover);
        card.addEventListener('pointercancel', resetHover);
        card.addEventListener('lostpointercapture', resetHover);
        window.addEventListener('blur', resetHover);
        window.addEventListener('scroll', resetHover, { capture: true, passive: true });
        window.addEventListener('resize', resetHover, { passive: true });
        document.addEventListener('visibilitychange', resetHover);

        return () => {
          card.removeEventListener('pointerenter', handlePointerEnter);
          card.removeEventListener('pointermove', handlePointerMove);
          card.removeEventListener('pointerleave', resetHover);
          card.removeEventListener('pointercancel', resetHover);
          card.removeEventListener('lostpointercapture', resetHover);
          window.removeEventListener('blur', resetHover);
          window.removeEventListener('scroll', resetHover, true);
          window.removeEventListener('resize', resetHover);
          document.removeEventListener('visibilitychange', resetHover);
          delete card.dataset.gsapHover;
          gsap.killTweensOf(hoverTweenTargets);
          gsap.set(hoverTweenTargets, { clearProps: 'transform,transformPerspective,translate,rotate,scale,filter' });
          card.style.removeProperty('transform-origin');
          card.style.removeProperty('will-change');
          if (face) {
            gsap.set(face, { clearProps: 'boxShadow,borderColor' });
            face.style.removeProperty('transform-origin');
            face.style.removeProperty('will-change');
          }
          if (cover) {
            cover.style.removeProperty('transform-origin');
            cover.style.removeProperty('will-change');
          }
        };
      });
    });

    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
    };
  }, [animationKey, containerRef, disabled, selector]);
}
