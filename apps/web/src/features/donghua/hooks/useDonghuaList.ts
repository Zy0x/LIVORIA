import { useQuery, useQueryClient } from '@tanstack/react-query';
import { donghuaRepository } from '../services/donghua.repository';
import { QUERY_KEYS } from '@/app/query-keys';
import type { DonghuaItem } from '@/lib/types';
import { getCachedVisibleItems, mergeVisibleItems } from '@/features/media/domain/visible-item-cache';

export const DONGHUA_QUERY_KEY = QUERY_KEYS.DONGHUA;
export const DONGHUA_VISIBLE_QUERY_KEY = [...DONGHUA_QUERY_KEY, 'visible'] as const;

export function useDonghuaList() {
  return useQuery({
    queryKey: DONGHUA_QUERY_KEY,
    queryFn: () => donghuaRepository.listMeta(),
    staleTime: 2 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    throwOnError: true,
  });
}

function toVisibleKey(items: DonghuaItem[]): string {
  return items.map((item) => item.id).join('|');
}

export function useDonghuaVisibleItems(items: DonghuaItem[], enabled = true) {
  const queryClient = useQueryClient();
  const ids = items.map((item) => item.id);

  return useQuery({
    queryKey: [...DONGHUA_VISIBLE_QUERY_KEY, toVisibleKey(items)],
    queryFn: async () => {
      const cachedById = getCachedVisibleItems<DonghuaItem>(queryClient, DONGHUA_VISIBLE_QUERY_KEY);
      const missingIds = ids.filter((id) => !cachedById.has(id));
      const fetchedItems = missingIds.length > 0 ? await donghuaRepository.listByIds(missingIds) : [];
      return mergeVisibleItems(ids, cachedById, fetchedItems);
    },
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    throwOnError: true,
  });
}
