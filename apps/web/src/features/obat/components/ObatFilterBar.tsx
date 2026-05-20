import type { Dispatch, SetStateAction } from 'react';
import { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { ObatFrequencyFilter, ObatItem, ObatSortMode } from '../types/obat.types';

type ObatFilterBarProps = {
  obatList: ObatItem[];
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  typeFilter: string;
  setTypeFilter: Dispatch<SetStateAction<string>>;
  freqFilter: ObatFrequencyFilter;
  setFreqFilter: Dispatch<SetStateAction<ObatFrequencyFilter>>;
  sortMode: ObatSortMode;
  setSortMode: Dispatch<SetStateAction<ObatSortMode>>;
  uniqueTypes: string[];
  activeFilterCount: number;
};

export function ObatFilterBar({
  obatList,
  search,
  setSearch,
  typeFilter,
  setTypeFilter,
  freqFilter,
  setFreqFilter,
  sortMode,
  setSortMode,
  uniqueTypes,
  activeFilterCount,
}: ObatFilterBarProps) {
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
            placeholder="Cari nama obat, tipe, atau kegunaan..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFreqFilter(freqFilter === 'all' ? 'rutin' : freqFilter === 'rutin' ? 'lainnya' : 'all')}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${freqFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}
          >
            {freqFilter === 'all' ? 'Semua Frekuensi' : freqFilter === 'rutin' ? '⏰ Rutin Harian' : '📋 Lainnya'}
          </button>
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-input bg-background text-xs font-medium hover:bg-muted transition-all"
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
                      ['terbaru', 'Terbaru'],
                      ['nama_az', 'Nama (A-Z)'],
                      ['tipe', 'Kategori'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSortMode(key);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${sortMode === key ? 'font-semibold text-primary' : ''}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${typeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
        >
          Semua ({obatList.length})
        </button>
        {uniqueTypes.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${typeFilter === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
          >
            {type} ({obatList.filter((obat) => obat.type === type).length})
          </button>
        ))}
      </div>
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">Filter aktif:</span>
          {typeFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {typeFilter}{' '}
              <button onClick={() => setTypeFilter('all')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {freqFilter !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {freqFilter}{' '}
              <button onClick={() => setFreqFilter('all')}>
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
