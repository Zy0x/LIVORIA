import type { AnimeItem } from '@/lib/types';
import { filterItemsByQuery } from '@/lib/alternativeTitlesSearch';
import { getAnimeWatchStatus } from './watch-status';
import { sortAnimeItems } from './anime-sort';
import type { AnimeFilterState } from '../types/anime.types';
import type { TitleLang } from '@/hooks/useTitleLanguage';

export function getUsedAnimeGenres(items: AnimeItem[]): string[] {
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

export function getAnimeActiveFilterCount(state: Pick<
  AnimeFilterState,
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

export function filterAnimeDisplayItems({
  displayList,
  groupMap,
  state,
  titleLang,
}: {
  displayList: AnimeItem[];
  groupMap: Record<string, AnimeItem[]>;
  state: AnimeFilterState;
  titleLang: TitleLang;
}): AnimeItem[] {
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
        getAnimeWatchStatus(groupItem) === state.watchStatusFilter;
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

  return sortAnimeItems(filtered, state.sortMode, state.sortReverse, titleLang, groupMap);
}
