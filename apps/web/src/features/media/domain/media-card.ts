import type { AnimeExtraData } from '@/components/shared/AnimeExtraFields';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';

export function extractMediaAltTitles(item: unknown) {
  const raw = (item as any).alternative_titles;
  return deserializeAlternativeTitles(raw);
}

export function extractMediaExtra(item: unknown): AnimeExtraData {
  return {
    release_year: (item as any).release_year ?? null,
    studio: (item as any).studio ?? '',
    mal_url: (item as any).mal_url ?? '',
    anilist_url: (item as any).anilist_url ?? '',
    mal_id: (item as any).mal_id ?? null,
    anilist_id: (item as any).anilist_id ?? null,
    episodes: (item as any).episodes ?? null,
    synopsis_id: (item as any).synopsis ?? '',
    alternative_titles: (item as any).alternative_titles ?? null,
  };
}

