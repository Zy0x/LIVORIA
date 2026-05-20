import { useMemo, useState } from 'react';
import type { DonghuaItem, WatchStatus } from '@/lib/types';
import { getDonghuaWatchStatus } from '../domain/watch-status';

export function useDonghuaWatchlist(donghuaList: DonghuaItem[]) {
  const [watchlistFilter, setWatchlistFilter] = useState<'all' | WatchStatus>('all');

  const watchlistItems = useMemo(
    () => donghuaList.filter((item) => getDonghuaWatchStatus(item) !== 'none'),
    [donghuaList]
  );

  const watchlistFiltered = useMemo(() => {
    if (watchlistFilter === 'all') return watchlistItems;
    return watchlistItems.filter((item) => getDonghuaWatchStatus(item) === watchlistFilter);
  }, [watchlistItems, watchlistFilter]);

  const stats = useMemo(() => {
    const ratedItems = donghuaList.filter((item) => item.rating > 0);
    return {
      total: donghuaList.length,
      ongoing: donghuaList.filter((item) => item.status === 'on-going').length,
      completed: donghuaList.filter((item) => item.status === 'completed').length,
      planned: donghuaList.filter((item) => item.status === 'planned').length,
      favorites: donghuaList.filter((item) => item.is_favorite).length,
      movies: donghuaList.filter((item) => item.is_movie).length,
      wantToWatch: donghuaList.filter((item) => getDonghuaWatchStatus(item) === 'want_to_watch').length,
      watching: donghuaList.filter((item) => getDonghuaWatchStatus(item) === 'watching').length,
      watched: donghuaList.filter((item) => getDonghuaWatchStatus(item) === 'watched').length,
      avgRating: ratedItems.length > 0
        ? (ratedItems.reduce((sum, item) => sum + item.rating, 0) / ratedItems.length).toFixed(1)
        : '—',
    };
  }, [donghuaList]);

  return {
    watchlistFilter,
    setWatchlistFilter,
    watchlistItems,
    watchlistFiltered,
    stats,
  };
}

