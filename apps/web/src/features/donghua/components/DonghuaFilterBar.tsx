import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUpDown,
  Bookmark,
  CheckSquare,
  ChevronDown,
  Film,
  Filter,
  Grid3X3,
  Heart,
  List,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XSquare,
} from 'lucide-react';
import type {
  DonghuaFilterStatus,
  DonghuaMovieFilter,
  DonghuaSortMode,
  DonghuaViewMode,
  DonghuaWatchlistFilter,
} from '../types/donghua.types';

const GENRE_PALETTE: Record<string, string> = {
  'Action': '#ef4444', 'Adventure': '#22c55e', 'Comedy': '#f59e0b',
  'Drama': '#a855f7', 'Fantasy': '#3b82f6', 'Horror': '#dc2626',
  'Mystery': '#8b5cf6', 'Romance': '#ec4899', 'Sci-Fi': '#06b6d4',
  'Slice of Life': '#10b981', 'Isekai': '#14b8a6', 'Supernatural': '#7c3aed',
  'Martial Arts': '#f97316', 'Psychological': '#6366f1', 'School': '#0ea5e9',
  'Shounen': '#3b82f6', 'Mecha': '#64748b', 'Sports': '#f97316',
};

interface PortalDropdownProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  children: React.ReactNode;
  minWidth?: number;
  align?: 'left' | 'right';
}

function PortalDropdown({ open, onClose, triggerRef, children, minWidth = 180, align = 'left' }: PortalDropdownProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estimatedH = 320;
    const w = Math.min(minWidth, vw - 16);

    let left = align === 'right' ? rect.right - w : rect.left;
    left = Math.max(8, Math.min(left, vw - w - 8));

    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const showAbove = spaceBelow < estimatedH && spaceAbove > spaceBelow;

    setStyle({
      position: 'fixed',
      zIndex: 99999,
      width: w,
      ...(showAbove
        ? { bottom: vh - rect.top + 8, top: 'auto' }
        : { top: rect.bottom + 8, bottom: 'auto' }),
      left,
      maxHeight: Math.min(280, showAbove ? spaceAbove : Math.max(spaceBelow, 120)),
    });
  }, [open, triggerRef, minWidth, align]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (dropRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onScroll = (e: Event) => {
      if (dropRef.current && dropRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const onResize = () => onClose();
    document.addEventListener('mousedown', onOutside, true);
    document.addEventListener('touchstart', onOutside, true);
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onOutside, true);
      document.removeEventListener('touchstart', onOutside, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open, onClose, triggerRef]);

  if (!open) return null;
  return createPortal(
    <div ref={dropRef} style={style} className="bg-card border border-border rounded-2xl shadow-xl py-2 overflow-y-auto">
      {children}
    </div>,
    document.body
  );
}

interface DonghuaFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  showFilters: boolean;
  onShowFiltersChange: (value: boolean) => void;
  activeFilterCount: number;
  viewMode: DonghuaViewMode;
  onViewModeChange: (value: DonghuaViewMode) => void;
  filter: DonghuaFilterStatus;
  onFilterChange: (value: DonghuaFilterStatus) => void;
  movieFilter: DonghuaMovieFilter;
  onMovieFilterChange: (value: DonghuaMovieFilter) => void;
  watchStatusFilter: DonghuaWatchlistFilter;
  onWatchStatusFilterChange: (value: DonghuaWatchlistFilter) => void;
  showFavoriteOnly: boolean;
  onShowFavoriteOnlyChange: (updater: (value: boolean) => boolean) => void;
  showBookmarkOnly: boolean;
  onShowBookmarkOnlyChange: (updater: (value: boolean) => boolean) => void;
  showHentaiOnly: boolean;
  onShowHentaiOnlyChange: (updater: (value: boolean) => boolean) => void;
  usedGenres: string[];
  genreFilter: string;
  onGenreFilterChange: (value: string) => void;
  sortMode: DonghuaSortMode;
  onSortModeChange: (value: DonghuaSortMode) => void;
  sortReverse: boolean;
  onSortReverseChange: (updater: (value: boolean) => boolean) => void;
  batchSelectMode: boolean;
  selectedCount: number;
  allVisibleSelected: boolean;
  batchDeletePending: boolean;
  onToggleBatchMode: () => void;
  onToggleSelectAll: () => void;
  onDeleteSelected: () => void;
}

