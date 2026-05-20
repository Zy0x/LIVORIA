import { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';
import type { ObatItem } from '../types/obat.types';
import { ObatCard } from './ObatCard';

type ObatListProps = {
  items: ObatItem[];
  isLoading: boolean;
  onAdd: () => void;
  onDetail: (item: ObatItem) => void;
  onEdit: (item: ObatItem) => void;
  onDelete: (item: ObatItem) => void;
};

export function ObatList({ items, isLoading, onAdd, onDetail, onEdit, onDelete }: ObatListProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (event: MouseEvent | TouchEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.card-action-menu')) setOpenMenuId(null);
    };

    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [openMenuId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Belum ada obat yang tercatat.</p>
        <button onClick={onAdd} className="mt-3 text-sm text-primary font-medium hover:underline">
          + Tambah obat pertama
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((obat) => (
        <ObatCard
          key={obat.id}
          obat={obat}
          menuOpen={openMenuId === obat.id}
          onToggleMenu={() => setOpenMenuId(openMenuId === obat.id ? null : obat.id)}
          onDetail={() => {
            setOpenMenuId(null);
            onDetail(obat);
          }}
          onEdit={() => {
            setOpenMenuId(null);
            onEdit(obat);
          }}
          onDelete={() => {
            setOpenMenuId(null);
            onDelete(obat);
          }}
        />
      ))}
    </div>
  );
}
