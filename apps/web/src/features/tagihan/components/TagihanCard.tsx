import type { Tagihan } from '../types/tagihan.types';

interface TagihanCardProps {
  item: Tagihan;
  onView: (item: Tagihan) => void;
}

export default function TagihanCard({ item, onView }: TagihanCardProps) {
  return (
    <button
      onClick={() => onView(item)}
      className="w-full rounded-2xl border border-border bg-card p-4 text-left hover:bg-muted/20 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{item.debitur_nama}</p>
          <p className="text-xs text-muted-foreground truncate">{item.barang_nama}</p>
        </div>
        <span className="text-xs font-medium text-primary">{item.status}</span>
      </div>
    </button>
  );
}

