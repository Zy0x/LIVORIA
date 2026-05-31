import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/app/query-keys';
import { listCatatanRelatedOptions } from '../services/catatan-related.repository';

export function useCatatanRelatedOptions() {
  return useQuery({
    queryKey: QUERY_KEYS.CATATAN_RELATED_OPTIONS,
    queryFn: listCatatanRelatedOptions,
    staleTime: 60_000,
    retry: 1,
  });
}
