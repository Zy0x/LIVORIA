import { useQuery } from '@tanstack/react-query';
import { supabaseWaifuRepository } from '../services/waifu.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export const WAIFU_QUERY_KEY = QUERY_KEYS.WAIFU;
export const WAIFU_SOURCE_TITLES_QUERY_KEY = QUERY_KEYS.WAIFU_SOURCE_TITLES;

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
