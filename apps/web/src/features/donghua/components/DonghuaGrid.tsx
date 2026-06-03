import type React from 'react';
import { Check, Film, Plus } from 'lucide-react';
import { Pagination, type PageSize } from '@/components/shared/Pagination';
import type { DonghuaItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { WatchStatus } from '../types/donghua.types';
import { AddCard, DonghuaCard } from './DonghuaCard';

interface DonghuaGridProps {
  items: DonghuaItem[];
  groupMap: Record<string, DonghuaItem[]>;
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
  onToggleGroupSelection: (item: DonghuaItem) => void;
  onAdd: () => void;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onDeleteBatch: (ids: string[]) => void;
  onView: (item: DonghuaItem) => void;
  onViewStack: (item: DonghuaItem) => void;
  onToggleFavorite: (item: DonghuaItem) => void;
  onToggleBookmark: (item: DonghuaItem) => void;
  onUpdateWatchStatus: (item: DonghuaItem, status: WatchStatus) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export function DonghuaGrid({
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
}: DonghuaGridProps) {
  return (
    <>
      <div ref={listStartRef} data-list-start-anchor="donghua-grid" tabIndex={-1} className="h-px -mt-1 outline-none" />
      {items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card/65 p-6 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Film className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Belum ada donghua yang tampil</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Tambahkan data baru atau ubah filter/pencarian agar koleksi bisa muncul di sini.
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Tambah Donghua
          </button>
        </div>
      )}
      <div ref={gridRef} className="grid items-start grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
        {items.map((donghua, i) => {
          const groupItems = groupMap[donghua.id] || [donghua];
          const groupSelected = groupItems.some(it => selectedIds.has(it.id));
          return (
            <div key={donghua.id} data-card-wrapper className="relative self-start">
              {batchSelectMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleGroupSelection(donghua);
                  }}
                  className="absolute top-2 left-2 z-20 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all bg-card/90 backdrop-blur-sm hover:scale-110"
                  style={{ borderColor: groupSelected ? 'hsl(var(--destructive))' : 'hsl(var(--border))' }}
                >
                  {groupSelected && <Check className="w-3.5 h-3.5 text-destructive" />}
                </button>
              )}
              <DonghuaCard
                item={donghua}
                stackCount={stackCounts[donghua.id] || 0}
                groupItems={groupItems}
                viewMode="grid"
                index={i}
                fanCoverUrls={(groupMap[donghua.id] || []).filter(it => it.id !== donghua.id).sort((a, b) => (a.season || 1) - (b.season || 1)).map(it => it.cover_url).filter(Boolean) as string[]}
                onEdit={onEdit}
                onDelete={onDelete}
                onDeleteBatch={onDeleteBatch}
                onView={() => {
                  if (batchSelectMode) onToggleGroupSelection(donghua);
                  else onView(donghua);
                }}
                onViewStack={stackCounts[donghua.id] ? () => onViewStack(donghua) : undefined}
                onToggleFavorite={() => onToggleFavorite(donghua)}
                onToggleBookmark={() => onToggleBookmark(donghua)}
                onUpdateWatchStatus={onUpdateWatchStatus}
                titleLang={titleLang}
              />
            </div>
          );
        })}
        {items.length === 0 && (
          <div data-card-wrapper className="self-start"><AddCard viewMode="grid" onClick={onAdd} /></div>
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
