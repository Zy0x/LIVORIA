import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGSAPReducedMotion } from "@/hooks/useReducedMotion";

const CHUNK_RELOAD_KEY = 'livoria_chunk_reload_attempted';
const isChunkLoadError = (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason || '');
  return /chunk|dynamically imported|module script|failed to fetch/i.test(message);
};

async function recoverFromStaleChunk() {
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

initGSAPReducedMotion();

createRoot(document.getElementById("root")!).render(<App />);

// ✅ Service Worker registration moved to index.html for earlier initialization
// This ensures SW is registered before React bundle loads, preventing race conditions
