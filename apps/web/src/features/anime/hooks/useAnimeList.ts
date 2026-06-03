import { useQuery, useQueryClient } from '@tanstack/react-query';
import { animeRepository } from '../services/anime.repository';
import { QUERY_KEYS } from '@/app/query-keys';
import type { AnimeItem } from '@/lib/types';
import { getCachedVisibleItems, mergeVisibleItems } from '@/features/media/domain/visible-item-cache';

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
  const queryClient = useQueryClient();
  const ids = items.map((item) => item.id);

  return useQuery({
    queryKey: [...ANIME_VISIBLE_QUERY_KEY, toVisibleKey(items)],
    queryFn: async () => {
      const cachedById = getCachedVisibleItems<AnimeItem>(queryClient, ANIME_VISIBLE_QUERY_KEY);
      const missingIds = ids.filter((id) => !cachedById.has(id));
      const fetchedItems = missingIds.length > 0 ? await animeRepository.listByIds(missingIds) : [];
      return mergeVisibleItems(ids, cachedById, fetchedItems);
    },
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    throwOnError: true,
  });
}
