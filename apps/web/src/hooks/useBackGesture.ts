/**
 * useBackGesture v4 — Menggunakan backGestureSystem terpusat.
 *
 * PERUBAHAN DARI v3:
 * - Tidak lagi punya stack/listener sendiri
 * - Semua delegasi ke backGestureSystem.ts
 * - Dialog component (ui/dialog.tsx) juga pakai sistem yang sama → tidak ada konflik
 *
 * KAPAN PAKAI HOOK INI:
 * - Komponen NON-Dialog yang butuh back gesture (custom panel, dll)
 * - Komponen yang menggunakan <Dialog open={...}> TIDAK perlu hook ini
 *   karena Dialog sudah otomatis terdaftar ke sistem yang sama
 */

import { useEffect, useRef } from 'react';
import {
  registerEntry,
  handleManualClose,
  clearStack,
} from '@/lib/backGestureSystem';

// Re-export clearStack dengan nama lama agar Layout.tsx tidak perlu diubah
export { clearStack as clearBackGestureStack };

/**
 * Hook untuk komponen custom NON-Dialog yang butuh back gesture.
 *
 * @param isOpen  - State buka/tutup modal/panel
 * @param onClose - Callback untuk menutup (set state ke false)
 * @param key     - Identifier unik untuk debugging
 */
export function useBackGesture(isOpen: boolean, onClose: () => void, key: string) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // uid saat ini terdaftar di stack; null = tidak terdaftar
  const uidRef = useRef<number | null>(null);

  // Flag: apakah penutupan ini dipicu oleh back gesture (popstate)?
  const closedByGestureRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      // Guard: jangan daftar dua kali (React StrictMode / re-render)
      if (uidRef.current !== null) return;

      closedByGestureRef.current = false;

      const { uid } = registerEntry(key, () => {
        // Dipanggil dari handlePopstate saat back gesture
        closedByGestureRef.current = true;
        uidRef.current = null;
        onCloseRef.current();
      });

      uidRef.current = uid;

    } else {
      if (uidRef.current === null) return;

      const uid = uidRef.current;
      const wasByGesture = closedByGestureRef.current;

      uidRef.current = null;
      closedByGestureRef.current = false;

      if (wasByGesture) {
        // Ditutup via back gesture → history sudah mundur, tidak perlu apa-apa
        return;
      }

      // Ditutup via tombol/programmatic → sync history
      handleManualClose(uid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Cleanup saat komponen unmount saat masih open
  useEffect(() => {
    return () => {
      const uid = uidRef.current;
      if (uid === null) return;
      handleManualClose(uid);
      uidRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}