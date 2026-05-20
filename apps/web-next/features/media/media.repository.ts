import {
  normalizeMediaItem,
  parseAlternativeTitles,
  resolveMediaDisplayTitle,
  type MediaItem,
  type MediaStatus,
  type WatchStatus,
} from '@livoria/core';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type MediaTable = 'anime' | 'donghua';
export type MediaSortMode = 'terbaru' | 'judul' | 'rating' | 'tahun' | 'progress';
export type MediaTab = 'semua' | 'watchlist';
export type MediaTitleLanguage = 'default' | 'alternative';

export type MediaQuery = {
  bookmark: boolean;
  favorite: boolean;
  genre: string;
  page: number;
  pageSize: number;
  search: string;
  sort: MediaSortMode;
  status: MediaStatus | 'all';
  tab: MediaTab;
  titleLang: MediaTitleLanguage;
  watch: WatchStatus | 'all';
};

export type MediaStats = {
  bookmarkedCount: number;
  favoriteCount: number;
  totalCount: number;
  watchlistCount: number;
  watchedCount: number;
};

export type MediaPreviewState =
  | {
      items: MediaItem[];
      message: string;
      status: 'unconfigured';
      table: MediaTable;
    }
  | {
      items: MediaItem[];
      message: string;
      status: 'unauthenticated';
      table: MediaTable;
    }
  | {
      exportItems: MediaItem[];
      genreOptions: string[];
      items: MediaItem[];
      message: string;
      page: number;
      pageSize: number;
      query: MediaQuery;
      stats: MediaStats;
      status: 'ready';
      table: MediaTable;
      total: number;
      totalFiltered: number;
      totalPages: number;
      watchlistPreview: MediaItem[];
    }
  | {
      items: MediaItem[];
      message: string;
      status: 'error';
      table: MediaTable;
    };

const DEFAULT_QUERY: MediaQuery = {
  bookmark: false,
  favorite: false,
  genre: 'all',
  page: 1,
  pageSize: 12,
  search: '',
  sort: 'terbaru',
  status: 'all',
  tab: 'semua',
  titleLang: 'default',
  watch: 'all',
};

const mediaSelect = [
  'id',
  'user_id',
  'title',
  'alternative_titles',
  'status',
  'genre',
  'rating',
  'episodes',
  'episodes_watched',
  'cover_url',
  'synopsis',
  'notes',
  'season',
  'cour',
  'streaming_url',
  'schedule',
  'parent_title',
  'studio',
  'release_year',
  'is_favorite',
  'is_bookmarked',
  'is_movie',
  'duration_minutes',
  'is_hentai',
  'watch_status',
  'watched_at',
  'created_at',
  'updated_at',
].join(',');

export function normalizeMediaQuery(input: Partial<MediaQuery> = {}): MediaQuery {
  const status = input.status === 'on-going' || input.status === 'completed' || input.status === 'planned'
    ? input.status
    : 'all';
  const watch = input.watch === 'none' || input.watch === 'want_to_watch' || input.watch === 'watching' || input.watch === 'watched'
    ? input.watch
    : 'all';
  const sort = input.sort === 'judul' || input.sort === 'rating' || input.sort === 'tahun' || input.sort === 'progress'
    ? input.sort
    : 'terbaru';
  const tab = input.tab === 'watchlist' ? 'watchlist' : 'semua';
  const titleLang = input.titleLang === 'alternative' ? 'alternative' : 'default';
  const page = Number.isFinite(Number(input.page)) ? Math.max(1, Math.floor(Number(input.page))) : DEFAULT_QUERY.page;
  const pageSize = Number.isFinite(Number(input.pageSize))
    ? Math.min(48, Math.max(6, Math.floor(Number(input.pageSize))))
    : DEFAULT_QUERY.pageSize;

  return {
    bookmark: Boolean(input.bookmark),
    favorite: Boolean(input.favorite),
    genre: typeof input.genre === 'string' && input.genre.trim() ? input.genre.trim() : 'all',
    page,
    pageSize,
    search: typeof input.search === 'string' ? input.search.trim() : '',
    sort,
    status,
    tab,
    titleLang,
    watch,
  };
}

