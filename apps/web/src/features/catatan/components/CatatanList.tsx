import { StickyNote } from 'lucide-react';
import type { CatatanItem } from '../types/catatan.types';
import { CatatanCard } from './CatatanCard';

type CatatanListProps = {
  items: CatatanItem[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: CatatanItem) => void;
  onDelete: (item: CatatanItem) => void;
};

export function CatatanList({ items, isLoading, onAdd, onEdit, onDelete }: CatatanListProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="stat-card h-[220px] animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <StickyNote className="w-14 h-14 mx-auto mb-4 text-muted-foreground/30" />
        <p className="text-muted-foreground mb-4">Belum ada catatan yang cocok.</p>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90 transition-all"
        >
          Tambah Catatan
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
      {items.map((item) => (
        <CatatanCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}
