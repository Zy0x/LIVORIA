import { useQuery } from '@tanstack/react-query';
import { donghuaRepository } from '../services/donghua.repository';

export const DONGHUA_QUERY_KEY = ['donghua'] as const;

export function useDonghuaList() {
  return useQuery({
    queryKey: DONGHUA_QUERY_KEY,
    queryFn: () => donghuaRepository.list(),
    throwOnError: true,
  });
}

