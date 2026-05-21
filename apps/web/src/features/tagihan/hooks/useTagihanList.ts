import { useQuery } from '@tanstack/react-query';

import { tagihanRepository } from '../services/tagihan.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export function useTagihanList() {
  return useQuery({
    queryKey: QUERY_KEYS.TAGIHAN,
    queryFn: tagihanRepository.getAll,
    throwOnError: true,
  });
}
