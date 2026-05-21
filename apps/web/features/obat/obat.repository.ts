import { normalizeObatItem, type ObatItem } from '@livoria/core';
import { OBAT_SELECT_COLUMNS } from '@/services/query-columns';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type ObatPreviewState =
  | {
      items: ObatItem[];
      message: string;
      status: 'unconfigured';
    }
  | {
      items: ObatItem[];
      message: string;
      status: 'unauthenticated';
    }
  | {
      items: ObatItem[];
      message: string;
      page: number;
      pageSize: number;
      query: ObatQuery;
      status: 'ready';
      stats: ObatStats;
      total: number;
      totalFiltered: number;
      totalPages: number;
      typeOptions: string[];
    }
  | {
      items: ObatItem[];
      message: string;
      status: 'error';
    };

export type ObatSortMode = 'terbaru' | 'nama_az' | 'tipe';
export type ObatFrequencyFilter = 'all' | 'rutin' | 'lainnya';

export type ObatQuery = {
  frequency: ObatFrequencyFilter;
  page: number;
  pageSize: number;
  search: string;
  sort: ObatSortMode;
  type: string;
};

export type ObatStats = {
  rutinCount: number;
  sideEffectCount: number;
  totalCount: number;
  typeCount: number;
};

const DEFAULT_QUERY: ObatQuery = {
  frequency: 'all',
  page: 1,
  pageSize: 12,
  search: '',
  sort: 'terbaru',
  type: 'all',
};

export function normalizeObatQuery(input: Partial<ObatQuery> = {}): ObatQuery {
  const page = Number.isFinite(Number(input.page)) ? Math.max(1, Math.floor(Number(input.page))) : DEFAULT_QUERY.page;
  const pageSize = Number.isFinite(Number(input.pageSize))
    ? Math.min(48, Math.max(6, Math.floor(Number(input.pageSize))))
    : DEFAULT_QUERY.pageSize;
  const sort = input.sort === 'nama_az' || input.sort === 'tipe' ? input.sort : DEFAULT_QUERY.sort;
  const frequency = input.frequency === 'rutin' || input.frequency === 'lainnya' ? input.frequency : DEFAULT_QUERY.frequency;

  return {
    frequency,
    page,
    pageSize,
    search: typeof input.search === 'string' ? input.search.trim() : DEFAULT_QUERY.search,
    sort,
    type: typeof input.type === 'string' && input.type.trim() ? input.type.trim() : DEFAULT_QUERY.type,
  };
}

function applyObatQuery(items: ObatItem[], query: ObatQuery) {
  const search = query.search.toLowerCase();
  const filtered = items.filter((item) => {
    const matchesSearch = !search ||
      item.name.toLowerCase().includes(search) ||
      item.type.toLowerCase().includes(search) ||
      item.usage_info.toLowerCase().includes(search);
    const matchesType = query.type === 'all' || item.type === query.type;
    const frequency = item.frequency.toLowerCase();
    const matchesFrequency = query.frequency === 'all' ||
      (query.frequency === 'rutin' && frequency.includes('sehari')) ||
      (query.frequency === 'lainnya' && !frequency.includes('sehari'));

    return matchesSearch && matchesType && matchesFrequency;
  });

  if (query.sort === 'nama_az') {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  } else if (query.sort === 'tipe') {
    filtered.sort((a, b) => a.type.localeCompare(b.type));
  } else {
    filtered.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  }

  return filtered;
}

function getStats(items: ObatItem[]): ObatStats {
  return {
    rutinCount: items.filter((item) => item.frequency.toLowerCase().includes('sehari')).length,
    sideEffectCount: items.filter((item) => Boolean(item.side_effects)).length,
    totalCount: items.length,
    typeCount: new Set(items.map((item) => item.type)).size,
  };
}

export async function getObatPreview(inputQuery: Partial<ObatQuery> = {}): Promise<ObatPreviewState> {
  const query = normalizeObatQuery(inputQuery);
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      items: [],
      message: 'Konfigurasi data publik belum tersedia.',
      status: 'unconfigured',
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      return {
        items: [],
        message: 'Masuk terlebih dahulu untuk melihat data Obat.',
        status: 'unauthenticated',
      };
    }

    const { data, error } = await supabase
      .from('obat')
      .select(OBAT_SELECT_COLUMNS)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const allItems = (data ?? []).map((item) => normalizeObatItem(item));
    const filtered = applyObatQuery(allItems, query);
    const totalPages = Math.max(1, Math.ceil(filtered.length / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    const items = filtered.slice(start, start + query.pageSize);

    return {
      items,
      message: `${filtered.length} dari ${allItems.length} data obat siap dikelola.`,
      page,
      pageSize: query.pageSize,
      query: { ...query, page },
      status: 'ready',
      stats: getStats(allItems),
      total: allItems.length,
      totalFiltered: filtered.length,
      totalPages,
      typeOptions: Array.from(new Set(allItems.map((item) => item.type))).sort((a, b) => a.localeCompare(b)),
    };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : 'Obat gagal dimuat.',
      status: 'error',
    };
  }
}
