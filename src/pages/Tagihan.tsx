import Breadcrumb from '@/components/Breadcrumb';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  Plus, Search, CreditCard, Filter, X, ChevronDown,
  Calculator, SlidersHorizontal, BarChart3, FileText,
  Check, ArrowUpDown, Calendar, TrendingUp, Banknote,
  ChevronRight
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { tagihanService, historyService, strukService, recordPayment } from '@/lib/supabase-service';
import { toast } from '@/hooks/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useBackGesture } from '@/hooks/useBackGesture';
import type { Tagihan, TagihanStatus } from '@/lib/types';

import TagihanList         from '@/components/tagihan/TagihanList';
import TagihanStats        from '@/components/tagihan/TagihanStats';
import TagihanForm         from '@/components/tagihan/TagihanForm';
import TagihanDetail       from '@/components/tagihan/TagihanDetail';
import TagihanExport       from '@/components/tagihan/TagihanExport';
import TagihanCalculator   from '@/components/tagihan/TagihanCalculator';
import TagihanLaporan      from '@/components/tagihan/TagihanLaporan';
import { getPaymentInfo }  from '@/lib/tagihan-cycle';

type FilterStatus = 'all' | TagihanStatus;
type SortMode     = 'terbaru' | 'sisa_terbesar' | 'jatuh_tempo' | 'nama_az';
type SubPage      = 'tagihan' | 'laporan' | 'kalkulator';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS: { key: SubPage; label: string; icon: typeof FileText }[] = [
  { key: 'tagihan',    label: 'Daftar',     icon: CreditCard },
  { key: 'laporan',    label: 'Laporan',    icon: BarChart3  },
  { key: 'kalkulator', label: 'Kalkulator', icon: Calculator },
];

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: 'all',     label: 'Semua'   },
  { key: 'aktif',   label: 'Aktif'   },
  { key: 'overdue', label: 'Overdue' },
  { key: 'lunas',   label: 'Lunas'   },
  { key: 'ditunda', label: 'Ditunda' },
];

