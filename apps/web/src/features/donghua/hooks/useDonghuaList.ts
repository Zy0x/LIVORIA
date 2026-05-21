import { useQuery } from '@tanstack/react-query';
import { donghuaRepository } from '../services/donghua.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export const DONGHUA_QUERY_KEY = QUERY_KEYS.DONGHUA;

export function useDonghuaList() {
  return useQuery({
    queryKey: DONGHUA_QUERY_KEY,
    queryFn: () => donghuaRepository.list(),
    throwOnError: true,
  });
}
