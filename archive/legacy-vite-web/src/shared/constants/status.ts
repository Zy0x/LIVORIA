export const TAGIHAN_STATUSES = ['aktif', 'lunas', 'overdue', 'ditunda'] as const;
export const MEDIA_STATUSES = ['on-going', 'completed', 'planned'] as const;
export const WATCH_STATUSES = ['none', 'want_to_watch', 'watching', 'watched'] as const;

export type TagihanStatus = typeof TAGIHAN_STATUSES[number];
export type MediaStatus = typeof MEDIA_STATUSES[number];
export type WatchStatus = typeof WATCH_STATUSES[number];
