import type { AnimeItem, WatchStatus } from '@/lib/types';

export function getAnimeWatchStatus(item: Pick<AnimeItem, 'watch_status'>): WatchStatus {
  return item.watch_status || 'none';
}

export function buildWatchStatusPayload(newStatus: WatchStatus): Pick<AnimeItem, 'watch_status' | 'watched_at'> {
  return {
    watch_status: newStatus,
    watched_at: newStatus === 'watched' ? new Date().toISOString() : null,
  };
}

