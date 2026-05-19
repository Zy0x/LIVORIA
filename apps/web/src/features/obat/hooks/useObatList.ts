import { useQuery } from '@tanstack/react-query';
import { supabaseObatRepository } from '../services/obat.repository';

export const OBAT_QUERY_KEY = ['obat'] as const;

export function useObatList() {
  return useQuery({
    queryKey: OBAT_QUERY_KEY,
    queryFn: () => supabaseObatRepository.list(),
    throwOnError: true,
  });
}
