/**
 * useIncrementalRender.ts
 * 
 * Hook untuk merender list secara bertahap (incremental) agar tidak membebani DOM.
 * Menggunakan batching untuk menampilkan items dalam chunks, dengan delay antar batch.
 */

import { useEffect, useState, useRef } from 'react';

interface UseIncrementalRenderOptions {
  batchSize?: number;
  delayMs?: number;
  enabled?: boolean;
}

/**
 * Merender items secara bertahap dalam batch
 * @param items - Array of items to render
 * @param options - Configuration
 * @returns Array of items yang sudah siap dirender (incremental)
 */
export function useIncrementalRender<T>(
  items: T[],
  options: UseIncrementalRenderOptions = {}
): T[] {
  const { batchSize = 20, delayMs = 50, enabled = true } = options;
  const [displayedItems, setDisplayedItems] = useState<T[]>([]);
  const batchIndexRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplayedItems(items);
      return;
    }

    // Reset ketika items berubah
    batchIndexRef.current = 0;
    setDisplayedItems([]);

    if (items.length === 0) return;

    // Render batch pertama immediately
    const firstBatch = items.slice(0, batchSize);
    setDisplayedItems(firstBatch);
    batchIndexRef.current = batchSize;

    // Schedule batches berikutnya
    const scheduleBatch = () => {
      const nextIndex = batchIndexRef.current;
      if (nextIndex >= items.length) return;

      timeoutRef.current = setTimeout(() => {
        const nextBatch = items.slice(nextIndex, nextIndex + batchSize);
        setDisplayedItems(prev => [...prev, ...nextBatch]);
        batchIndexRef.current = nextIndex + batchSize;
        scheduleBatch();
      }, delayMs);
    };

    scheduleBatch();

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [items, batchSize, delayMs, enabled]);

  return displayedItems;
}

/**
 * Hook untuk defer rendering dengan useDeferredValue-like behavior
 * Memastikan UI updates tidak memblokir interaksi user
 */
export function useDeferredRender<T>(
  items: T[],
  isPending?: boolean
): { items: T[]; isReady: boolean } {
  const [deferredItems, setDeferredItems] = useState<T[]>(items);
  const [isReady, setIsReady] = useState(true);

  useEffect(() => {
    setIsReady(false);
    
    // Defer rendering ke next frame
    const id = requestAnimationFrame(() => {
      setDeferredItems(items);
      setIsReady(true);
    });

    return () => cancelAnimationFrame(id);
  }, [items]);

  return { items: deferredItems, isReady };
}
