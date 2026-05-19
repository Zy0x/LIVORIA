import { useEffect, useMemo, useState } from 'react';
import type { AnimeItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import { buildGroupMap } from '../domain/title-grouping';
import { filterAnimeDisplayItems, getAnimeActiveFilterCount, getUsedAnimeGenres } from '../domain/anime-filter';
import type { AnimeFilterStatus, AnimeMovieFilter, AnimeSortMode, AnimeWatchlistFilter } from '../types/anime.types';

export function useAnimeFilters(animeList: AnimeItem[], titleLang: TitleLang) {
  const [filter, setFilter] = useState<AnimeFilterStatus>('all');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [watchStatusFilter, setWatchStatusFilter] = useState<AnimeWatchlistFilter>('all');
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [showBookmarkOnly, setShowBookmarkOnly] = useState(false);
  const [showHentaiOnly, setShowHentaiOnly] = useState(false);
  const [movieFilter, setMovieFilter] = useState<AnimeMovieFilter>('all');
  const [sortMode, setSortMode] = useState<AnimeSortMode>('terbaru');
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

  const usedGenres = useMemo(() => getUsedAnimeGenres(animeList), [animeList]);

  const { displayList, stackCounts, groupMap } = useMemo(
    () => buildGroupMap(animeList),
    [animeList]
  );

  const filtered = useMemo(
    () => filterAnimeDisplayItems({ displayList, groupMap, state, titleLang }),
    [displayList, groupMap, state, titleLang]
  );

  const activeFilterCount = useMemo(() => getAnimeActiveFilterCount(state), [state]);

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
