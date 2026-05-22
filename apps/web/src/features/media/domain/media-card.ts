import type { AnimeExtraData } from '@/components/shared/AnimeExtraFields';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';

function asMediaRecord(item: unknown): Record<string, unknown> {
  return item && typeof item === 'object' ? item as Record<string, unknown> : {};
}

export function extractMediaAltTitles(item: unknown) {
  const raw = asMediaRecord(item).alternative_titles;
  return deserializeAlternativeTitles(typeof raw === 'string' ? raw : null);
}

export function extractMediaExtra(item: unknown): AnimeExtraData {
  const record = asMediaRecord(item);
  return {
    release_year: typeof record.release_year === 'number' ? record.release_year : null,
    studio: typeof record.studio === 'string' ? record.studio : '',
    mal_url: typeof record.mal_url === 'string' ? record.mal_url : '',
    anilist_url: typeof record.anilist_url === 'string' ? record.anilist_url : '',
    mal_id: typeof record.mal_id === 'number' ? record.mal_id : null,
    anilist_id: typeof record.anilist_id === 'number' ? record.anilist_id : null,
    episodes: typeof record.episodes === 'number' ? record.episodes : null,
    synopsis_id: typeof record.synopsis === 'string' ? record.synopsis : '',
    alternative_titles: typeof record.alternative_titles === 'string' ? record.alternative_titles : null,
  };
}
