const CHUNK_RELOAD_KEY = 'livoria_chunk_reload_attempted';

export function isChunkLoadError(reason: unknown) {
  const message = reason instanceof Error ? reason.message : String(reason || '');
  return /chunk|dynamically imported|module script|failed to fetch/i.test(message);
}

export async function recoverFromStaleChunk() {
  const lastAttempt = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
  if (Date.now() - lastAttempt < 60_000) return;

  sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
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
