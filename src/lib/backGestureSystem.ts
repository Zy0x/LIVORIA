/**
 * backGestureSystem.ts — Single source of truth untuk back gesture.
 *
 * MASALAH SEBELUMNYA:
 * - useBackGesture.ts punya _stack + _blockCount + popstate listener sendiri
 * - dialog.tsx (acuan) punya dialogStack + popstate listener sendiri
 * - Keduanya bekerja paralel → dua pushState per modal, dua listener rebutan
 *
 * SOLUSI:
 * - Satu modul ini yang pegang stack, blockCount, dan listener
 * - Dialog component (ui/dialog.tsx) pakai modul ini
 * - useBackGesture hook pakai modul ini
 * - Hanya ADA SATU popstate listener di seluruh aplikasi
 *
 * CARA PAKAI:
 * - Komponen dengan <Dialog open={...}> → tidak perlu useBackGesture
 * - Komponen non-Dialog custom (bottom sheet, dll) → pakai useBackGesture
 */

interface StackEntry {
  uid: number;
  key: string;
  close: () => void;
}

// ── Module-level singletons ───────────────────────────────────────────────────
export const stack: StackEntry[] = [];
let uidCounter = 0;

/**
 * blockCount: jumlah go(-1) programmatic yang sedang "in flight".
 * Setiap kali kita panggil go(-1) sendiri (bukan dari user), increment.
 * Setiap kali popstate masuk, jika blockCount > 0 → decrement & skip.
 * Ini mencegah go(-1) kita sendiri menutup modal lain.
 */
let blockCount = 0;
let listenerAdded = false;

function handlePopstate() {
  if (blockCount > 0) {
    blockCount--;
    return;
  }
  // Back gesture dari user → tutup modal paling atas
  if (stack.length > 0) {
    const top = stack[stack.length - 1];
    top.close();
  }
}

export function ensureListener() {
  if (listenerAdded) return;
  listenerAdded = true;
  window.addEventListener('popstate', handlePopstate);
}

/**
 * Dipanggil dari Layout.tsx saat route/pathname berubah.
 * Bersihkan semua entry — modal dari halaman sebelumnya tidak relevan lagi.
 */
export function clearStack() {
  stack.length = 0;
  blockCount = 0;
}

/**
 * Daftarkan entry ke stack dan push history state.
 * Kembalikan fungsi unregister untuk dipanggil saat modal tutup.
 */
export function registerEntry(key: string, onClose: () => void): { uid: number; unregister: () => void } {
  ensureListener();

  const uid = ++uidCounter;
  window.history.pushState({ _bg: true, _uid: uid, _key: key }, '');

  const entry: StackEntry = {
    uid,
    key,
    close: () => {
      // Dipanggil dari handlePopstate (back gesture)
      removeFromStack(uid);
      onClose();
    },
  };

  stack.push(entry);

  return {
    uid,
    unregister: () => removeFromStack(uid),
  };
}

/**
 * Hapus entry dari stack berdasarkan uid.
 */
export function removeFromStack(uid: number) {
  const idx = stack.findIndex(e => e.uid === uid);
  if (idx !== -1) stack.splice(idx, 1);
}

/**
 * Panggil saat modal ditutup via tombol (bukan back gesture).
 * Mundurkan history yang tadi di-push, tapi cegah popstate menutup modal lain.
 */
export function handleManualClose(uid: number) {
  removeFromStack(uid);

  if (window.history.state?._uid === uid) {
    if (stack.length === 0) {
      // Tidak ada modal lain → mundur normal, tapi blok popstate-nya
      blockCount++;
      window.history.go(-1);
    } else {
      // Masih ada modal lain → jangan go(-1), ganti state ke modal parent
      // agar tombol back berikutnya menutup modal parent dengan benar
      const parent = stack[stack.length - 1];
      window.history.replaceState({ _bg: true, _uid: parent.uid, _key: parent.key }, '');
    }
  }
}