const SORT_OPTIONS: { key: SortMode; label: string }[] = [
  { key: 'terbaru',       label: 'Terbaru'       },
  { key: 'sisa_terbesar', label: 'Sisa Terbesar' },
  { key: 'jatuh_tempo',   label: 'Jatuh Tempo'   },
  { key: 'nama_az',       label: 'Nama (A-Z)'    },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function TagihanPage() {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const [subPage,       setSubPage]       = useState<SubPage>('tagihan');
  const [filter,        setFilter]        = useState<FilterStatus>('all');
  const [search,        setSearch]        = useState('');
  const [debiturFilter, setDebiturFilter] = useState<string[]>([]);
  const [showDebiturDD, setShowDebiturDD] = useState(false);
  const [debiturSearch, setDebiturSearch] = useState('');
  const [sortMode,      setSortMode]      = useState<SortMode>('terbaru');
  const [showSortDD,    setShowSortDD]    = useState(false);
  const [jenisTempo,    setJenisTempo]    = useState<'all' | 'bulanan' | 'berjangka'>('all');

  const [formOpen,   setFormOpen]   = useState(false);
  const [editItem,   setEditItem]   = useState<Tagihan | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Tagihan | null>(null);
  const [viewItem,   setViewItem]   = useState<Tagihan | null>(null);

  // Quick pay
  const [quickPayItem,   setQuickPayItem]   = useState<Tagihan | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState(0);
  const [quickPayDate,   setQuickPayDate]   = useState(new Date().toISOString().split('T')[0]);
  const [quickPayNote,   setQuickPayNote]   = useState('');
  const [quickPayFull,   setQuickPayFull]   = useState(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: bills = [], isLoading } = useQuery({ queryKey: ['tagihan'], queryFn: tagihanService.getAll });

  // Sync viewItem when bills refresh
  useEffect(() => {
    if (!viewItem || !bills.length) return;
    const updated = bills.find(b => b.id === viewItem.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(viewItem)) setViewItem(updated);
  }, [bills]);

  useBackGesture(formOpen,       () => setFormOpen(false),      'tagihan-form');
  useBackGesture(!!viewItem,     () => setViewItem(null),       'tagihan-detail');
  useBackGesture(deleteOpen,     () => setDeleteOpen(false),    'tagihan-delete');
  useBackGesture(!!quickPayItem, () => setQuickPayItem(null),   'tagihan-quickpay');

  // Handle state from navigation (e.g. notification bell)
  useEffect(() => {
    const state = location.state as any;
    if (state?.viewItem) {
      const fresh = bills.find(b => b.id === state.viewItem.id) || state.viewItem;
      setViewItem(fresh);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, bills]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: async ({ data, files }: { data: Partial<Tagihan>; files?: File[] }) => {
      const created = await tagihanService.create(data);
      if (files?.length) await Promise.all(files.map(f => strukService.upload(f, created.id, 'Struk awal')));
      await historyService.create({ tagihan_id: created.id, aksi: 'dibuat', detail: `Tagihan baru: ${created.barang_nama}` });
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tagihan'] });
      setFormOpen(false);
      toast({ title: 'Berhasil', description: 'Tagihan berhasil ditambahkan.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...row }: Partial<Tagihan> & { id: string }) => tagihanService.update(id, row),
    onSuccess: async (updated) => {
      await historyService.create({ tagihan_id: updated.id, aksi: 'diperbarui', detail: 'Data tagihan diperbarui' });
      await queryClient.invalidateQueries({ queryKey: ['tagihan'] });
      setFormOpen(false);
      setEditItem(null);
      if (viewItem?.id === updated.id) setViewItem(updated);
      toast({ title: 'Berhasil', description: 'Tagihan berhasil diperbarui.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tagihanService.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tagihan'] });
      setDeleteOpen(false);
      setDeleteItem(null);
      if (viewItem?.id === id) setViewItem(null);
      toast({ title: 'Berhasil', description: 'Tagihan berhasil dihapus.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const quickPayMut = useMutation({
    mutationFn: () => recordPayment(quickPayItem!, quickPayAmount, quickPayDate, quickPayNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tagihan'] });
      setQuickPayItem(null);
      setQuickPayAmount(0);
      setQuickPayNote('');
      setQuickPayFull(false);
      toast({ title: 'Pembayaran Dicatat', description: `${fmt(quickPayAmount)} berhasil dicatat.` });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Page entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    gsap.fromTo(containerRef.current, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
  }, []);

  // Quick pay amount sync
  useEffect(() => {
    if (!quickPayItem) return;
    const info = getPaymentInfo(quickPayItem, new Date());
    setQuickPayNote(info.note);
    setQuickPayAmount(quickPayFull ? Number(quickPayItem.sisa_hutang) : Number(quickPayItem.cicilan_per_bulan));
    setQuickPayDate(new Date().toISOString().split('T')[0]);
  }, [quickPayItem, quickPayFull]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const uniqueDebiturs = useMemo(() =>
    Array.from(new Set(bills.map(b => b.debitur_nama))).sort()
  , [bills]);

  const filteredDebiturs = useMemo(() => {
    if (!debiturSearch.trim()) return uniqueDebiturs;
    return uniqueDebiturs.filter(d => d.toLowerCase().includes(debiturSearch.toLowerCase()));
  }, [uniqueDebiturs, debiturSearch]);

  const filtered = useMemo(() => {
    let r = bills.filter(b => {
      const ms = filter === 'all' || b.status === filter;
      const mq = b.debitur_nama.toLowerCase().includes(search.toLowerCase())
              || b.barang_nama.toLowerCase().includes(search.toLowerCase());
      const md = debiturFilter.length === 0 || debiturFilter.includes(b.debitur_nama);
      const mj = jenisTempo === 'all' || b.jenis_tempo === jenisTempo;
      return ms && mq && md && mj;
    });
    if (sortMode === 'sisa_terbesar') r = [...r].sort((a, b) => Number(b.sisa_hutang) - Number(a.sisa_hutang));
    if (sortMode === 'jatuh_tempo')   r = [...r].sort((a, b) => {
      const da = a.tanggal_jatuh_tempo ? new Date(a.tanggal_jatuh_tempo).getTime() : Infinity;
      const db = b.tanggal_jatuh_tempo ? new Date(b.tanggal_jatuh_tempo).getTime() : Infinity;
      return da - db;
    });
    if (sortMode === 'nama_az') r = [...r].sort((a, b) => a.debitur_nama.localeCompare(b.debitur_nama));
    return r;
  }, [bills, filter, search, debiturFilter, jenisTempo, sortMode]);

  const handleFormSubmit = (data: Partial<Tagihan>, files?: File[]) => {
    if (editItem) updateMut.mutate({ id: editItem.id, ...data });
    else          createMut.mutate({ data, files });
  };

  const handleEditFromDetail   = useCallback((item: Tagihan) => { setEditItem(item); setFormOpen(true); }, []);
  const handleDeleteFromDetail = useCallback((item: Tagihan) => { setDeleteItem(item); setDeleteOpen(true); }, []);

  const toggleDebitur = (name: string) =>
    setDebiturFilter(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);

  const activeFilterCount = [
    debiturFilter.length > 0, filter !== 'all', jenisTempo !== 'all', sortMode !== 'terbaru'
  ].filter(Boolean).length;

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';

  // ─── DETAIL VIEW ─────────────────────────────────────────────────────────
  if (viewItem) {
    const latestItem = bills.find(b => b.id === viewItem.id) || viewItem;
    return (
      <div ref={containerRef}>
        <TagihanDetail
          item={latestItem}
          onBack={() => setViewItem(null)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ['tagihan'] })}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteFromDetail}
        />
        <TagihanForm
          open={formOpen}
          onOpenChange={v => { setFormOpen(v); if (!v) setEditItem(null); }}
          editItem={editItem}
          onSubmit={handleFormSubmit}
          isPending={updateMut.isPending}
        />
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-destructive text-base">Hapus Tagihan</DialogTitle>
              <DialogDescription className="text-xs">
                Hapus "{deleteItem?.debitur_nama} — {deleteItem?.barang_nama}"? Semua struk dan history terkait juga akan terhapus.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">Batal</button>
              <button
                onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)}
                disabled={deleteMut.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
              >
                {deleteMut.isPending ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── MAIN VIEW ────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="space-y-5">
      <Breadcrumb />
      {/* ══ Page header ══════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Manajemen Tagihan</h1>
          <p className="page-subtitle mt-1">Tracking pinjaman, cicilan, dan pembayaran debitur secara real-time.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <TagihanExport
            data={bills}
            onImportDone={() => queryClient.invalidateQueries({ queryKey: ['tagihan'] })}
          />
          <button
            onClick={() => { setEditItem(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all shrink-0 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah</span>
          </button>
        </div>
      </div>

      {/* ══ KPI Stats ════════════════════════════════════════════════════════ */}
      <TagihanStats data={bills} />

      {/* ══ Sub-page tabs ════════════════════════════════════════════════════ */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/60 w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setSubPage(tab.key)}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${subPage === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══ LAPORAN ══════════════════════════════════════════════════════════ */}
      {subPage === 'laporan' && (
        <TagihanLaporan data={bills} onView={t => setViewItem(t)} />
      )}

      {/* ══ KALKULATOR ═══════════════════════════════════════════════════════ */}
      {subPage === 'kalkulator' && (
        <TagihanCalculator
          open={true}
          onOpenChange={() => setSubPage('tagihan')}
          allTagihan={bills}
        />
      )}

      {/* ══ DAFTAR TAGIHAN ═══════════════════════════════════════════════════ */}
      {subPage === 'tagihan' && (
        <div className="space-y-4">

          {/* ── Search & filter bar ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
            {/* Row 1: search + controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari debitur atau barang…"
                  className={`pl-10 ${inputClass}`}
                />
              </div>

              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {/* Debitur filter */}
                {uniqueDebiturs.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowDebiturDD(!showDebiturDD)}
                      className={`
                        inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm
                        hover:bg-muted transition-all min-h-[44px]
                        ${debiturFilter.length > 0
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-input bg-background text-muted-foreground'}
                      `}
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
                              onChange={e => setDebiturSearch(e.target.value)}
                              placeholder="Cari debitur…"
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
                            {filteredDebiturs.map(name => {
                              const sel = debiturFilter.includes(name);
                              return (
                                <button
                                  key={name}
                                  onClick={() => toggleDebitur(name)}
                                  className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                                >
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${sel ? 'bg-primary border-primary' : 'border-input'}`}>
                                    {sel && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
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

                {/* Jenis tempo */}
                <button
                  onClick={() => {
                    const map: Record<string, 'all' | 'bulanan' | 'berjangka'> = {
                      all: 'bulanan', bulanan: 'berjangka', berjangka: 'all'
                    };
                    setJenisTempo(map[jenisTempo]);
                  }}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium
                    transition-all min-h-[44px]
                    ${jenisTempo !== 'all'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-input bg-background text-muted-foreground hover:bg-muted'}
                  `}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  {jenisTempo === 'all' ? 'Jenis' : jenisTempo === 'bulanan' ? 'Bulanan' : 'Berjangka'}
                </button>

                {/* Sort */}
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
                        {SORT_OPTIONS.map(opt => (
                          <button
                            key={opt.key}
                            onClick={() => { setSortMode(opt.key); setShowSortDD(false); }}
                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors ${sortMode === opt.key ? 'font-semibold text-primary' : ''}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Row 2: status filter tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
              {FILTER_TABS.map(f => {
                const count = f.key === 'all' ? bills.length : bills.filter(b => b.status === f.key).length;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`
                      inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium
                      transition-all whitespace-nowrap flex-shrink-0
                      ${filter === f.key
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
                      }
                    `}
                  >
                    {f.label}
                    <span className={`
                      inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold
                      ${filter === f.key ? 'bg-white/20' : 'bg-border'}
                    `}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active filters */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-0.5 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Filter:</span>
                {debiturFilter.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {name}
                    <button onClick={() => toggleDebitur(name)} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </span>
                ))}
                {filter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {filter}
                    <button onClick={() => setFilter('all')} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {jenisTempo !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {jenisTempo}
                    <button onClick={() => setJenisTempo('all')} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
                {sortMode !== 'terbaru' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {SORT_OPTIONS.find(o => o.key === sortMode)?.label}
                    <button onClick={() => setSortMode('terbaru')} className="hover:text-destructive"><X className="w-2.5 h-2.5" /></button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ── Table / Cards ────────────────────────────────────────────────── */}
          <TagihanList
            data={filtered}
            isLoading={isLoading}
            onEdit={t  => { setEditItem(t);  setFormOpen(true); }}
            onDelete={t => { setDeleteItem(t); setDeleteOpen(true); }}
            onView={t  => setViewItem(t)}
            onAdd={()  => { setEditItem(null); setFormOpen(true); }}
            onQuickPay={t => { setQuickPayFull(false); setQuickPayItem(t); }}
          />
        </div>
      )}

      {/* ══ Form Modal ═══════════════════════════════════════════════════════ */}
      <TagihanForm
        open={formOpen}
        onOpenChange={v => { setFormOpen(v); if (!v) setEditItem(null); }}
        editItem={editItem}
        onSubmit={handleFormSubmit}
        isPending={createMut.isPending || updateMut.isPending}
      />

      {/* ══ Quick Pay Modal ═══════════════════════════════════════════════════ */}
      <Dialog open={!!quickPayItem} onOpenChange={v => { if (!v) setQuickPayItem(null); }}>
        <DialogContent className="sm:max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-base">
              <CreditCard className="w-5 h-5 text-primary" /> Catat Pembayaran
            </DialogTitle>
            <DialogDescription className="text-xs">
              {quickPayItem?.debitur_nama} — {quickPayItem?.barang_nama}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => { e.preventDefault(); if (quickPayAmount > 0 && quickPayItem) quickPayMut.mutate(); }}
            className="space-y-4 mt-2"
          >
            <div className="flex gap-2">
              <button type="button" onClick={() => setQuickPayFull(false)} className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${!quickPayFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
                Cicilan
              </button>
              <button type="button" onClick={() => setQuickPayFull(true)} className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${quickPayFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
                Lunasi Semua
              </button>
            </div>
            <div>
              <label className="label-text mb-1.5 block">Jumlah Bayar *</label>
              <CurrencyInput value={quickPayAmount} onChange={setQuickPayAmount} placeholder="300.000" />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Tanggal Bayar</label>
              <input type="date" value={quickPayDate} onChange={e => setQuickPayDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Keterangan</label>
              <input type="text" value={quickPayNote} onChange={e => setQuickPayNote(e.target.value)} className={inputClass} maxLength={200} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setQuickPayItem(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">
                Batal
              </button>
              <button type="submit" disabled={quickPayMut.isPending} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
                {quickPayMut.isPending ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ══ Delete Confirm ════════════════════════════════════════════════════ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive text-base">Hapus Tagihan</DialogTitle>
            <DialogDescription className="text-xs">
              Hapus "{deleteItem?.debitur_nama} — {deleteItem?.barang_nama}"? Semua struk dan history terkait juga akan terhapus.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">
              Batal
            </button>
            <button
              onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)}
              disabled={deleteMut.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {deleteMut.isPending ? 'Menghapus…' : 'Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}