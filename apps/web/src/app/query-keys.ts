export const QUERY_KEYS = {
  TAGIHAN: ["tagihan"],
  ANIME: ["anime"],
  DONGHUA: ["donghua"],
  WAIFU: ["waifu"],
  WAIFU_SOURCE_TITLES: ["waifu", "source-titles"],
  OBAT: ["obat"],
  USER_PREFERENCES: ["user-preferences"],
  THEME_PREFERENCE: ["theme-preference"],
  DASHBOARD_SUMMARY: ["dashboard-summary"],
  TAGIHAN_HISTORY: (tagihanId: string) => ["history", tagihanId] as const,
  TAGIHAN_STRUK: (tagihanId: string) => ["struk", tagihanId] as const,
} as const;
