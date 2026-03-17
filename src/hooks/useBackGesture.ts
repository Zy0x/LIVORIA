/**
 * useBackGesture v3 — Robust multi-layer modal back-gesture
 *
 * ═══════════════════════════════════════════════════════════════
 * MASALAH YANG DIPERBAIKI DARI v1/v2:
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. RACE CONDITION _blockNextPopstate (boolean flag):
 *    history.go(-1) adalah ASYNC — browser dispatch popstate pada
 *    microtask/macrotask berikutnya. Dengan boolean flag, ada jendela
 *    waktu di mana flag ter-reset SEBELUM popstate tiba, sehingga
 *    modal lain ikut tertutup.
 *
 *    ✅ FIX: Gunakan _blockCount (integer counter).
 *       - Setiap history.go(-1) yang kita panggil → _blockCount++
 *       - Setiap popstate masuk → jika _blockCount > 0, consume satu slot
 *         (_blockCount--) dan return. Ini memastikan setiap programmatic
 *         go(-1) di-pair 1:1 dengan satu ignored popstate.
 *
 * 2. MODAL DALAM MODAL (nested modals):
 *    Stack = [A, B]. User tutup B via tombol → history.go(-1) → popstate
 *    masuk → _blockCount tidak ter-set dengan benar → A ikut tertutup.
 *
 *    ✅ FIX: _blockCount++ dilakukan SYNCHRONOUS sebelum history.go(-1),
 *       sehingga handler sudah tahu ini programmatic sebelum event tiba.
 *
 * 3. UNIQUE ID PER MODAL INSTANCE:
 *    Key (string) bisa sama jika komponen di-remount. Dengan v1, splice
 *    by key bisa hapus entry yang salah jika ada 2 modal dengan key sama.
 *
 *    ✅ FIX: Setiap registrasi dapat uid (auto-increment integer) yang
 *       benar-benar unik. Stack operations pakai uid, bukan key.
 *
 * 4. REACT STRICTMODE DOUBLE-INVOKE:
 *    StrictMode mount→unmount→mount dalam development. useEffect dengan
 *    deps [isOpen] akan fire 2x saat mount, bisa push 2 history entries.
 *
 *    ✅ FIX: Guard `if (uidRef.current !== null) return` di branch isOpen=true
 *       memastikan hanya satu pushState per modal instance.
 *
 * 5. UNMOUNT SAAT MASIH OPEN:
 *    Jika komponen unmount (route change, conditional render) saat modal
 *    masih open, kita harus cleanup stack + history entry.
 *
 *    ✅ FIX: Dedicated cleanup effect yang cek uidRef.current saat unmount.
 *
 * ═══════════════════════════════════════════════════════════════
 * ALUR KERJA:
 * ═══════════════════════════════════════════════════════════════
 *
 * OPEN:
 *   uid = ++counter
 *   stack.push({ uid, close: () => { splice(uid); gesture=true; onClose() } })
 *   history.pushState({ _bg: true, _uid: uid })
 *
 * CLOSE via back gesture (popstate):
 *   if blockCount > 0 → blockCount--; return (programmatic, ignore)
 *   else → stack.top.close() → splice + gesture=true + onClose()
 *          → useEffect fires isOpen=false → wasByGesture=true → NO go(-1)
 *
 * CLOSE via tombol:
 *   useEffect fires isOpen=false → wasByGesture=false
 *   → splice from stack + blockCount++ + history.go(-1)
 *   → popstate fires → blockCount-- → return (consumed, no modal closed)
 */

