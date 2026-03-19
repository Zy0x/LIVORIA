/**
 * useWatchedAutoRemove.ts
 *
 * Auto-reset watch_status dari 'watched' ke 'none' setelah 1 jam.
 * Berjalan via polling setiap 30 detik.
 * Konflik-safe: perubahan status sebelum 1 jam akan update watched_at
 * atau menghapusnya, sehingga timer tidak akan salah reset.
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const AUTO_REMOVE_MS = 60 * 60 * 1000; // 1 jam
const POLL_INTERVAL_MS = 30 * 1000;    // cek tiap 30 detik

async function checkAndAutoRemove(queryClient: ReturnType<typeof useQueryClient>) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - AUTO_REMOVE_MS).toISOString();

  // Cek anime yang sudah watched > 1 jam
  const { data: animeToReset, error: animeErr } = await supabase
    .from('anime')
    .select('id, title')
    .eq('watch_status', 'watched')
    .not('watched_at', 'is', null)
    .lt('watched_at', cutoff);

  if (!animeErr && animeToReset && animeToReset.length > 0) {
    const ids = animeToReset.map(a => a.id);

    await supabase
      .from('anime')
      .update({
        watch_status: 'none',
        watched_at: null,
      })
      .in('id', ids);

    queryClient.invalidateQueries({ queryKey: ['anime'] });
    console.log(`[AutoRemove] Reset ${ids.length} anime dari watchlist`);
  }

  // Sama untuk donghua jika diperlukan
  const { data: donghuaToReset, error: donghuaErr } = await supabase
    .from('donghua')
    .select('id, title')
    .eq('watch_status', 'watched')
    .not('watched_at', 'is', null)
    .lt('watched_at', cutoff);

  if (!donghuaErr && donghuaToReset && donghuaToReset.length > 0) {
    const ids = donghuaToReset.map(d => d.id);

    await supabase
      .from('donghua')
      .update({
        watch_status: 'none',
        watched_at: null,
      })
      .in('id', ids);

    queryClient.invalidateQueries({ queryKey: ['donghua'] });
    console.log(`[AutoRemove] Reset ${ids.length} donghua dari watchlist`);
  }
}

export function useWatchedAutoRemove() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Jalankan sekali saat mount (handle kasus user buka app setelah > 1 jam)
    checkAndAutoRemove(queryClient);

    // Polling setiap 30 detik
    intervalRef.current = setInterval(() => {
      checkAndAutoRemove(queryClient);
    }, POLL_INTERVAL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [queryClient]);
}