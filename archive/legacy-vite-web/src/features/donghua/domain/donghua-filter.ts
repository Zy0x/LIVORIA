import type { DonghuaItem } from '@/lib/types';
import { filterItemsByQuery } from '@/lib/alternativeTitlesSearch';
import { getDonghuaWatchStatus } from './watch-status';
import { sortDonghuaItems } from './donghua-sort';
import type { DonghuaFilterState } from '../types/donghua.types';
import type { TitleLang } from '@/hooks/useTitleLanguage';

export function getUsedDonghuaGenres(items: DonghuaItem[]): string[] {
  const genres = new Set<string>();
  items.forEach((item) => {
    item.genre
      ?.split(',')
      .map((genre) => genre.trim())
      .filter(Boolean)
      .forEach((genre) => genres.add(genre));
  });
  return Array.from(genres).sort();
}

export function getDonghuaActiveFilterCount(state: Pick<
  DonghuaFilterState,
  | 'filter'
  | 'movieFilter'
  | 'watchStatusFilter'
  | 'showFavoriteOnly'
  | 'showBookmarkOnly'
  | 'showHentaiOnly'
  | 'genreFilter'
>): number {
  let count = 0;
  if (state.filter !== 'all') count++;
  if (state.movieFilter !== 'all') count++;
  if (state.watchStatusFilter !== 'all') count++;
  if (state.showFavoriteOnly) count++;
  if (state.showBookmarkOnly) count++;
  if (state.showHentaiOnly) count++;
  if (state.genreFilter !== 'all') count++;
  return count;
}

export function filterDonghuaDisplayItems({
  displayList,
  groupMap,
  state,
  titleLang,
}: {
  displayList: DonghuaItem[];
  groupMap: Record<string, DonghuaItem[]>;
  state: DonghuaFilterState;
  titleLang: TitleLang;
}): DonghuaItem[] {
  const searchFiltered = state.debouncedSearch.trim()
    ? filterItemsByQuery(displayList, state.debouncedSearch)
    : displayList;

  const filtered = searchFiltered.filter((item) => {
    const groupItems = groupMap[item.id] || [item];
    return groupItems.some((groupItem) => {
      const matchesStatus = state.filter === 'all' || groupItem.status === state.filter;
      const matchesGenre =
        state.genreFilter === 'all' ||
        (groupItem.genre || '').toLowerCase().includes(state.genreFilter.toLowerCase());
      const matchesMovie =
        state.movieFilter === 'all' ||
        (state.movieFilter === 'movie' ? groupItem.is_movie : !groupItem.is_movie);
      const matchesWatch =
        state.watchStatusFilter === 'all' ||
        getDonghuaWatchStatus(groupItem) === state.watchStatusFilter;
      const matchesFavorite = !state.showFavoriteOnly || !!groupItem.is_favorite;
      const matchesBookmark = !state.showBookmarkOnly || !!groupItem.is_bookmarked;
      const matchesHentai = !state.showHentaiOnly || !!groupItem.is_hentai;

      return (
        matchesStatus &&
        matchesGenre &&
        matchesMovie &&
        matchesWatch &&
        matchesFavorite &&
        matchesBookmark &&
        matchesHentai
      );
    });
  });

  return sortDonghuaItems(filtered, state.sortMode, state.sortReverse, titleLang);
}

