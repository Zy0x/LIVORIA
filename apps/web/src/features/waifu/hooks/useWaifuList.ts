import { useQuery } from '@tanstack/react-query';
import { supabaseWaifuRepository } from '../services/waifu.repository';

export const WAIFU_QUERY_KEY = ['waifu'] as const;
export const WAIFU_SOURCE_TITLES_QUERY_KEY = ['waifu', 'source-titles'] as const;

export function useWaifuList() {
  return useQuery({
    queryKey: WAIFU_QUERY_KEY,
    queryFn: () => supabaseWaifuRepository.list(),
    throwOnError: true,
  });
}

export function useWaifuSourceTitles() {
  return useQuery({
    queryKey: WAIFU_SOURCE_TITLES_QUERY_KEY,
    queryFn: () => supabaseWaifuRepository.listSourceTitles(),
    throwOnError: true,
  });
}
