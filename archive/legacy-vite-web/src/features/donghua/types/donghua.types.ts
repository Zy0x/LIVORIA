import type { DonghuaItem, WatchStatus as BaseWatchStatus } from '@/lib/types';
import type { PageSize } from '@/components/shared/Pagination';

export type Donghua = DonghuaItem;
export type DonghuaInput = Partial<DonghuaItem>;
export type WatchStatus = BaseWatchStatus;
export type DonghuaSortMode =
  | 'terbaru'
  | 'rating'
  | 'judul_az'
  | 'episode'
  | 'jadwal_terdekat'
  | 'tahun_terbaru'
  | 'baru_ditonton';
export type DonghuaFilterStatus = 'all' | DonghuaItem['status'];
export type DonghuaMovieFilter = 'all' | 'movie' | 'series';
export type DonghuaViewMode = 'grid' | 'list';
export type DonghuaPageTab = 'semua' | 'watchlist';
export type DonghuaWatchlistFilter = 'all' | WatchStatus;

export interface DonghuaFilterState {
  filter: DonghuaFilterStatus;
  search: string;
  debouncedSearch: string;
  genreFilter: string;
  watchStatusFilter: DonghuaWatchlistFilter;
  showFavoriteOnly: boolean;
  showBookmarkOnly: boolean;
  showHentaiOnly: boolean;
  movieFilter: DonghuaMovieFilter;
  sortMode: DonghuaSortMode;
  sortReverse: boolean;
}

export interface DonghuaPaginationState {
  pageSize: PageSize;
  watchlistPageSize: PageSize;
  currentPage: number;
  watchlistCurrentPage: number;
}