import { useEffect, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface StackEntry {
  uid: number;
  key: string;
  close: () => void;
}

// ─── Module-level singletons ──────────────────────────────────────────────────

const _stack: StackEntry[] = [];
let _uidCounter = 0;

/**
 * Counter untuk programmatic history.go(-1) yang sedang pending.
 * Setiap go(-1) increment, setiap popstate yang di-consume decrement.
 * Lebih robust dari boolean flag karena handle multiple concurrent calls.
 */
let _blockCount = 0;

let _listenerAdded = false;

// ─── Core popstate handler ────────────────────────────────────────────────────

function _handlePopstate() {
  if (_blockCount > 0) {
    // Ini popstate dari programmatic go(-1) yang kita trigger sendiri.
    // Consume satu slot dan abaikan — jangan tutup modal apapun.
    _blockCount--;
    return;
  }

  if (_stack.length > 0) {
    // Back gesture dari user → tutup modal paling atas saja.
    const top = _stack[_stack.length - 1];
    top.close();
    // Browser sudah mundur 1 history step (dari pushState yang kita buat).
    // close() akan trigger onClose() → isOpen=false → useEffect fires.
    // Di sana wasByGesture=true → tidak ada go(-1) tambahan. ✓
  }
  // Stack kosong: biarkan browser navigate normal ke halaman sebelumnya.
}

function _ensureListener() {
  if (_listenerAdded) return;
  _listenerAdded = true;
  window.addEventListener('popstate', _handlePopstate);
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/**
 * Bersihkan seluruh stack dan reset blockCount.
 * Dipanggil dari Layout setiap kali pathname berubah (route navigation).
 *
 * PENTING: Tidak perlu go(-1) di sini karena route navigation sudah
 * membersihkan history stack browser. Kita hanya perlu sync internal state.
 */
export function clearBackGestureStack() {
  _stack.length = 0;
  _blockCount = 0;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @param isOpen  - State buka/tutup modal
 * @param onClose - Callback untuk menutup modal (set state ke false)
 * @param key     - Identifier untuk debugging (tidak harus unik)
 */
export function useBackGesture(isOpen: boolean, onClose: () => void, key: string) {
  // Selalu gunakan ref terbaru untuk onClose agar tidak stale closure
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  /**
   * UID unik untuk instance modal ini di stack.
   * null = tidak sedang terdaftar di stack.
   */
  const uidRef = useRef<number | null>(null);

  /**
   * Flag: apakah penutupan modal ini dipicu oleh back gesture (popstate)?
   * - true  → close() dari _handlePopstate → tidak perlu go(-1) lagi
   * - false → close via tombol/programmatic → perlu go(-1) untuk sync history
   */
  const closedByGestureRef = useRef(false);

  // Setup global event listener (sekali saja)
  useEffect(() => {
    _ensureListener();
  }, []);

  // ── Main effect: reaksi terhadap perubahan isOpen ──────────────────────────
  useEffect(() => {
    if (isOpen) {
      // ── Modal DIBUKA ───────────────────────────────────────────────────────

      // Guard duplikat: jika sudah terdaftar, skip.
      // Ini melindungi dari React StrictMode double-invoke dan
      // re-render yang tidak mengubah isOpen.
      if (uidRef.current !== null) return;

      const uid = ++_uidCounter;
      uidRef.current = uid;
      closedByGestureRef.current = false;

      // Capture uid dalam closure untuk close callback yang stabil
      const closeThisModal = () => {
        // 1. Hapus dari stack
        const idx = _stack.findIndex(e => e.uid === uid);
        if (idx !== -1) _stack.splice(idx, 1);

        // 2. Tandai sebagai ditutup via gesture
        closedByGestureRef.current = true;
        uidRef.current = null;

        // 3. Panggil onClose (mengubah isOpen → false di parent)
        //    useEffect akan fire lagi, tapi branch isOpen=false akan
        //    mendeteksi wasByGesture=true dan tidak memanggil go(-1)
        onCloseRef.current();
      };

      _stack.push({ uid, key, close: closeThisModal });

      // Push satu history entry untuk "menampung" back gesture ini
      window.history.pushState({ _bg: true, _uid: uid, _key: key }, '');

    } else {
      // ── Modal DITUTUP ──────────────────────────────────────────────────────

      // Jika tidak pernah terdaftar (karena guard duplikat), tidak ada yang dilakukan
      if (uidRef.current === null) return;

      const uid = uidRef.current;
      const wasByGesture = closedByGestureRef.current;

      // Reset state refs
      uidRef.current = null;
      closedByGestureRef.current = false;

      if (wasByGesture) {
        // ── Ditutup via back gesture ─────────────────────────────────────────
        // close() dari _handlePopstate sudah:
        //   - hapus dari stack
        //   - set closedByGestureRef = true
        //   - panggil onClose()
        // Browser sudah mundur 1 step (history dari pushState sudah dipakai).
        // Tidak perlu tindakan apapun di sini.
        return;
      }

      // ── Ditutup via tombol / programmatic ────────────────────────────────
      // History masih punya entry yang kita push saat open.
      // Kita perlu mundur 1 step untuk menghapusnya.

      // Pastikan entry dihapus dari stack (seharusnya belum terhapus karena
      // close() tidak dipanggil — user klik tombol langsung)
      const idx = _stack.findIndex(e => e.uid === uid);
      if (idx !== -1) _stack.splice(idx, 1);

      // KRUSIAL: increment SEBELUM go(-1) agar saat popstate tiba,
      // _handlePopstate langsung tahu ini programmatic dan tidak tutup modal lain.
      _blockCount++;
      window.history.go(-1);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Cleanup effect: handle unmount saat modal masih open ───────────────────
  useEffect(() => {
    return () => {
      const uid = uidRef.current;

      // Jika tidak sedang terdaftar (isOpen=false atau belum pernah open), skip
      if (uid === null) return;

      // Modal masih "open" tapi komponen unmount (e.g. route change dengan
      // conditional rendering yang menghapus komponen ini dari tree)
      const idx = _stack.findIndex(e => e.uid === uid);
      if (idx !== -1) _stack.splice(idx, 1);

      // Cleanup history entry
      _blockCount++;
      window.history.go(-1);

      uidRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}