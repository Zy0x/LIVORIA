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

export type DashboardSummary = {
  tagihanCount: number;
  animeCount: number;
  donghuaCount: number;
  waifuCount: number;
  obatCount: number;
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
