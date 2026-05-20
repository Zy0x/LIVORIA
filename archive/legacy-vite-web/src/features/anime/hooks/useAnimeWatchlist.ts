import { useMemo, useState } from 'react';
import type { AnimeItem, WatchStatus } from '@/lib/types';
import { getAnimeWatchStatus } from '../domain/watch-status';

export function useAnimeWatchlist(animeList: AnimeItem[]) {
  const [watchlistFilter, setWatchlistFilter] = useState<'all' | WatchStatus>('all');

  const watchlistItems = useMemo(
    () => animeList.filter((item) => getAnimeWatchStatus(item) !== 'none'),
    [animeList]
  );

  const watchlistFiltered = useMemo(() => {
    if (watchlistFilter === 'all') return watchlistItems;
    return watchlistItems.filter((item) => getAnimeWatchStatus(item) === watchlistFilter);
  }, [watchlistItems, watchlistFilter]);

  const stats = useMemo(() => {
    const ratedItems = animeList.filter((item) => item.rating > 0);
    return {
      total: animeList.length,
      ongoing: animeList.filter((item) => item.status === 'on-going').length,
      completed: animeList.filter((item) => item.status === 'completed').length,
      planned: animeList.filter((item) => item.status === 'planned').length,
      favorites: animeList.filter((item) => item.is_favorite).length,
      movies: animeList.filter((item) => item.is_movie).length,
      wantToWatch: animeList.filter((item) => getAnimeWatchStatus(item) === 'want_to_watch').length,
      watching: animeList.filter((item) => getAnimeWatchStatus(item) === 'watching').length,
      watched: animeList.filter((item) => getAnimeWatchStatus(item) === 'watched').length,
      avgRating: ratedItems.length > 0
        ? (ratedItems.reduce((sum, item) => sum + item.rating, 0) / ratedItems.length).toFixed(1)
        : '—',
    };
  }, [animeList]);

  return {
    watchlistFilter,
    setWatchlistFilter,
    watchlistItems,
    watchlistFiltered,
    stats,
  };
}

