import { useMemo, useState } from 'react';
import { ArrowUpDown, CheckCircle2, Link2, Search, SlidersHorizontal, X } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { CatatanRelatedOption, CatatanRelatedType } from '../types/catatan.types';
import { CATATAN_RELATED_TYPE_LABELS } from '../types/catatan.types';

type RelatedFilterType = CatatanRelatedType | 'all';
type RelatedSortMode = 'recent' | 'title' | 'type';

type CatatanRelatedPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  options: CatatanRelatedOption[];
  selectedOption: CatatanRelatedOption | null;
  loading: boolean;
  onSelect: (option: CatatanRelatedOption | null) => void;
};

const RELATED_TYPES = Object.keys(CATATAN_RELATED_TYPE_LABELS) as CatatanRelatedType[];
const FILTER_TYPES: RelatedFilterType[] = ['all', ...RELATED_TYPES];
const TYPE_ORDER = new Map<RelatedFilterType, number>(FILTER_TYPES.map((type, index) => [type, index]));

const typeLabel = (type: RelatedFilterType) =>
  type === 'all' ? 'Semua' : CATATAN_RELATED_TYPE_LABELS[type];

const optionKey = (option: CatatanRelatedOption) => `${option.type}-${option.id}`;

const makeCounts = () =>
  FILTER_TYPES.reduce(
    (acc, type) => {
      acc[type] = 0;
      return acc;
    },
    {} as Record<RelatedFilterType, number>,
  );

export function CatatanRelatedPickerDialog({
  open,
  onOpenChange,
  options,
  selectedOption,
  loading,
  onSelect,
}: CatatanRelatedPickerDialogProps) {
  const [query, setQuery] = useState('');
  const [filterType, setFilterType] = useState<RelatedFilterType>('all');
  const [sortMode, setSortMode] = useState<RelatedSortMode>('recent');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const allOptions = useMemo(() => {
    if (!selectedOption) return options;
    const exists = options.some((option) => optionKey(option) === optionKey(selectedOption));
    return exists ? options : [selectedOption, ...options];
  }, [options, selectedOption]);

  const counts = useMemo(() => {
    const next = makeCounts();
    allOptions.forEach((option) => {
      next.all += 1;
      next[option.type] += 1;
    });
    return next;
  }, [allOptions]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const filtered = allOptions.filter((option) => {
      if (filterType !== 'all' && option.type !== filterType) return false;
      if (!normalizedQuery) return true;

      const haystack = [option.searchText, option.title, option.subtitle, CATATAN_RELATED_TYPE_LABELS[option.type]]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'title') return a.title.localeCompare(b.title, 'id');
      if (sortMode === 'type') {
        const typeDiff = (TYPE_ORDER.get(a.type) ?? 0) - (TYPE_ORDER.get(b.type) ?? 0);
        return typeDiff || a.title.localeCompare(b.title, 'id');
      }
      return 0;
    });
  }, [allOptions, filterType, query, sortMode]);

  const handleSelect = (option: CatatanRelatedOption | null) => {
    onSelect(option);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[60rem] sm:max-w-4xl p-0 overflow-hidden">
        <div className="flex max-h-[calc(100dvh-1rem)] min-h-0 flex-col">
          <DialogHeader className="border-b border-border px-4 py-4 pr-12 sm:px-6">
            <DialogTitle className="font-display">Pilih Data Terkait</DialogTitle>
            <DialogDescription>
              Tautkan catatan ke data lain agar mudah dilacak dari arsip Tagihan, Anime, Donghua, Waifu, atau Obat.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 border-b border-border bg-muted/20 px-4 py-4 sm:px-6">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari judul, nama debitur, source, tipe, atau kategori..."
                className="w-full rounded-xl border border-input bg-background px-10 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20"
                autoFocus
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Bersihkan pencarian"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTER_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(type)}
                  className={cn(
                    'inline-flex min-h-[36px] items-center gap-2 rounded-full border px-3 text-xs font-bold transition-all',
                    filterType === type
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                  )}
                  aria-pressed={filterType === type}
                >
                  {typeLabel(type)}
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', filterType === type ? 'bg-primary-foreground/20' : 'bg-muted')}>
                    {counts[type]}
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card/70">
              <button
                type="button"
                onClick={() => setAdvancedOpen((value) => !value)}
                className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-foreground"
              >
                <span className="inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  Filter lanjutan
                </span>
                <span className="text-xs text-muted-foreground">
                  {sortMode === 'recent' ? 'Terbaru ditambahkan' : sortMode === 'title' ? 'Judul A-Z' : 'Jenis data'}
                </span>
              </button>
              {advancedOpen && (
                <div className="border-t border-border px-3 py-3">
                  <p className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Urutkan hasil
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {[
                      { value: 'recent' as RelatedSortMode, label: 'Terbaru ditambahkan' },
                      { value: 'title' as RelatedSortMode, label: 'Judul A-Z' },
                      { value: 'type' as RelatedSortMode, label: 'Jenis data' },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSortMode(item.value)}
                        className={cn(
                          'rounded-lg border px-3 py-2 text-sm font-semibold transition-all',
                          sortMode === item.value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={cn(
                'mb-3 flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-all',
                !selectedOption
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <X className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold">Tanpa koneksi</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">
                  Catatan berdiri sendiri dan tidak ditautkan ke data lain.
                </span>
              </span>
              {!selectedOption && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />}
            </button>

            {loading ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                Memuat data terkait...
              </div>
            ) : filteredOptions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="text-sm font-semibold text-foreground">Data tidak ditemukan</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Coba ubah kata kunci, pilih jenis data lain, atau kosongkan filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {filteredOptions.map((option) => {
                  const active = selectedOption ? optionKey(option) === optionKey(selectedOption) : false;
                  return (
                    <button
                      key={optionKey(option)}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={cn(
                        'flex min-w-0 items-start gap-3 rounded-2xl border p-3 text-left transition-all',
                        active
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border bg-card hover:border-primary/40 hover:bg-accent/40',
                      )}
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Link2 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="mb-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                          {CATATAN_RELATED_TYPE_LABELS[option.type]}
                        </span>
                        <span className="block break-words text-sm font-bold leading-snug text-foreground">
                          {option.title}
                        </span>
                        <span className="mt-1 block break-words text-xs leading-relaxed text-muted-foreground">
                          {option.subtitle}
                        </span>
                      </span>
                      {active && <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
