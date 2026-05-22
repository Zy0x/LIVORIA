import { MEDIA_STATUSES, WATCH_STATUSES, type MediaStatus, type WatchStatus } from '../contracts/status';
import { toNullableNumber, toStringValue } from '../utils/normalization';

export type MediaItem = {
  id: string;
  user_id?: string;
  title: string;
  alternative_titles?: string | null;
  status: MediaStatus;
  genre: string;
  rating: number | null;
  episodes: number | null;
  episodes_watched: number | null;
  cover_url: string;
  synopsis?: string | null;
  notes?: string | null;
  season?: string | null;
  cour?: string | null;
  streaming_url?: string | null;
  schedule?: string | null;
  parent_title?: string | null;
  studio: string;
  release_year: number | null;
  is_favorite: boolean;
  is_bookmarked: boolean;
  is_movie?: boolean;
  duration_minutes?: number | null;
  is_hentai?: boolean;
  watch_status?: WatchStatus | null;
  watched_at?: string | null;
  created_at?: string;
  updated_at?: string;
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
  | 'synopsis'
  | 'notes'
  | 'season'
  | 'cour'
  | 'streaming_url'
  | 'schedule'
  | 'parent_title'
  | 'studio'
  | 'release_year'
  | 'is_movie'
  | 'duration_minutes'
  | 'is_hentai'
  | 'alternative_titles'
  | 'watch_status'
>;

export function normalizeMediaStatus(value: unknown): MediaStatus {
  const status = toStringValue(value) as MediaStatus;
  return MEDIA_STATUSES.includes(status) ? status : 'planned';
}

export function normalizeWatchStatus(value: unknown): WatchStatus | null {
  if (value == null || value === '') return null;
  const status = toStringValue(value) as WatchStatus;
  return WATCH_STATUSES.includes(status) ? status : null;
}

export function normalizeMediaItem(input: Partial<MediaItem>): MediaItem {
  return {
    alternative_titles: input.alternative_titles == null ? null : String(input.alternative_titles),
    cover_url: String(input.cover_url ?? ''),
    created_at: input.created_at ? String(input.created_at) : undefined,
    cour: input.cour == null ? null : String(input.cour),
    duration_minutes: toNullableNumber(input.duration_minutes),
    episodes: toNullableNumber(input.episodes),
    episodes_watched: toNullableNumber(input.episodes_watched),
    genre: String(input.genre ?? ''),
    id: String(input.id ?? ''),
    is_bookmarked: Boolean(input.is_bookmarked),
    is_favorite: Boolean(input.is_favorite),
    is_hentai: Boolean(input.is_hentai),
    is_movie: Boolean(input.is_movie),
    notes: input.notes == null ? null : String(input.notes),
    parent_title: input.parent_title == null ? null : String(input.parent_title),
    rating: toNullableNumber(input.rating),
    release_year: toNullableNumber(input.release_year),
    schedule: input.schedule == null ? null : String(input.schedule),
    season: input.season == null ? null : String(input.season),
    streaming_url: input.streaming_url == null ? null : String(input.streaming_url),
    synopsis: input.synopsis == null ? null : String(input.synopsis),
    status: normalizeMediaStatus(input.status),
    studio: String(input.studio ?? ''),
    title: String(input.title ?? ''),
    updated_at: input.updated_at ? String(input.updated_at) : undefined,
    user_id: input.user_id ? String(input.user_id) : undefined,
    watch_status: normalizeWatchStatus(input.watch_status),
    watched_at: input.watched_at == null ? null : String(input.watched_at),
  };
}

export function normalizeMediaInput(input: Partial<Record<keyof MediaInput, unknown>>): MediaInput {
  const episodes = Number(toNullableNumber(input.episodes) ?? 0);
  const watched = Number(toNullableNumber(input.episodes_watched) ?? 0);

  return {
    alternative_titles: String(input.alternative_titles ?? '').trim(),
    cover_url: String(input.cover_url ?? '').trim(),
    cour: String(input.cour ?? '').trim(),
    duration_minutes: toNullableNumber(input.duration_minutes),
    episodes,
    episodes_watched: Math.max(0, episodes > 0 ? Math.min(watched, episodes) : watched),
    genre: String(input.genre ?? '').trim(),
    is_hentai: input.is_hentai === true || input.is_hentai === 'true' || input.is_hentai === 'on',
    is_movie: input.is_movie === true || input.is_movie === 'true' || input.is_movie === 'on',
    notes: String(input.notes ?? '').trim(),
    parent_title: String(input.parent_title ?? '').trim(),
    rating: Math.max(0, Math.min(10, Number(toNullableNumber(input.rating) ?? 0))),
    release_year: toNullableNumber(input.release_year),
    schedule: String(input.schedule ?? '').trim(),
    season: String(input.season ?? '').trim(),
    streaming_url: String(input.streaming_url ?? '').trim(),
    synopsis: String(input.synopsis ?? '').trim(),
    status: normalizeMediaStatus(input.status),
    studio: String(input.studio ?? '').trim(),
    title: String(input.title ?? '').trim(),
    watch_status: normalizeWatchStatus(input.watch_status) ?? 'none',
  };
}

export function parseAlternativeTitles(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  }

  const text = String(value ?? '').trim();
  if (!text) return [];

  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
    }
  } catch {
    // Keep CSV/plain-text alternative titles compatible with older exports.
  }

  return text
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function resolveMediaDisplayTitle(item: Pick<MediaItem, 'alternative_titles' | 'title'>, language: string) {
  if (language === 'original') return item.title;
  const alternatives = parseAlternativeTitles(item.alternative_titles);
  if (language === 'alternative' || language === 'romaji' || language === 'english') {
    return alternatives[0] || item.title;
  }
  return item.title;
}
