import { useQuery } from '@tanstack/react-query';
import { supabaseObatRepository } from '../services/obat.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export const OBAT_QUERY_KEY = QUERY_KEYS.OBAT;

export function useObatList() {
  return useQuery({
    queryKey: OBAT_QUERY_KEY,
    queryFn: () => supabaseObatRepository.list(),
    throwOnError: true,
  });
}
