import type { AnimeItem, WatchStatus as BaseWatchStatus } from '@/lib/types';
import type { PageSize } from '@/components/shared/Pagination';

export type Anime = AnimeItem;
export type AnimeInput = Partial<AnimeItem>;
export type WatchStatus = BaseWatchStatus;
export type AnimeSortMode =
  | 'terbaru'
  | 'rating'
  | 'judul_az'
  | 'episode'
  | 'jadwal_terdekat'
  | 'tahun_terbaru'
  | 'baru_ditonton';
export type AnimeFilterStatus = 'all' | AnimeItem['status'];
export type AnimeMovieFilter = 'all' | 'movie' | 'series';
export type AnimeViewMode = 'grid' | 'list';
export type AnimePageTab = 'semua' | 'watchlist';
export type AnimeWatchlistFilter = 'all' | WatchStatus;

export interface AnimeFilterState {
  filter: AnimeFilterStatus;
  search: string;
  debouncedSearch: string;
  genreFilter: string;
  watchStatusFilter: AnimeWatchlistFilter;
  showFavoriteOnly: boolean;
  showBookmarkOnly: boolean;
  showHentaiOnly: boolean;
  movieFilter: AnimeMovieFilter;
  sortMode: AnimeSortMode;
  sortReverse: boolean;
}

export interface AnimePaginationState {
  pageSize: PageSize;
  watchlistPageSize: PageSize;
  currentPage: number;
  watchlistCurrentPage: number;
}

