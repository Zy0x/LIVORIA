import type { DonghuaItem, WatchStatus } from '@/lib/types';

export function getDonghuaWatchStatus(item: Pick<DonghuaItem, 'watch_status'>): WatchStatus {
  return item.watch_status || 'none';
}

export function buildWatchStatusPayload(newStatus: WatchStatus): Pick<DonghuaItem, 'watch_status' | 'watched_at'> {
  return {
    watch_status: newStatus,
    watched_at: newStatus === 'watched' ? new Date().toISOString() : null,
  };
}

