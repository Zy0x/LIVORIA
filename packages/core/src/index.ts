export const corePackage = {
  name: '@livoria/core',
  status: 'foundation',
} as const;

export type CorePackageStatus = typeof corePackage.status;

export const TAGIHAN_STATUSES = ['aktif', 'lunas', 'overdue', 'ditunda'] as const;
export const MEDIA_STATUSES = ['on-going', 'completed', 'planned'] as const;
export const WATCH_STATUSES = ['none', 'want_to_watch', 'watching', 'watched'] as const;

export type TagihanStatus = typeof TAGIHAN_STATUSES[number];
export type MediaStatus = typeof MEDIA_STATUSES[number];
export type WatchStatus = typeof WATCH_STATUSES[number];

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
