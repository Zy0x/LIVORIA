import type React from 'react';
import { BookmarkPlus, Tv } from 'lucide-react';
import { Pagination, type PageSize } from '@/components/shared/Pagination';
import type { AnimeItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { AnimePageTab, AnimeWatchlistFilter, WatchStatus } from '../types/anime.types';
import { WATCH_STATUS_CONFIG } from './AnimeCard';
import { WatchlistCard } from './AnimeWatchlistCard';

interface AnimeWatchlistStats {
  wantToWatch: number;
  watching: number;
  watched: number;
}

interface AnimeWatchlistProps {
  watchlistItems: AnimeItem[];
  watchlistFiltered: AnimeItem[];
  paginatedWatchlist: AnimeItem[];
  stats: AnimeWatchlistStats;
  watchlistFilter: AnimeWatchlistFilter;
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  titleLang: TitleLang;
  onFilterChange: (filter: AnimeWatchlistFilter) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onPageTabChange: (tab: AnimePageTab) => void;
  onUpdateWatchStatus: (item: AnimeItem, newStatus: WatchStatus) => void;
  onUpdateEpisode: (item: AnimeItem, watched: number, total?: number) => void;
  onEdit: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
  onView: (item: AnimeItem) => void;
  listStartRef: React.RefObject<HTMLDivElement>;
}

export function AnimeWatchlist({
  watchlistItems,
  watchlistFiltered,
  paginatedWatchlist,
  stats,
  watchlistFilter,
  currentPage,
  totalPages,
  pageSize,
  titleLang,
  onFilterChange,
  onPageChange,
  onPageSizeChange,
  onPageTabChange,
  onUpdateWatchStatus,
  onUpdateEpisode,
  onEdit,
  onDelete,
  onView,
  listStartRef,
}: AnimeWatchlistProps) {
  return (
    <div>
      <div className="rounded-xl bg-info/5 border border-info/20 p-3 mb-4 flex items-start gap-2.5">
        <BookmarkPlus className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Status Tonton</span> terpisah dari status rilis anime.
          Gunakan tombol <strong>−/+Ep</strong> untuk update progress episode langsung dari watchlist.
        </p>
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {([
          { key: 'all', label: `Semua (${watchlistItems.length})` },
          { key: 'want_to_watch', label: `Mau Nonton (${stats.wantToWatch})` },
          { key: 'watching', label: `Sedang Nonton (${stats.watching})` },
          { key: 'watched', label: `Sudah Ditonton (${stats.watched})` },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => onFilterChange(tab.key)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${watchlistFilter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {watchlistFiltered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-muted/60 border border-border flex items-center justify-center">
            <BookmarkPlus className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground mb-1">
              {watchlistFilter === 'all' ? 'Watchlist Kosong' : `Tidak Ada "${WATCH_STATUS_CONFIG[watchlistFilter as WatchStatus]?.label}"`}
            </p>
            <p className="text-sm text-muted-foreground">
              {watchlistFilter === 'all'
                ? 'Tandai anime dari koleksi dengan tombol status tonton.'
                : 'Tandai anime dari tab Koleksi menggunakan tombol status tonton.'}
            </p>
          </div>
          <button onClick={() => onPageTabChange('semua')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
            <Tv className="w-4 h-4" />Ke Koleksi
          </button>
        </div>
      ) : (
        <>
          <div ref={listStartRef} tabIndex={-1} className="h-px -mt-1 outline-none" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {paginatedWatchlist.map(item => (
              <WatchlistCard
                key={item.id}
                item={item}
                onUpdateWatchStatus={onUpdateWatchStatus}
                onUpdateEpisode={onUpdateEpisode}
                onEdit={onEdit}
                onDelete={onDelete}
                onView={() => onView(item)}
                titleLang={titleLang}
              />
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={watchlistFiltered.length}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </>
      )}
    </div>
  );
}
