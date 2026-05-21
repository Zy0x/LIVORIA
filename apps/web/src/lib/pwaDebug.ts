const PWA_DEBUG_ENABLED = process.env.NODE_ENV !== 'production';

export function pwaLog(...args: unknown[]) {
  if (PWA_DEBUG_ENABLED) {
    console.log(...args);
  }
}

export function pwaWarn(...args: unknown[]) {
  if (PWA_DEBUG_ENABLED) {
    console.warn(...args);
  }
}
