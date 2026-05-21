import { useQuery } from '@tanstack/react-query';
import { animeRepository } from '../services/anime.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export const ANIME_QUERY_KEY = QUERY_KEYS.ANIME;

export function useAnimeList() {
  return useQuery({
    queryKey: ANIME_QUERY_KEY,
    queryFn: () => animeRepository.list(),
    throwOnError: true,
  });
}
