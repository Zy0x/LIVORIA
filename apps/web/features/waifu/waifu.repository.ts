import {
  normalizeWaifuItem,
  type SourceType,
  type WaifuTier,
  type WaifuItem,
  type WaifuSourceTitle,
} from '@livoria/core';
import { WAIFU_SELECT_COLUMNS } from '@/services/query-columns';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type WaifuPreviewState =
  | {
      items: WaifuItem[];
      message: string;
      sourceTitles: WaifuSourceTitle[];
      status: 'unconfigured';
    }
  | {
      items: WaifuItem[];
      message: string;
      sourceTitles: WaifuSourceTitle[];
      status: 'unauthenticated';
    }
  | {
      items: WaifuItem[];
      message: string;
      query: WaifuQuery;
      sourceTitles: WaifuSourceTitle[];
      status: 'ready';
      total: number;
      totalFiltered: number;
    }
  | {
      items: WaifuItem[];
      message: string;
      sourceTitles: WaifuSourceTitle[];
      status: 'error';
    };

export type WaifuTierFilter = WaifuTier | 'all';

export type WaifuQuery = {
  search: string;
  sourceType: SourceType | 'all';
  tier: WaifuTierFilter;
};

const DEFAULT_QUERY: WaifuQuery = {
  search: '',
  sourceType: 'all',
  tier: 'all',
};

export function normalizeWaifuQuery(input: Partial<WaifuQuery> = {}): WaifuQuery {
  const tier = input.tier === 'S' || input.tier === 'A' || input.tier === 'B' || input.tier === 'C'
    ? input.tier
    : 'all';
  const sourceType = input.sourceType === 'anime' || input.sourceType === 'donghua'
    ? input.sourceType
    : 'all';

  return {
    search: typeof input.search === 'string' ? input.search.trim() : DEFAULT_QUERY.search,
    sourceType,
    tier,
  };
}

function mapSourceTitles(rows: Record<string, unknown>[] | null | undefined, type: SourceType) {
  return (rows ?? [])
    .map((row) => ({ title: typeof row.title === 'string' ? row.title : String(row.title ?? ''), type }))
    .filter((row) => row.title.length > 0);
}

function applyWaifuQuery(items: WaifuItem[], query: WaifuQuery) {
  const search = query.search.toLowerCase();
  return items.filter((item) => {
    const matchesSearch = !search ||
      item.name.toLowerCase().includes(search) ||
      item.source.toLowerCase().includes(search) ||
      (item.notes ?? '').toLowerCase().includes(search);
    const matchesTier = query.tier === 'all' || item.tier === query.tier;
    const matchesSourceType = query.sourceType === 'all' || item.source_type === query.sourceType;

    return matchesSearch && matchesTier && matchesSourceType;
  });
}

export async function getWaifuPreview(inputQuery: Partial<WaifuQuery> = {}): Promise<WaifuPreviewState> {
  const query = normalizeWaifuQuery(inputQuery);
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      items: [],
      message: 'Konfigurasi data publik belum tersedia.',
      sourceTitles: [],
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
        message: 'Masuk terlebih dahulu untuk melihat data Waifu.',
        sourceTitles: [],
        status: 'unauthenticated',
      };
    }

    const [waifuResult, animeResult, donghuaResult] = await Promise.all([
      supabase
        .from('waifu')
        .select(WAIFU_SELECT_COLUMNS)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000),
      supabase.from('anime').select('title').eq('user_id', user.id).order('title', { ascending: true }).limit(250),
      supabase.from('donghua').select('title').eq('user_id', user.id).order('title', { ascending: true }).limit(250),
    ]);

    if (waifuResult.error) throw waifuResult.error;
    if (animeResult.error) throw animeResult.error;
    if (donghuaResult.error) throw donghuaResult.error;

    const allItems = (waifuResult.data ?? []).map((item) => normalizeWaifuItem(item));
    const items = applyWaifuQuery(allItems, query);
    const sourceTitles = [
      ...mapSourceTitles(animeResult.data as Record<string, unknown>[] | null, 'anime'),
      ...mapSourceTitles(donghuaResult.data as Record<string, unknown>[] | null, 'donghua'),
    ].sort((a, b) => a.title.localeCompare(b.title));

    return {
      items,
      message: `${items.length} dari ${allItems.length} data waifu siap dikelola.`,
      query,
      sourceTitles,
      status: 'ready',
      total: allItems.length,
      totalFiltered: items.length,
    };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : 'Waifu gagal dimuat.',
      sourceTitles: [],
      status: 'error',
    };
  }
}
