import { useQuery } from '@tanstack/react-query';
import { animeRepository } from '../services/anime.repository';
import { QUERY_KEYS } from '@/app/query-keys';
import type { AnimeItem } from '@/lib/types';

export const ANIME_QUERY_KEY = QUERY_KEYS.ANIME;
export const ANIME_VISIBLE_QUERY_KEY = [...ANIME_QUERY_KEY, 'visible'] as const;

export function useAnimeList() {
  return useQuery({
    queryKey: ANIME_QUERY_KEY,
    queryFn: () => animeRepository.listMeta(),
    staleTime: 2 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    throwOnError: true,
  });
}

function toVisibleKey(items: AnimeItem[]): string {
  return items.map((item) => item.id).join('|');
}

export function useAnimeVisibleItems(items: AnimeItem[], enabled = true) {
  const ids = items.map((item) => item.id);

  return useQuery({
    queryKey: [...ANIME_VISIBLE_QUERY_KEY, toVisibleKey(items)],
    queryFn: () => animeRepository.listByIds(ids),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    throwOnError: true,
  });
}
