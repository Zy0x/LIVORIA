export const TAGIHAN_STATUSES = ['aktif', 'lunas', 'overdue', 'ditunda'] as const;
export const MEDIA_STATUSES = ['on-going', 'completed', 'planned'] as const;
export const WATCH_STATUSES = ['none', 'want_to_watch', 'watching', 'watched'] as const;
export const WAIFU_TIERS = ['S', 'A', 'B', 'C'] as const;
export const SOURCE_TYPES = ['anime', 'donghua'] as const;

export type TagihanStatus = typeof TAGIHAN_STATUSES[number];
export type MediaStatus = typeof MEDIA_STATUSES[number];
export type WatchStatus = typeof WATCH_STATUSES[number];
export type WaifuTier = typeof WAIFU_TIERS[number];
export type SourceType = typeof SOURCE_TYPES[number];
