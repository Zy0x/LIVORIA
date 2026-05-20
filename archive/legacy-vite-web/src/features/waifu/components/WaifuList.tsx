import { Heart } from 'lucide-react';
import type { WaifuItem } from '../types/waifu.types';
import { WaifuCard } from './WaifuCard';

type WaifuListProps = {
  items: WaifuItem[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (item: WaifuItem) => void;
  onDelete: (item: WaifuItem) => void;
};

export function WaifuList({ items, isLoading, onAdd, onEdit, onDelete }: WaifuListProps) {
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
        <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Belum ada waifu yang tercatat.</p>
        <button onClick={onAdd} className="mt-3 text-sm text-primary font-medium hover:underline">
          + Tambah waifu pertama
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
      {items.map((waifu) => (
        <WaifuCard key={waifu.id} waifu={waifu} onEdit={() => onEdit(waifu)} onDelete={() => onDelete(waifu)} />
      ))}
    </div>
  );
}
