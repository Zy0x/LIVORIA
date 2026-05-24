import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { WaifuItem, WaifuSortMode, WaifuSourceFilter, WaifuTierFilter } from '../types/waifu.types';

type WaifuFilterBarProps = {
  waifuList: WaifuItem[];
  filter: WaifuSourceFilter;
  setFilter: Dispatch<SetStateAction<WaifuSourceFilter>>;
  tierFilter: WaifuTierFilter;
  setTierFilter: Dispatch<SetStateAction<WaifuTierFilter>>;
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  sortMode: WaifuSortMode;
  setSortMode: Dispatch<SetStateAction<WaifuSortMode>>;
  activeFilterCount: number;
};

export function WaifuFilterBar({
  waifuList,
  filter,
  setFilter,
  tierFilter,
  setTierFilter,
  search,
  setSearch,
  sortMode,
  setSortMode,
  activeFilterCount,
}: WaifuFilterBarProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  return (
    <div className="flex flex-col gap-3 mb-6">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama waifu atau sumber..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium hover:bg-muted transition-all min-h-[44px]"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="hidden sm:inline">Urutkan</span>
          </button>
          {showSortDropdown && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[140px] animate-scale-in">
                {(
                  [
                    ['terbaru', 'Baru Ditambahkan'],
                    ['nama_az', 'Nama (A-Z)'],
                    ['tier', 'Tier (S→C)'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSortMode(key);
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted ${sortMode === key ? 'font-semibold text-primary' : ''}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'anime', 'donghua'] as const).map((nextFilter) => (
          <button
            key={nextFilter}
            onClick={() => setFilter(nextFilter)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[40px] ${filter === nextFilter ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {nextFilter === 'all'
              ? `Semua (${waifuList.length})`
              : nextFilter === 'anime'
                ? `Anime (${waifuList.filter((waifu) => waifu.source_type === 'anime').length})`
                : `Donghua (${waifuList.filter((waifu) => waifu.source_type === 'donghua').length})`}
          </button>
        ))}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filter aktif:</span>
          {tierFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              Tier {tierFilter}{' '}
              <button onClick={() => setTierFilter('all')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {sortMode !== 'terbaru' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {sortMode}{' '}
              <button onClick={() => setSortMode('terbaru')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
