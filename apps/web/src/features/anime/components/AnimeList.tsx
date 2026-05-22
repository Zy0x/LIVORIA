import type React from 'react';
import { Plus, Tv } from 'lucide-react';
import { Pagination, type PageSize } from '@/components/shared/Pagination';
import type { AnimeItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { WatchStatus } from '../types/anime.types';
import { AddCard, AnimeCard } from './AnimeCard';

interface AnimeListProps {
  items: AnimeItem[];
  filteredCount: number;
  search: string;
  groupMap: Record<string, AnimeItem[]>;
  stackCounts: Record<string, number>;
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  titleLang: TitleLang;
  listRef: React.RefObject<HTMLDivElement>;
  listStartRef: React.RefObject<HTMLDivElement>;
  onAdd: () => void;
  onEdit: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
  onView: (item: AnimeItem) => void;
  onViewStack: (item: AnimeItem) => void;
  onToggleFavorite: (item: AnimeItem) => void;
  onToggleBookmark: (item: AnimeItem) => void;
  onUpdateWatchStatus: (item: AnimeItem, status: WatchStatus) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export function AnimeList({
  items,
  filteredCount,
  search,
  groupMap,
  stackCounts,
  currentPage,
  totalPages,
  pageSize,
  titleLang,
  listRef,
  listStartRef,
  onAdd,
  onEdit,
  onDelete,
  onView,
  onViewStack,
  onToggleFavorite,
  onToggleBookmark,
  onUpdateWatchStatus,
  onPageChange,
  onPageSizeChange,
}: AnimeListProps) {
  if (filteredCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center"><Tv className="w-10 h-10 text-muted-foreground/30" /></div>
        <div className="text-center">
          <p className="text-base font-bold text-foreground mb-1">Tidak ada anime ditemukan</p>
          <p className="text-sm text-muted-foreground">{search ? `Tidak ada hasil untuk "${search}"` : 'Mulai tambahkan anime favoritmu!'}</p>
        </div>
        {!search && (
          <button onClick={onAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" />Tambah Pertama
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <div ref={listStartRef} data-list-start-anchor="anime-list" tabIndex={-1} className="h-px -mt-1 outline-none" />
      <div ref={listRef} className="space-y-2">
        {items.map((anime, i) => (
          <div key={anime.id} data-card-wrapper>
            <AnimeCard
              item={anime}
              stackCount={stackCounts[anime.id] || 0}
              groupItems={groupMap[anime.id] || [anime]}
              viewMode="list"
              index={i}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={() => onView(anime)}
              onViewStack={stackCounts[anime.id] ? () => onViewStack(anime) : undefined}
              onToggleFavorite={() => onToggleFavorite(anime)}
              onToggleBookmark={() => onToggleBookmark(anime)}
              onUpdateWatchStatus={onUpdateWatchStatus}
              titleLang={titleLang}
            />
          </div>
        ))}
        {(pageSize === 'semua' || currentPage === totalPages) && (
          <AddCard viewMode="list" onClick={onAdd} />
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filteredCount}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