export function DonghuaFilterBar({
  search,
  onSearchChange,
  showFilters,
  onShowFiltersChange,
  activeFilterCount,
  viewMode,
  onViewModeChange,
  filter,
  onFilterChange,
  movieFilter,
  onMovieFilterChange,
  watchStatusFilter,
  onWatchStatusFilterChange,
  showFavoriteOnly,
  onShowFavoriteOnlyChange,
  showBookmarkOnly,
  onShowBookmarkOnlyChange,
  showHentaiOnly,
  onShowHentaiOnlyChange,
  usedGenres,
  genreFilter,
  onGenreFilterChange,
  sortMode,
  onSortModeChange,
  sortReverse,
  onSortReverseChange,
  batchSelectMode,
  selectedCount,
  allVisibleSelected,
  batchDeletePending,
  onToggleBatchMode,
  onToggleSelectAll,
  onDeleteSelected,
}: DonghuaFilterBarProps) {
  const [showGenreDD, setShowGenreDD] = useState(false);
  const [showSortDD, setShowSortDD] = useState(false);
  const genreTriggerRef = useRef<HTMLButtonElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="space-y-3 mb-6 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-sm">
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Cari judul, genre..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
            />
            {search && (
              <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button onClick={() => onShowFiltersChange(!showFilters)}
            className="md:hidden relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-input bg-background text-muted-foreground hover:bg-muted transition-all shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
          <div className="flex gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border shrink-0">
            <button onClick={() => onViewModeChange('grid')} className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Grid3X3 className="w-3.5 h-3.5" /></button>
            <button onClick={() => onViewModeChange('list')} className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        <div className={`${showFilters ? 'flex' : 'hidden'} md:flex flex-col gap-3`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status Rilis</p>
              <div className="flex gap-0.5 p-0.5 rounded-xl bg-muted/60 border border-border overflow-x-auto">
                {([
                  ['all', 'Semua', 'bg-card text-foreground shadow-sm'],
                  ['on-going', 'Tayang', 'bg-emerald-500 text-white shadow-sm'],
                  ['completed', 'Selesai', 'bg-sky-500 text-white shadow-sm'],
                  ['planned', 'Rencana', 'bg-amber-500 text-white shadow-sm'],
                ] as const).map(([k, l, activeClass]) => (
                  <button key={k} onClick={() => onFilterChange(k)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex-1 ${filter === k ? activeClass : 'text-muted-foreground hover:text-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Tipe</p>
              <div className="flex gap-0.5 p-0.5 rounded-xl bg-muted/60 border border-border">
                {([
                  ['all', 'Semua', 'bg-card text-foreground shadow-sm'],
                  ['series', 'Serial', 'bg-primary text-primary-foreground shadow-sm'],
                  ['movie', 'Film', 'bg-violet-500 text-white shadow-sm'],
                ] as const).map(([k, l, activeClass]) => (
                  <button key={k} onClick={() => onMovieFilterChange(k)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 whitespace-nowrap flex-1 justify-center ${movieFilter === k ? activeClass : 'text-muted-foreground hover:text-foreground'}`}>
                    {k === 'movie' && <Film className="w-3 h-3" />}{l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Status Tonton Saya</p>
              <div className="flex gap-0.5 p-0.5 rounded-xl bg-muted/60 border border-border overflow-x-auto">
                {([
                  ['all', 'Semua', 'bg-card text-foreground shadow-sm'],
                  ['want_to_watch', 'Mau Nonton', 'bg-amber-500 text-white shadow-sm'],
                  ['watching', 'Nonton', 'bg-emerald-500 text-white shadow-sm'],
                  ['watched', 'Selesai', 'bg-sky-500 text-white shadow-sm'],
                ] as const).map(([k, l, activeClass]) => (
                  <button key={k} onClick={() => onWatchStatusFilterChange(k)}
                    className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex-1 ${watchStatusFilter === k ? activeClass : 'text-muted-foreground hover:text-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Lainnya</p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button onClick={() => onShowFavoriteOnlyChange(v => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${showFavoriteOnly ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
                <Heart className={`w-3 h-3 ${showFavoriteOnly ? 'fill-amber-500 text-amber-500' : ''}`} /> Favorit
              </button>
              <button onClick={() => onShowBookmarkOnlyChange(v => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${showBookmarkOnly ? 'border-sky-400 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
                <Bookmark className={`w-3 h-3 ${showBookmarkOnly ? 'fill-sky-500 text-sky-500' : ''}`} /> Bookmark
              </button>
              <button onClick={() => onShowHentaiOnlyChange(v => !v)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${showHentaiOnly ? 'border-pink-400 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
                🔞 18+
              </button>
              {usedGenres.length > 0 && (
                <div className="relative">
                  <button ref={genreTriggerRef} onClick={() => setShowGenreDD(!showGenreDD)}
                    className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${genreFilter !== 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
                    <Filter className="w-3 h-3" />{genreFilter === 'all' ? 'Genre' : genreFilter}
                    <ChevronDown className={`w-2.5 h-2.5 transition-transform ${showGenreDD ? 'rotate-180' : ''}`} />
                  </button>
                  <PortalDropdown open={showGenreDD} onClose={() => setShowGenreDD(false)} triggerRef={genreTriggerRef} minWidth={180} align="left">
                    <button onClick={() => { onGenreFilterChange('all'); setShowGenreDD(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === 'all' ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>Semua Genre</button>
                    {usedGenres.map(g => (
                      <button key={g} onClick={() => { onGenreFilterChange(g); setShowGenreDD(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === g ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>
                        <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }} />{g}</span>
                      </button>
                    ))}
                  </PortalDropdown>
                </div>
              )}
              <div className="relative">
                <button ref={sortTriggerRef} onClick={() => setShowSortDD(!showSortDD)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-input bg-background text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-all">
                  <SlidersHorizontal className="w-3 h-3" /> Urutkan
                </button>
                <PortalDropdown open={showSortDD} onClose={() => setShowSortDD(false)} triggerRef={sortTriggerRef} minWidth={200} align="right">
                  {([['terbaru', 'Terbaru'], ['rating', 'Rating Tertinggi'], ['judul_az', 'Judul A-Z'], ['episode', 'Episode Terbanyak'], ['jadwal_terdekat', 'Jadwal Terdekat'], ['tahun_terbaru', 'Tahun Terbaru'], ['baru_ditonton', 'Baru Ditonton']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => { onSortModeChange(k); setShowSortDD(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortMode === k ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>{l}</button>
                  ))}
                  <div className="border-t border-border/50 mt-1 pt-1">
                    <button onClick={() => { onSortReverseChange(v => !v); setShowSortDD(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${sortReverse ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>
                      <ArrowUpDown className="w-3.5 h-3.5" /> Balik Urutan {sortReverse ? '✓' : ''}
                    </button>
                  </div>
                </PortalDropdown>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mb-3">
        <button onClick={onToggleBatchMode}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-semibold transition-all ${batchSelectMode ? 'border-destructive bg-destructive/10 text-destructive' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
          {batchSelectMode ? <XSquare className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
          {batchSelectMode ? 'Batal Pilih' : 'Pilih & Hapus'}
        </button>
        {batchSelectMode && (
          <>
            <button onClick={onToggleSelectAll}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-input bg-background text-[11px] font-semibold text-muted-foreground hover:bg-muted transition-all">
              {allVisibleSelected ? <XSquare className="w-3 h-3" /> : <CheckSquare className="w-3 h-3" />}
              {allVisibleSelected ? 'Batal Semua' : 'Pilih Semua'}
            </button>
            {selectedCount > 0 && (
              <button onClick={onDeleteSelected}
                disabled={batchDeletePending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-[11px] font-bold hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-destructive/20">
                <Trash2 className="w-3.5 h-3.5" /> Hapus ({selectedCount})
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
