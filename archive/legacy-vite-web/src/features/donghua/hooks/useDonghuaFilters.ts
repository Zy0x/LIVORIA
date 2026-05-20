import { useEffect, useMemo, useState } from 'react';
import type { DonghuaItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import { buildGroupMap } from '../domain/title-grouping';
import { filterDonghuaDisplayItems, getDonghuaActiveFilterCount, getUsedDonghuaGenres } from '../domain/donghua-filter';
import type { DonghuaFilterStatus, DonghuaMovieFilter, DonghuaSortMode, DonghuaWatchlistFilter } from '../types/donghua.types';

export function useDonghuaFilters(donghuaList: DonghuaItem[], titleLang: TitleLang) {
  const [filter, setFilter] = useState<DonghuaFilterStatus>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [watchStatusFilter, setWatchStatusFilter] = useState<DonghuaWatchlistFilter>('all');
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [showBookmarkOnly, setShowBookmarkOnly] = useState(false);
  const [showHentaiOnly, setShowHentaiOnly] = useState(false);
  const [movieFilter, setMovieFilter] = useState<DonghuaMovieFilter>('all');
  const [sortMode, setSortMode] = useState<DonghuaSortMode>('terbaru');
  const [sortReverse, setSortReverse] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  const state = useMemo(() => ({
    filter,
    search,
    debouncedSearch,
    genreFilter,
    watchStatusFilter,
    showFavoriteOnly,
    showBookmarkOnly,
    showHentaiOnly,
    movieFilter,
    sortMode,
    sortReverse,
  }), [
    filter,
    search,
    debouncedSearch,
    genreFilter,
    watchStatusFilter,
    showFavoriteOnly,
    showBookmarkOnly,
    showHentaiOnly,
    movieFilter,
    sortMode,
    sortReverse,
  ]);

  const usedGenres = useMemo(() => getUsedDonghuaGenres(donghuaList), [donghuaList]);

  const { displayList, stackCounts, groupMap } = useMemo(
    () => buildGroupMap(donghuaList),
    [donghuaList]
  );

  const filtered = useMemo(
    () => filterDonghuaDisplayItems({ displayList, groupMap, state, titleLang }),
    [displayList, groupMap, state, titleLang]
  );

  const activeFilterCount = useMemo(() => getDonghuaActiveFilterCount(state), [state]);

  return {
    filter,
    setFilter,
    search,
    setSearch,
    debouncedSearch,
    genreFilter,
    setGenreFilter,
    watchStatusFilter,
    setWatchStatusFilter,
    showFavoriteOnly,
    setShowFavoriteOnly,
    showBookmarkOnly,
    setShowBookmarkOnly,
    showHentaiOnly,
    setShowHentaiOnly,
    movieFilter,
    setMovieFilter,
    sortMode,
    setSortMode,
    sortReverse,
    setSortReverse,
    usedGenres,
    displayList,
    stackCounts,
    groupMap,
    filtered,
    activeFilterCount,
  };
}
