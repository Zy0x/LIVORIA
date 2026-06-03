import type React from 'react';
import { BookmarkPlus, Tv } from 'lucide-react';
import { Pagination, type PageSize } from '@/components/shared/Pagination';
import type { DonghuaItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { DonghuaPageTab, DonghuaWatchlistFilter, WatchStatus } from '../types/donghua.types';
import { WATCH_STATUS_CONFIG } from './DonghuaCard';
import { WatchlistCard } from './DonghuaWatchlistCard';
import { Skeleton } from '@/components/ui/skeleton';

interface DonghuaWatchlistStats {
  wantToWatch: number;
  watching: number;
  watched: number;
}

interface DonghuaWatchlistProps {
  watchlistItems: DonghuaItem[];
  watchlistFiltered: DonghuaItem[];
  paginatedWatchlist: DonghuaItem[];
  appendSkeletonCount?: number;
  stats: DonghuaWatchlistStats;
  watchlistFilter: DonghuaWatchlistFilter;
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  titleLang: TitleLang;
  onFilterChange: (filter: DonghuaWatchlistFilter) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
  onPageTabChange: (tab: DonghuaPageTab) => void;
  onUpdateWatchStatus: (item: DonghuaItem, newStatus: WatchStatus) => void;
  onUpdateEpisode: (item: DonghuaItem, watched: number, total?: number) => void;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onView: (item: DonghuaItem) => void;
  listStartRef: React.RefObject<HTMLDivElement>;
}

export function DonghuaWatchlist({
  watchlistItems,
  watchlistFiltered,
  paginatedWatchlist,
  appendSkeletonCount = 0,
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
}: DonghuaWatchlistProps) {
  return (
    <div>
      <div className="rounded-xl bg-info/5 border border-info/20 p-3 mb-4 flex items-start gap-2.5">
        <BookmarkPlus className="w-4 h-4 text-info shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Status Tonton</span> terpisah dari status rilis donghua.
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
                ? 'Tandai donghua dari koleksi dengan tombol status tonton.'
                : 'Tandai donghua dari tab Koleksi menggunakan tombol status tonton.'}
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
            {Array.from({ length: appendSkeletonCount }).map((_, index) => (
              <div key={`donghua-watchlist-extra-skeleton-${index}`} className="rounded-2xl border border-border bg-card p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-16 rounded-xl" />
                </div>
              </div>
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
