import { useQuery } from '@tanstack/react-query';

import { tagihanRepository } from '../services/tagihan.repository';

export function useTagihanList() {
  return useQuery({
    queryKey: ['tagihan'],
    queryFn: tagihanRepository.getAll,
    throwOnError: true,
  });
}

