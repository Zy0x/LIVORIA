import { useEffect, type RefObject } from 'react';
import { shouldLimitMotion } from '@/lib/motion';

interface UseGsapCardHoverOptions {
  selector?: string;
  disabled?: boolean;
}

export function useGsapCardHover(
  containerRef: RefObject<HTMLElement>,
  animationKey: string,
  { selector = '.media-hover-card', disabled = false }: UseGsapCardHoverOptions = {},
) {
  useEffect(() => {
    if (disabled || shouldLimitMotion() || !containerRef.current || !animationKey) return;
    if (!window.matchMedia('(any-hover: hover) and (any-pointer: fine)').matches) return;

    let cancelled = false;
    let cleanups: Array<() => void> = [];

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !containerRef.current) return;

      const cards = Array.from(containerRef.current.querySelectorAll<HTMLElement>(selector))
        .filter((card) => card.offsetParent !== null);

      cleanups = cards.map((card) => {
        const face = card.querySelector<HTMLElement>('.media-card, .anime-card, .donghua-card');
        const cover = face?.querySelector<HTMLElement>('img');
        const fanOne = card.querySelector<HTMLElement>('.media-card-fan-1');
        const fanTwo = card.querySelector<HTMLElement>('.media-card-fan-2');
        const isStacked = Boolean(fanOne || fanTwo);
        const targets = [card, face, cover, fanOne, fanTwo].filter(Boolean) as HTMLElement[];

        card.dataset.gsapHover = 'ready';
        gsap.set(card, {
          transformPerspective: 900,
          transformOrigin: '50% 55%',
          willChange: 'transform, filter',
        });
        if (face) {
          gsap.set(face, {
            transformOrigin: '50% 55%',
            willChange: 'transform, box-shadow, border-color',
          });
        }
        if (cover) {
          gsap.set(cover, {
            transformOrigin: '50% 50%',
            willChange: 'transform',
          });
        }

        const hoverTo = gsap.quickTo(card, 'y', { duration: 0.28, ease: 'power3.out' });
        const scaleTo = gsap.quickTo(card, 'scale', { duration: 0.28, ease: 'power3.out' });
        const rotateXTo = gsap.quickTo(card, 'rotateX', { duration: 0.26, ease: 'power3.out' });
        const rotateYTo = gsap.quickTo(card, 'rotateY', { duration: 0.26, ease: 'power3.out' });
        const coverXTo = cover ? gsap.quickTo(cover, 'x', { duration: 0.34, ease: 'power3.out' }) : null;
        const coverYTo = cover ? gsap.quickTo(cover, 'y', { duration: 0.34, ease: 'power3.out' }) : null;

        const handlePointerEnter = () => {
          gsap.killTweensOf(targets);
          if (face) {
            gsap.to(face, {
              borderColor: isStacked ? 'hsl(var(--primary) / 0.42)' : 'hsl(var(--primary) / 0.3)',
              boxShadow: isStacked
                ? '0 26px 48px -20px hsl(var(--foreground) / 0.55)'
                : '0 20px 38px -20px hsl(var(--foreground) / 0.46)',
              duration: 0.28,
              ease: 'power3.out',
              overwrite: 'auto',
            });
          }
          if (cover) {
            gsap.to(cover, {
              scale: isStacked ? 1.055 : 1.035,
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
          hoverTo(isStacked ? -11 : -7);
          scaleTo(isStacked ? 1.02 : 1.014);
        };

        const handlePointerMove = (event: PointerEvent) => {
          const rect = card.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          const tilt = isStacked ? 5.5 : 3.8;
          rotateXTo(-y * tilt);
          rotateYTo(x * tilt);
          coverXTo?.(x * -5);
          coverYTo?.(y * -5);
        };

        const handlePointerLeave = () => {
          gsap.to(card, {
            y: 0,
            scale: 1,
            rotateX: 0,
            rotateY: 0,
            duration: 0.32,
            ease: 'power3.out',
            overwrite: 'auto',
          });
          if (cover) {
            gsap.to(cover, {
              x: 0,
              y: 0,
              scale: 1,
              duration: 0.42,
              ease: 'power3.out',
              overwrite: 'auto',
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
            });
          }
        };

        card.addEventListener('pointerenter', handlePointerEnter);
        card.addEventListener('pointermove', handlePointerMove);
        card.addEventListener('pointerleave', handlePointerLeave);

        return () => {
          card.removeEventListener('pointerenter', handlePointerEnter);
          card.removeEventListener('pointermove', handlePointerMove);
          card.removeEventListener('pointerleave', handlePointerLeave);
          delete card.dataset.gsapHover;
          gsap.killTweensOf(targets);
          gsap.set(targets, { clearProps: 'transform,willChange,boxShadow,borderColor,filter' });
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
