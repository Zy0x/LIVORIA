import { useQuery } from '@tanstack/react-query';
import { animeRepository } from '../services/anime.repository';

export const ANIME_QUERY_KEY = ['anime'] as const;

export function useAnimeList() {
  return useQuery({
    queryKey: ANIME_QUERY_KEY,
    queryFn: () => animeRepository.list(),
    throwOnError: true,
  });
}

