export const corePackage = {
  name: '@livoria/core',
  status: 'foundation',
} as const;

export type CorePackageStatus = typeof corePackage.status;

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

export type ApiError = {
  code: string;
  message: string;
  detail?: string;
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type PaginatedResult<T> = {
  data: T[];
  pagination: Pagination;
};

export type ObatItem = {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  dosage: string;
  usage_info: string;
  frequency: string;
  side_effects?: string | null;
  notes?: string | null;
  created_at?: string;
};

export type ObatInput = Pick<
  ObatItem,
  'name' | 'type' | 'dosage' | 'usage_info' | 'frequency' | 'side_effects' | 'notes'
>;

export type WaifuItem = {
  id: string;
  user_id?: string;
  name: string;
  source: string;
  source_type: SourceType;
  tier: WaifuTier;
  image_url: string;
  notes: string;
  created_at?: string;
};

export type WaifuInput = Pick<
  WaifuItem,
  'name' | 'source' | 'source_type' | 'tier' | 'image_url' | 'notes'
>;

export type WaifuSourceTitle = {
  title: string;
  type: SourceType;
};

export type MediaItem = {
  id: string;
  user_id?: string;
  title: string;
  status: MediaStatus;
  genre: string;
  rating: number | null;
  episodes: number | null;
  episodes_watched: number | null;
  cover_url: string;
  studio: string;
  release_year: number | null;
  is_favorite: boolean;
  is_bookmarked: boolean;
  watch_status?: WatchStatus | null;
  created_at?: string;
};

export type MediaInput = Pick<
  MediaItem,
  | 'title'
  | 'status'
  | 'genre'
  | 'rating'
  | 'episodes'
  | 'episodes_watched'
  | 'cover_url'
  | 'studio'
  | 'release_year'
  | 'watch_status'
>;

export type TagihanPreviewItem = {
  id: string;
  user_id?: string;
  debitur_nama: string;
  barang_nama: string;
  status: TagihanStatus;
  total_hutang: number;
  total_dibayar: number;
  sisa_hutang: number;
  cicilan_per_bulan: number;
  tanggal_jatuh_tempo?: string;
  created_at?: string;
};

export type DashboardSummary = {
  tagihanCount: number;
  tagihanAktifCount: number;
  tagihanLunasCount: number;
  tagihanOverdueStatusCount: number;
  tagihanDitundaCount: number;
  tagihanTotalModalTerpisah: number;
  tagihanTotalModalBergulir: number;
  tagihanTotalDibayar: number;
  tagihanTotalKeuntungan: number;
  tagihanMonthlyIncome: number;
  animeCount: number;
  animeOngoingCount: number;
  donghuaCount: number;
  donghuaOngoingCount: number;
  waifuCount: number;
  waifuTierSCount: number;
  obatCount: number;
  source?: 'rpc' | 'fallback' | 'preview';
};

export function formatCurrencyIDR(value: number) {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactIDR(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (safeValue >= 1_000_000_000) return `${(safeValue / 1_000_000_000).toFixed(1)}M`;
  if (safeValue >= 1_000_000) return `${(safeValue / 1_000_000).toFixed(1)}jt`;
  if (safeValue >= 1_000) return `${(safeValue / 1_000).toFixed(0)}rb`;
  return String(Math.round(safeValue));
}

export function formatDateID(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('id-ID', options || {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function sanitizeStorageSegment(value: string, fallback: string) {
  const sanitized = value.trim().replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 96);
  return sanitized || fallback;
}

export function getStorageExtension(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || 'bin';
}

export function buildUserStoragePath(input: {
  userId: string;
  folder: string;
  fileName: string;
  nestedFolder?: string;
  timestamp: number;
  suffix: string;
}) {
  const safeFolder = sanitizeStorageSegment(input.folder, 'files');
  const safeNested = input.nestedFolder ? `${sanitizeStorageSegment(input.nestedFolder, 'item')}/` : '';
  return `${input.userId}/${safeFolder}/${safeNested}${input.timestamp}-${input.suffix}.${getStorageExtension(input.fileName)}`;
}

export function normalizeObatItem(input: Partial<ObatItem>): ObatItem {
  return {
    id: String(input.id ?? ''),
    user_id: input.user_id ? String(input.user_id) : undefined,
    name: String(input.name ?? ''),
    type: String(input.type ?? 'Lainnya'),
    dosage: String(input.dosage ?? ''),
    usage_info: String(input.usage_info ?? ''),
    frequency: String(input.frequency ?? ''),
    side_effects: input.side_effects == null ? null : String(input.side_effects),
    notes: input.notes == null ? null : String(input.notes),
    created_at: input.created_at ? String(input.created_at) : undefined,
  };
}

export function normalizeObatInput(input: Partial<ObatInput>): ObatInput {
  return {
    name: String(input.name ?? '').trim(),
    type: String(input.type ?? 'Lainnya').trim() || 'Lainnya',
    dosage: String(input.dosage ?? '').trim(),
    usage_info: String(input.usage_info ?? '').trim(),
    frequency: String(input.frequency ?? '').trim(),
    side_effects: input.side_effects == null ? null : String(input.side_effects).trim(),
    notes: input.notes == null ? null : String(input.notes).trim(),
  };
}

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

export function normalizeSourceType(value: unknown): SourceType {
  const sourceType = toStringValue(value) as SourceType;
  return SOURCE_TYPES.includes(sourceType) ? sourceType : 'anime';
}

export function normalizeWaifuTier(value: unknown): WaifuTier {
  const tier = toStringValue(value) as WaifuTier;
  return WAIFU_TIERS.includes(tier) ? tier : 'B';
}

export function normalizeWaifuItem(input: Partial<WaifuItem>): WaifuItem {
  return {
    created_at: input.created_at ? String(input.created_at) : undefined,
    id: String(input.id ?? ''),
    image_url: String(input.image_url ?? ''),
    name: String(input.name ?? ''),
    notes: String(input.notes ?? ''),
    source: String(input.source ?? ''),
    source_type: normalizeSourceType(input.source_type),
    tier: normalizeWaifuTier(input.tier),
    user_id: input.user_id ? String(input.user_id) : undefined,
  };
}

export function normalizeWaifuInput(input: Partial<Record<keyof WaifuInput, unknown>>): WaifuInput {
  return {
    image_url: String(input.image_url ?? '').trim(),
    name: String(input.name ?? '').trim(),
    notes: String(input.notes ?? '').trim(),
    source: String(input.source ?? '').trim(),
    source_type: normalizeSourceType(input.source_type),
    tier: normalizeWaifuTier(input.tier),
  };
}

export function normalizeMediaStatus(value: unknown): MediaStatus {
  const status = toStringValue(value) as MediaStatus;
  return MEDIA_STATUSES.includes(status) ? status : 'planned';
}

export function normalizeWatchStatus(value: unknown): WatchStatus | null {
  if (value == null || value === '') return null;
  const status = toStringValue(value) as WatchStatus;
  return WATCH_STATUSES.includes(status) ? status : null;
}

export function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

export function normalizeMediaItem(input: Partial<MediaItem>): MediaItem {
  return {
    cover_url: String(input.cover_url ?? ''),
    created_at: input.created_at ? String(input.created_at) : undefined,
    episodes: toNullableNumber(input.episodes),
    episodes_watched: toNullableNumber(input.episodes_watched),
    genre: String(input.genre ?? ''),
    id: String(input.id ?? ''),
    is_bookmarked: Boolean(input.is_bookmarked),
    is_favorite: Boolean(input.is_favorite),
    rating: toNullableNumber(input.rating),
    release_year: toNullableNumber(input.release_year),
    status: normalizeMediaStatus(input.status),
    studio: String(input.studio ?? ''),
    title: String(input.title ?? ''),
    user_id: input.user_id ? String(input.user_id) : undefined,
    watch_status: normalizeWatchStatus(input.watch_status),
  };
}

export function normalizeMediaInput(input: Partial<Record<keyof MediaInput, unknown>>): MediaInput {
  const episodes = Number(toNullableNumber(input.episodes) ?? 0);
  const watched = Number(toNullableNumber(input.episodes_watched) ?? 0);

  return {
    cover_url: String(input.cover_url ?? '').trim(),
    episodes,
    episodes_watched: Math.max(0, episodes > 0 ? Math.min(watched, episodes) : watched),
    genre: String(input.genre ?? '').trim(),
    rating: Math.max(0, Math.min(10, Number(toNullableNumber(input.rating) ?? 0))),
    release_year: toNullableNumber(input.release_year),
    status: normalizeMediaStatus(input.status),
    studio: String(input.studio ?? '').trim(),
    title: String(input.title ?? '').trim(),
    watch_status: normalizeWatchStatus(input.watch_status) ?? 'none',
  };
}

export function normalizeTagihanStatus(value: unknown): TagihanStatus {
  const status = toStringValue(value) as TagihanStatus;
  return TAGIHAN_STATUSES.includes(status) ? status : 'aktif';
}

export function normalizeTagihanPreviewItem(input: Partial<TagihanPreviewItem>): TagihanPreviewItem {
  return {
    barang_nama: String(input.barang_nama ?? ''),
    cicilan_per_bulan: Number(toNullableNumber(input.cicilan_per_bulan) ?? 0),
    created_at: input.created_at ? String(input.created_at) : undefined,
    debitur_nama: String(input.debitur_nama ?? ''),
    id: String(input.id ?? ''),
    sisa_hutang: Number(toNullableNumber(input.sisa_hutang) ?? 0),
    status: normalizeTagihanStatus(input.status),
    tanggal_jatuh_tempo: input.tanggal_jatuh_tempo ? String(input.tanggal_jatuh_tempo) : undefined,
    total_dibayar: Number(toNullableNumber(input.total_dibayar) ?? 0),
    total_hutang: Number(toNullableNumber(input.total_hutang) ?? 0),
    user_id: input.user_id ? String(input.user_id) : undefined,
  };
}

export type PaymentTotals = {
  totalDibayar: number;
  sisaHutang: number;
  status: TagihanStatus;
  isLunas: boolean;
};

export type QuickPayValidationResult = {
  valid: boolean;
  amount: number;
  message?: string;
};

export function calculatePaymentTotals(
  tagihan: Pick<TagihanPreviewItem, 'status' | 'total_dibayar' | 'total_hutang'>,
  jumlah: number,
): PaymentTotals {
  const amount = Number(jumlah);
  const totalDibayar = Number(tagihan.total_dibayar) + amount;
  const rawSisaHutang = Number(tagihan.total_hutang) - totalDibayar;
  const isLunas = rawSisaHutang <= 0;

  return {
    isLunas,
    sisaHutang: Math.max(0, rawSisaHutang),
    status: isLunas ? 'lunas' : tagihan.status,
    totalDibayar,
  };
}

export function validateQuickPay(
  tagihan: Pick<TagihanPreviewItem, 'status'> | null | undefined,
  jumlah: number,
): QuickPayValidationResult {
  const amount = Number(jumlah);

  if (!tagihan) {
    return { amount, message: 'Tagihan tidak tersedia.', valid: false };
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return { amount, message: 'Jumlah pembayaran harus lebih dari 0.', valid: false };
  }

  if (tagihan.status === 'lunas') {
    return { amount, message: 'Tagihan sudah lunas.', valid: false };
  }

  return { amount, valid: true };
}

export function createEmptyDashboardSummary(source: DashboardSummary['source'] = 'preview'): DashboardSummary {
  return {
    animeCount: 0,
    animeOngoingCount: 0,
    donghuaCount: 0,
    donghuaOngoingCount: 0,
    obatCount: 0,
    source,
    tagihanAktifCount: 0,
    tagihanCount: 0,
    tagihanDitundaCount: 0,
    tagihanLunasCount: 0,
    tagihanMonthlyIncome: 0,
    tagihanOverdueStatusCount: 0,
    tagihanTotalDibayar: 0,
    tagihanTotalKeuntungan: 0,
    tagihanTotalModalBergulir: 0,
    tagihanTotalModalTerpisah: 0,
    waifuCount: 0,
    waifuTierSCount: 0,
  };
}
