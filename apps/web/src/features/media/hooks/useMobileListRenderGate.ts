import { useEffect, useState } from 'react';
import { isMobile } from '@/lib/motion';

export function useMobileListRenderGate(renderKey: string, blocked: boolean, delayMs = 32) {
  const [readyKey, setReadyKey] = useState(() => (!isMobile() && !blocked ? renderKey : ''));

  useEffect(() => {
    if (blocked) {
      setReadyKey('');
      return;
    }

    if (!isMobile()) {
      setReadyKey(renderKey);
      return;
    }

    let frameOne = 0;
    let frameTwo = 0;
    let timer = 0;

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        timer = window.setTimeout(() => setReadyKey(renderKey), delayMs);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      window.clearTimeout(timer);
    };
  }, [blocked, delayMs, renderKey]);

  return readyKey === renderKey;
}