function includesSearch(item: MediaItem, rawSearch: string) {
  const search = rawSearch.toLowerCase();
  if (!search) return true;

  const haystack = [
    item.title,
    item.genre,
    item.studio,
    item.synopsis,
    item.notes,
    item.season,
    item.cour,
    item.parent_title,
    ...parseAlternativeTitles(item.alternative_titles),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(search);
}

function applyMediaQuery(items: MediaItem[], query: MediaQuery) {
  const filtered = items.filter((item) => {
    const matchesSearch = includesSearch(item, query.search);
    const matchesStatus = query.status === 'all' || item.status === query.status;
    const matchesWatch = query.watch === 'all' || (item.watch_status ?? 'none') === query.watch;
    const matchesGenre = query.genre === 'all' || item.genre.split(',').map((genre) => genre.trim()).includes(query.genre);
    const matchesFavorite = !query.favorite || item.is_favorite;
    const matchesBookmark = !query.bookmark || item.is_bookmarked;
    const matchesTab = query.tab === 'semua' || (item.watch_status && item.watch_status !== 'none');

    return matchesSearch && matchesStatus && matchesWatch && matchesGenre && matchesFavorite && matchesBookmark && matchesTab;
  });

  filtered.sort((a, b) => {
    if (query.sort === 'judul') {
      return resolveMediaDisplayTitle(a, query.titleLang).localeCompare(resolveMediaDisplayTitle(b, query.titleLang));
    }
    if (query.sort === 'rating') {
      return Number(b.rating ?? 0) - Number(a.rating ?? 0);
    }
    if (query.sort === 'tahun') {
      return Number(b.release_year ?? 0) - Number(a.release_year ?? 0);
    }
    if (query.sort === 'progress') {
      return Number(b.episodes_watched ?? 0) - Number(a.episodes_watched ?? 0);
    }
    return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
  });

  return filtered;
}

function getStats(items: MediaItem[]): MediaStats {
  return {
    bookmarkedCount: items.filter((item) => item.is_bookmarked).length,
    favoriteCount: items.filter((item) => item.is_favorite).length,
    totalCount: items.length,
    watchedCount: items.filter((item) => item.watch_status === 'watched').length,
    watchlistCount: items.filter((item) => item.watch_status && item.watch_status !== 'none').length,
  };
}

function getGenreOptions(items: MediaItem[]) {
  return Array.from(new Set(
    items.flatMap((item) => item.genre.split(',').map((genre) => genre.trim()).filter(Boolean)),
  )).sort((a, b) => a.localeCompare(b));
}

export async function getMediaPreview(
  table: MediaTable,
  inputQuery: Partial<MediaQuery> = {},
): Promise<MediaPreviewState> {
  const query = normalizeMediaQuery(inputQuery);
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      items: [],
      message: 'Konfigurasi data publik belum tersedia.',
      status: 'unconfigured',
      table,
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
        message: `Masuk terlebih dahulu untuk melihat data ${getMediaLabel(table)}.`,
        status: 'unauthenticated',
        table,
      };
    }

    const { data, error } = await supabase
      .from(table)
      .select(mediaSelect)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (error) throw error;

    const allItems = ((data ?? []) as unknown as Record<string, unknown>[]).map((item) => normalizeMediaItem(item));
    const exportItems = applyMediaQuery(allItems, query);
    const totalPages = Math.max(1, Math.ceil(exportItems.length / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    const items = exportItems.slice(start, start + query.pageSize);

    return {
      exportItems,
      genreOptions: getGenreOptions(allItems),
      items,
      message: `${exportItems.length} dari ${allItems.length} data ${getMediaLabel(table)} siap ditampilkan.`,
      page,
      pageSize: query.pageSize,
      query: { ...query, page },
      stats: getStats(allItems),
      status: 'ready',
      table,
      total: allItems.length,
      totalFiltered: exportItems.length,
      totalPages,
      watchlistPreview: allItems.filter((item) => item.watch_status && item.watch_status !== 'none').slice(0, 6),
    };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : `${getMediaLabel(table)} gagal dimuat.`,
      status: 'error',
      table,
    };
  }
}

export function getMediaLabel(table: MediaTable) {
  return table === 'donghua' ? 'Donghua' : 'Anime';
}
