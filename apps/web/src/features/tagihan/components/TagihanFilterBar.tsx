import { ArrowUpDown, Calendar, Check, ChevronDown, Filter, Search, X } from 'lucide-react';

import type { FilterStatus, SortMode, Tagihan } from '../types/tagihan.types';

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'aktif', label: 'Aktif' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'lunas', label: 'Lunas' },
  { key: 'ditunda', label: 'Ditunda' },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'terbaru', label: 'Baru Ditambahkan' },
  { key: 'sisa_terbesar', label: 'Sisa Terbesar' },
  { key: 'jatuh_tempo', label: 'Jatuh Tempo' },
  { key: 'nama_az', label: 'Nama (A-Z)' },
];

interface TagihanFilterBarProps {
  bills: Tagihan[];
  search: string;
  filter: FilterStatus;
  debiturFilter: string[];
  showDebiturDD: boolean;
  debiturSearch: string;
  sortMode: SortMode;
  showSortDD: boolean;
  jenisTempo: 'all' | 'bulanan' | 'berjangka';
  uniqueDebiturs: string[];
  filteredDebiturs: string[];
  overdueCount: number;
  activeFilterCount: number;
  inputClass: string;
  setSearch: (value: string) => void;
  setFilter: (value: FilterStatus) => void;
  setShowDebiturDD: (value: boolean) => void;
  setDebiturSearch: (value: string) => void;
  setDebiturFilter: (value: string[]) => void;
  setSortMode: (value: SortMode) => void;
  setShowSortDD: (value: boolean) => void;
  setJenisTempo: (value: 'all' | 'bulanan' | 'berjangka') => void;
  toggleDebitur: (name: string) => void;
}

export default function TagihanFilterBar(props: TagihanFilterBarProps) {
  const {
    bills,
    search,
    filter,
    debiturFilter,
    showDebiturDD,
    debiturSearch,
    sortMode,
    showSortDD,
    jenisTempo,
    uniqueDebiturs,
    filteredDebiturs,
    overdueCount,
    activeFilterCount,
    inputClass,
    setSearch,
    setFilter,
    setShowDebiturDD,
    setDebiturSearch,
    setDebiturFilter,
    setSortMode,
    setShowSortDD,
    setJenisTempo,
    toggleDebitur,
  } = props;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari debitur atau barang..."
            className={`pl-10 ${inputClass}`}
          />
        </div>

        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          {uniqueDebiturs.length > 1 && (
            <div className="relative">
              <button
                onClick={() => setShowDebiturDD(!showDebiturDD)}
                className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm hover:bg-muted transition-all min-h-[44px] ${
                  debiturFilter.length > 0
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-input bg-background text-muted-foreground'
                }`}
              >
                <Filter className="w-4 h-4 shrink-0" />
                <span className="text-xs truncate max-w-[80px]">
                  {debiturFilter.length === 0 ? 'Debitur' : `${debiturFilter.length} dipilih`}
                </span>
                <ChevronDown className="w-3 h-3 shrink-0" />
              </button>
              {showDebiturDD && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setShowDebiturDD(false); setDebiturSearch(''); }} />
                  <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[220px] max-h-72 overflow-hidden">
                    <div className="px-3 pb-2 border-b border-border">
                      <input
                        type="text"
                        value={debiturSearch}
                        onChange={(event) => setDebiturSearch(event.target.value)}
                        placeholder="Cari debitur..."
                        className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none"
                        autoFocus
                      />
                    </div>
                    <div className="overflow-y-auto max-h-52">
                      <button
                        onClick={() => { setDebiturFilter([]); setShowDebiturDD(false); setDebiturSearch(''); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors ${debiturFilter.length === 0 ? 'text-primary font-semibold' : ''}`}
                      >
                        Semua Debitur
                      </button>
                      {filteredDebiturs.map((name) => {
                        const selected = debiturFilter.includes(name);
                        return (
                          <button
                            key={name}
                            onClick={() => toggleDebitur(name)}
                            className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected ? 'bg-primary border-primary' : 'border-input'}`}>
                              {selected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                            </span>
                            <span className="truncate">{name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => {
              const map: Record<string, 'all' | 'bulanan' | 'berjangka'> = {
                all: 'bulanan',
                bulanan: 'berjangka',
                berjangka: 'all',
              };
              setJenisTempo(map[jenisTempo]);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all min-h-[44px] ${
              jenisTempo !== 'all'
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-input bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            {jenisTempo === 'all' ? 'Jenis' : jenisTempo === 'bulanan' ? 'Bulanan' : 'Berjangka'}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSortDD(!showSortDD)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium hover:bg-muted transition-all min-h-[44px]"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Urutkan</span>
            </button>
            {showSortDD && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDD(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[160px]">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.key}
                      onClick={() => { setSortMode(option.key); setShowSortDD(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${sortMode === option.key ? 'font-semibold text-primary' : ''}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
        {FILTER_TABS.map((tab) => {
          const count = tab.key === 'all'
            ? bills.length
            : tab.key === 'overdue'
            ? overdueCount
            : bills.filter((bill) => bill.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                filter === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${filter === tab.key ? 'bg-white/20' : 'bg-border'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-0.5 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Filter:</span>
          {debiturFilter.map((name) => (
            <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {name}
              <button onClick={() => toggleDebitur(name)} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
          {filter !== 'aktif' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {filter}
              <button onClick={() => setFilter('aktif')} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {jenisTempo !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {jenisTempo}
              <button onClick={() => setJenisTempo('all')} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
          {sortMode !== 'terbaru' && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              {SORT_OPTIONS.find((option) => option.key === sortMode)?.label}
              <button onClick={() => setSortMode('terbaru')} className="hover:text-destructive">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
