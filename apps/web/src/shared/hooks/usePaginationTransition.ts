import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

function getNow() {
  if (typeof performance !== 'undefined') return performance.now();
  return Date.now();
}

export function usePaginationTransition(renderKey: string, blocked: boolean, minVisibleMs = 90) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const startPaginationTransition = useCallback(() => {
    if (typeof window === 'undefined') return;
    startedAtRef.current = getNow();
    clearTimer();
    flushSync(() => setIsTransitioning(true));
  }, [clearTimer]);

  useEffect(() => {
    if (!isTransitioning || blocked || typeof window === 'undefined') return undefined;

    const elapsed = getNow() - startedAtRef.current;
    const delay = Math.max(0, minVisibleMs - elapsed);
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      setIsTransitioning(false);
    }, delay);

    return clearTimer;
  }, [blocked, clearTimer, isTransitioning, minVisibleMs, renderKey]);

  useEffect(() => clearTimer, [clearTimer]);

  return { isPaginationTransitioning: isTransitioning, startPaginationTransition };
}
