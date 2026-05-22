import type React from 'react';
import { Check } from 'lucide-react';
import { Pagination, type PageSize } from '@/components/shared/Pagination';
import type { AnimeItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { WatchStatus } from '../types/anime.types';
import { AddCard, AnimeCard } from './AnimeCard';

interface AnimeGridProps {
  items: AnimeItem[];
  groupMap: Record<string, AnimeItem[]>;
  stackCounts: Record<string, number>;
  batchSelectMode: boolean;
  selectedIds: Set<string>;
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  totalItems: number;
  titleLang: TitleLang;
  gridRef: React.RefObject<HTMLDivElement>;
  listStartRef: React.RefObject<HTMLDivElement>;
  onToggleGroupSelection: (item: AnimeItem) => void;
  onAdd: () => void;
  onEdit: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
  onDeleteBatch: (ids: string[]) => void;
  onView: (item: AnimeItem) => void;
  onViewStack: (item: AnimeItem) => void;
  onToggleFavorite: (item: AnimeItem) => void;
  onToggleBookmark: (item: AnimeItem) => void;
  onUpdateWatchStatus: (item: AnimeItem, status: WatchStatus) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export function AnimeGrid({
  items,
  groupMap,
  stackCounts,
  batchSelectMode,
  selectedIds,
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  titleLang,
  gridRef,
  listStartRef,
  onToggleGroupSelection,
  onAdd,
  onEdit,
  onDelete,
  onDeleteBatch,
  onView,
  onViewStack,
  onToggleFavorite,
  onToggleBookmark,
  onUpdateWatchStatus,
  onPageChange,
  onPageSizeChange,
}: AnimeGridProps) {
  return (
    <>
      <div ref={listStartRef} data-list-start-anchor="anime-grid" tabIndex={-1} className="h-px -mt-1 outline-none" />
      <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
        {items.map((anime, i) => {
          const groupItems = groupMap[anime.id] || [anime];
          const groupSelected = groupItems.some(it => selectedIds.has(it.id));
          return (
            <div key={anime.id} data-card-wrapper className="relative">
              {batchSelectMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleGroupSelection(anime);
                  }}
                  className="absolute top-2 left-2 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all bg-card/90 backdrop-blur-sm hover:scale-110"
                  style={{ borderColor: groupSelected ? 'hsl(var(--destructive))' : 'hsl(var(--border))' }}
                >
                  {groupSelected && <Check className="w-3.5 h-3.5 text-destructive" />}
                </button>
              )}
              <AnimeCard
                item={anime}
                stackCount={stackCounts[anime.id] || 0}
                groupItems={groupItems}
                viewMode="grid"
                index={i}
                fanCoverUrls={(groupMap[anime.id] || []).filter(it => it.id !== anime.id).sort((a, b) => (a.season || 1) - (b.season || 1)).map(it => it.cover_url).filter(Boolean) as string[]}
                onEdit={onEdit}
                onDelete={onDelete}
                onDeleteBatch={onDeleteBatch}
                onView={() => {
                  if (batchSelectMode) onToggleGroupSelection(anime);
                  else onView(anime);
                }}
                onViewStack={stackCounts[anime.id] ? () => onViewStack(anime) : undefined}
                onToggleFavorite={() => onToggleFavorite(anime)}
                onToggleBookmark={() => onToggleBookmark(anime)}
                onUpdateWatchStatus={onUpdateWatchStatus}
                titleLang={titleLang}
              />
            </div>
          );
        })}
        {(pageSize === 'semua' || currentPage === totalPages) && (
          <div data-card-wrapper><AddCard viewMode="grid" onClick={onAdd} /></div>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </>
  );
}
