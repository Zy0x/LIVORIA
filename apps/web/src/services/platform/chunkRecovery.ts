const CHUNK_RELOAD_KEY = 'livoria_chunk_reload_attempted';
let handlersInstalled = false;

export function isChunkLoadError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason || '');
  const name = reason instanceof Error ? reason.name : '';
  return /chunk|chunkloaderror|loading chunk|dynamically imported|module script|failed to fetch|import\(\)|turbopack|_next\/static/i.test(
    `${name} ${message}`,
  );
}

export async function recoverFromStaleChunk() {
  const lastAttempt = Number(window.sessionStorage?.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - lastAttempt < 60_000) return;

  window.sessionStorage?.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
  } finally {
    window.location.reload();
  }
}

export function installChunkRecoveryHandlers() {
  if (handlersInstalled || typeof window === 'undefined') return;
  handlersInstalled = true;

  window.addEventListener(
    'error',
    (event) => {
      const target = event.target as HTMLElement | null;
      const source = 'src' in (target || {}) ? String((target as HTMLScriptElement).src || '') : '';
      if (source.includes('/_next/static/') || isChunkLoadError(event.error || event.message)) {
        event.preventDefault();
        recoverFromStaleChunk();
      }
    },
    true,
  );

  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    recoverFromStaleChunk();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      event.preventDefault();
      recoverFromStaleChunk();
    }
  });
}
