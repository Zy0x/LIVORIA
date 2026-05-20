/**
 * useLazyImage — LIVORIA
 * Lazy loading for images with IntersectionObserver
 * Returns a ref to attach to the image container and the loaded state
 */

import { useRef, useState, useEffect, useCallback } from 'react';

const imageCache = new Set<string>();

export function useLazyImage(src: string | undefined | null, rootMargin = '200px') {
  const ref = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(() => !src || imageCache.has(src || ''));
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!src || imageCache.has(src)) {
      setLoaded(true);
      setInView(true);
      return;
    }

    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src, rootMargin]);

  const onLoad = useCallback(() => {
    if (src) imageCache.add(src);
    setLoaded(true);
  }, [src]);

  return { ref, inView, loaded, onLoad, shouldRender: inView || loaded };
}
