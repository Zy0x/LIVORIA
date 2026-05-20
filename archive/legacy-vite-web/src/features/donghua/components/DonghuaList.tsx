import type React from 'react';
import { Plus, Tv } from 'lucide-react';
import { Pagination, type PageSize } from '@/components/shared/Pagination';
import type { DonghuaItem } from '@/lib/types';
import type { TitleLang } from '@/hooks/useTitleLanguage';
import type { WatchStatus } from '../types/donghua.types';
import { AddCard, DonghuaCard } from './DonghuaCard';

interface DonghuaListProps {
  items: DonghuaItem[];
  filteredCount: number;
  search: string;
  groupMap: Record<string, DonghuaItem[]>;
  stackCounts: Record<string, number>;
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  titleLang: TitleLang;
  listRef: React.RefObject<HTMLDivElement>;
  onAdd: () => void;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onView: (item: DonghuaItem) => void;
  onViewStack: (item: DonghuaItem) => void;
  onToggleFavorite: (item: DonghuaItem) => void;
  onToggleBookmark: (item: DonghuaItem) => void;
  onUpdateWatchStatus: (item: DonghuaItem, status: WatchStatus) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: PageSize) => void;
}

export function DonghuaList({
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
}: DonghuaListProps) {
  if (filteredCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center"><Tv className="w-10 h-10 text-muted-foreground/30" /></div>
        <div className="text-center">
          <p className="text-base font-bold text-foreground mb-1">Tidak ada donghua ditemukan</p>
          <p className="text-sm text-muted-foreground">{search ? `Tidak ada hasil untuk "${search}"` : 'Mulai tambahkan donghua favoritmu!'}</p>
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
      <div ref={listRef} className="space-y-2">
        {items.map((donghua, i) => (
          <div key={donghua.id} data-card-wrapper>
            <DonghuaCard
              item={donghua}
              stackCount={stackCounts[donghua.id] || 0}
              groupItems={groupMap[donghua.id] || [donghua]}
              viewMode="list"
              index={i}
              onEdit={onEdit}
              onDelete={onDelete}
              onView={() => onView(donghua)}
              onViewStack={stackCounts[donghua.id] ? () => onViewStack(donghua) : undefined}
              onToggleFavorite={() => onToggleFavorite(donghua)}
              onToggleBookmark={() => onToggleBookmark(donghua)}
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
