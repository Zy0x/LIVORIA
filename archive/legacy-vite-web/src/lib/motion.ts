/**
 * motion.ts — LIVORIA
 * 
 * Centralized motion/animation configuration.
 * Detects mobile and provides scaled animation parameters
 * so GSAP animations are smoother on all devices.
 */

const MOBILE_BREAKPOINT = 768;

/** Cached mobile check — safe for SSR */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT;
};

/** Reduce animation intensity on mobile */
export const m = {
  /** Duration multiplier: shorter on mobile */
  get dur() { return isMobile() ? 0.55 : 1; },
  /** Stagger multiplier: less stagger on mobile */
  get stag() { return isMobile() ? 0.4 : 1; },
  /** Whether to skip heavy per-card animations on mobile */
  get skipCardAnim() { return isMobile(); },
};

/** Scale a duration by mobile factor */
export function dur(base: number): number {
  return base * m.dur;
}

/** Scale a stagger value by mobile factor */
export function stag(base: number): number {
  return base * m.stag;
}

/** Get smooth defaults for GSAP timeline */
export function smoothDefaults() {
  return {
    ease: 'power2.out' as const,
    force3D: true,
  };
}

/** Entrance animation config — scales for mobile */
export function entranceConfig(base: {
  duration?: number;
  stagger?: number;
  delay?: number;
  y?: number;
  scale?: number;
}) {
  return {
    duration: dur(base.duration ?? 0.4),
    stagger: stag(base.stagger ?? 0.05),
    delay: (base.delay ?? 0) * m.dur,
    y: (base.y ?? 20) * (isMobile() ? 0.6 : 1),
    scale: base.scale ?? 0.97,
  };
}

/** Card hover config — returns null on mobile (use CSS instead) */
export function cardHoverConfig() {
  if (isMobile()) return null;
  return {
    enter: { y: -6, scale: 1.02, duration: 0.35, ease: 'back.out(1.7)', force3D: true },
    leave: { y: 0, scale: 1, duration: 0.3, ease: 'power2.out', force3D: true },
    fan1Enter: { rotate: -5, x: -4, y: -3, duration: 0.38, ease: 'back.out(2)', force3D: true },
    fan1Leave: { rotate: -1.5, x: 0, y: -1, duration: 0.35, ease: 'power2.out', force3D: true },
    fan2Enter: { rotate: -9, x: -7, y: -5, duration: 0.42, ease: 'back.out(2.5)', force3D: true },
    fan2Leave: { rotate: -3, x: 0, y: -2, duration: 0.4, ease: 'power2.out', force3D: true },
  };
}
