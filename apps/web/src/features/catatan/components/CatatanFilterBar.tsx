import { ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import type { CatatanFilterMode, CatatanSortMode } from '../types/catatan.types';

type CatatanFilterBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  filterMode: CatatanFilterMode;
  onFilterModeChange: (value: CatatanFilterMode) => void;
  sortMode: CatatanSortMode;
  onSortModeChange: (value: CatatanSortMode) => void;
  total: number;
  pinned: number;
  tagged: number;
  linked: number;
};

export function CatatanFilterBar({
  search,
  onSearchChange,
  filterMode,
  onFilterModeChange,
  sortMode,
  onSortModeChange,
  total,
  pinned,
  tagged,
  linked,
}: CatatanFilterBarProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 mb-5">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Cari judul, isi, atau tag..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
          />
        </div>
        <div className="relative min-w-0 lg:w-48">
          <select
            value={filterMode}
            onChange={(event) => onFilterModeChange(event.target.value as CatatanFilterMode)}
            className="h-12 w-full appearance-none rounded-xl border border-input bg-background py-3 pl-4 pr-10 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="all">Semua</option>
            <option value="pinned">Disematkan</option>
            <option value="with_tags">Bertag</option>
            <option value="linked">Terhubung</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
        <div className="relative min-w-0 lg:w-56">
          <select
            value={sortMode}
            onChange={(event) => onSortModeChange(event.target.value as CatatanSortMode)}
            className="h-12 w-full appearance-none rounded-xl border border-input bg-background py-3 pl-4 pr-10 text-sm text-foreground transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
          >
            <option value="diperbarui">Terakhir Diperbarui</option>
            <option value="terbaru">Baru Ditambahkan</option>
            <option value="judul_az">Judul A-Z</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        {[
          { value: 'all' as const, label: `Semua (${total})` },
          { value: 'pinned' as const, label: `Semat (${pinned})` },
          { value: 'with_tags' as const, label: `Tag (${tagged})` },
          { value: 'linked' as const, label: `Terhubung (${linked})` },
        ].map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onFilterModeChange(item.value)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              filterMode === item.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
