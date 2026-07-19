import type { DonghuaItem, MediaStatus, WatchStatus } from '@/lib/types';
import type { Tables } from '@/integrations/supabase/types';

type DonghuaRow = Partial<Tables<'donghua'>>;

function toNumber(value: unknown, fallback = 0): number {
  const normalized = Number(value ?? fallback);
  return Number.isFinite(normalized) ? normalized : fallback;
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function toString(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}

function toWatchStatus(value: unknown): WatchStatus {
  if (value === 'want_to_watch' || value === 'watching' || value === 'watched') return value;
  return 'none';
}

function toMediaStatus(value: unknown): MediaStatus {
  if (value === 'on-going' || value === 'completed' || value === 'planned') return value;
  return 'planned';
}

export function mapDonghuaFromDb(row: DonghuaRow): DonghuaItem {
  return {
    id: toString(row.id),
    user_id: toString(row.user_id),
    title: toString(row.title),
    status: toMediaStatus(row.status),
    genre: toString(row.genre),
    rating: toNumber(row.rating),
    episodes: toNumber(row.episodes),
    episodes_watched: toNumber(row.episodes_watched),
    cover_url: toString(row.cover_url),
    synopsis: toString(row.synopsis),
    notes: toString(row.notes),
    season: toNumber(row.season, 1),
    cour: toString(row.cour),
    streaming_url: toString(row.streaming_url),
    main_url: toString(row.main_url),
    schedule: toString(row.schedule),
    parent_title: toString(row.parent_title),
    is_favorite: Boolean(row.is_favorite),
    is_bookmarked: Boolean(row.is_bookmarked),
    is_movie: Boolean(row.is_movie),
    duration_minutes: toNullableNumber(row.duration_minutes),
    is_hentai: Boolean(row.is_hentai),
    release_year: toNullableNumber(row.release_year),
    studio: row.studio ?? null,
    mal_url: row.mal_url ?? null,
    anilist_url: row.anilist_url ?? null,
    mal_id: toNullableNumber(row.mal_id),
    anilist_id: toNullableNumber(row.anilist_id),
    alternative_titles: row.alternative_titles ?? null,
    watch_status: toWatchStatus(row.watch_status),
    watched_at: row.watched_at ?? null,
    created_at: toString(row.created_at),
  };
}

export function mapDonghuaListFromDb(rows: DonghuaRow[] | null): DonghuaItem[] {
  return (rows ?? []).map(mapDonghuaFromDb);
}

export function mapDonghuaToDb(row: Partial<DonghuaItem>): Partial<DonghuaItem> {
  return row;
}
