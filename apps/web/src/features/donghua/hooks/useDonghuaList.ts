import { useQuery } from '@tanstack/react-query';
import { donghuaRepository } from '../services/donghua.repository';
import { QUERY_KEYS } from '@/app/query-keys';
import type { DonghuaItem } from '@/lib/types';

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
  const ids = items.map((item) => item.id);

  return useQuery({
    queryKey: [...DONGHUA_VISIBLE_QUERY_KEY, toVisibleKey(items)],
    queryFn: () => donghuaRepository.listByIds(ids),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 10 * 60 * 1000,
    gcTime: 45 * 60 * 1000,
    throwOnError: true,
  });
}
