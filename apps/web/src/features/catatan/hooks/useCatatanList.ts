import { useQuery } from '@tanstack/react-query';

import { CATATAN_QUERY_KEY, supabaseCatatanRepository } from '../services/catatan.repository';

export function useCatatanList() {
  return useQuery({
    queryKey: CATATAN_QUERY_KEY,
    queryFn: () => supabaseCatatanRepository.list(),
    throwOnError: true,
  });
}
