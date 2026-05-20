import { useEffect } from 'react';

/**
 * Hook global: Saat mouse hover di area horizontal-scrollable,
 * prioritaskan scroll horizontal. Setelah mentok, baru lanjut vertikal.
 * 
 * Tambahkan attribute `data-horizontal-scroll` ke elemen scrollable.
 */
export function useHorizontalScrollPriority() {
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      // Hanya intercept scroll vertikal (deltaY)
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;

      const target = e.target as HTMLElement;
      const scrollable = target.closest('[data-horizontal-scroll]') as HTMLElement;
      if (!scrollable) return;

      const { scrollLeft, scrollWidth, clientWidth } = scrollable;
      const maxScroll = scrollWidth - clientWidth;

      // Jika tidak ada overflow horizontal, skip
      if (maxScroll <= 1) return;

      const atStart = scrollLeft <= 0;
      const atEnd = scrollLeft >= maxScroll - 1;

      // Jika sudah mentok di arah scroll, biarkan vertikal
      if (e.deltaY > 0 && atEnd) return;
      if (e.deltaY < 0 && atStart) return;

      // Override: scroll horizontal
      e.preventDefault();
      scrollable.scrollLeft += e.deltaY;
    };

    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, []);
}