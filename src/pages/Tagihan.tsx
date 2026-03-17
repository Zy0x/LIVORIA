import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import { Plus, Search, CreditCard, Filter, X, ChevronDown, Calculator, SlidersHorizontal, BarChart3, FileText, Check } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { tagihanService, historyService, strukService, recordPayment } from '@/lib/supabase-service';
import { toast } from '@/hooks/use-toast';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useBackGesture } from '@/hooks/useBackGesture';
import type { Tagihan, TagihanStatus } from '@/lib/types';

import TagihanCalendar from '@/components/tagihan/TagihanCalendar';
import TagihanList from '@/components/tagihan/TagihanList';
import TagihanForm from '@/components/tagihan/TagihanForm';
import TagihanDetail from '@/components/tagihan/TagihanDetail';
import TagihanExport from '@/components/tagihan/TagihanExport';
import TagihanCalculator from '@/components/tagihan/TagihanCalculator';
import TagihanMonthlyReport from '@/components/tagihan/TagihanMonthlyReport';
import TagihanAnalytics from '@/components/tagihan/TagihanAnalytics';
import { getPaymentInfo } from '@/lib/tagihan-cycle';

type FilterStatus = 'all' | TagihanStatus;
type SortMode = 'terbaru' | 'sisa_terbesar' | 'jatuh_tempo' | 'nama_az';
type SubPage = 'tagihan' | 'laporan' | 'kalkulator';

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const TagihanPage = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const [subPage, setSubPage] = useState<SubPage>('tagihan');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [debiturFilter, setDebiturFilter] = useState<string[]>([]);
  const [showDebiturDropdown, setShowDebiturDropdown] = useState(false);
  const [debiturSearch, setDebiturSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('terbaru');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [jenisTempo, setJenisTempo] = useState<'all' | 'bulanan' | 'berjangka'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Tagihan | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Tagihan | null>(null);
  const [viewItem, setViewItem] = useState<Tagihan | null>(null);
  const [calendarItems, setCalendarItems] = useState<Tagihan[]>([]);
  const [calendarDate, setCalendarDate] = useState<string | null>(null);

  // Quick pay state
  const [quickPayItem, setQuickPayItem] = useState<Tagihan | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState(0);
  const [quickPayDate, setQuickPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [quickPayNote, setQuickPayNote] = useState('');
  const [quickPayFull, setQuickPayFull] = useState(false);

  const { data: bills = [], isLoading } = useQuery({ queryKey: ['tagihan'], queryFn: tagihanService.getAll });

  // KRUSIAL: Sinkronisasi viewItem saat data bills berubah (setelah edit/payment)
  // Ini memastikan detail tagihan selalu menampilkan data terkini
  useEffect(() => {
    if (viewItem && bills.length > 0) {
      const updated = bills.find(b => b.id === viewItem.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(viewItem)) {
        setViewItem(updated);
      }
    }
  }, [bills]);

  useBackGesture(formOpen, () => setFormOpen(false), 'tagihan-form');
  useBackGesture(!!viewItem, () => setViewItem(null), 'tagihan-detail');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'tagihan-delete');
  useBackGesture(!!quickPayItem, () => setQuickPayItem(null), 'tagihan-quickpay');

  useEffect(() => {
    const state = location.state as any;
    if (state?.viewItem) {
      // Cari data terbaru dari bills, jangan pakai data lama dari state
      const fresh = bills.find(b => b.id === state.viewItem.id) || state.viewItem;
      setViewItem(fresh);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, bills]);

  const createMut = useMutation({
    mutationFn: async ({ data, files }: { data: Partial<Tagihan>; files?: File[] }) => {
      const created = await tagihanService.create(data);
      if (files && files.length > 0) {
        await Promise.all(files.map(f => strukService.upload(f, created.id, 'Struk awal')));
      }
      await historyService.create({ tagihan_id: created.id, aksi: 'dibuat', detail: `Tagihan baru: ${created.barang_nama} untuk ${created.debitur_nama}${files?.length ? ` (${files.length} struk)` : ''}` });
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
      await historyService.create({ tagihan_id: updated.id, aksi: 'diperbarui', detail: `Data tagihan diperbarui` });
      // Invalidate dulu
      await queryClient.invalidateQueries({ queryKey: ['tagihan'] });
      setFormOpen(false);
      setEditItem(null);
      // Jika sedang view item yang diedit, update viewItem ke data terbaru
      if (viewItem && viewItem.id === updated.id) {
        setViewItem(updated);
      }
      toast({ title: 'Berhasil', description: 'Tagihan berhasil diperbarui.' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => tagihanService.delete(id),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['tagihan'] });
      setDeleteOpen(false);
      setDeleteItem(null);
      // Jika sedang view item yang dihapus, kembali ke daftar
      if (viewItem && viewItem.id === deletedId) {
        setViewItem(null);
      }
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

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(containerRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5 });
    }
  }, []);

  useEffect(() => {
    if (quickPayItem) {
      const info = getPaymentInfo(quickPayItem, new Date());
      setQuickPayNote(info.note);
      setQuickPayAmount(quickPayFull ? Number(quickPayItem.sisa_hutang) : Number(quickPayItem.cicilan_per_bulan));
      setQuickPayDate(new Date().toISOString().split('T')[0]);
    }
  }, [quickPayItem, quickPayFull]);

  const uniqueDebiturs = useMemo(() => {
    return Array.from(new Set(bills.map(b => b.debitur_nama))).sort();
  }, [bills]);

  const filteredDebiturs = useMemo(() => {
    if (!debiturSearch.trim()) return uniqueDebiturs;
    const q = debiturSearch.toLowerCase();
    return uniqueDebiturs.filter(d => d.toLowerCase().includes(q));
  }, [uniqueDebiturs, debiturSearch]);

  const toggleDebitur = (name: string) => {
    setDebiturFilter(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const filtered = useMemo(() => {
    let result = bills.filter(b => {
      const matchFilter = filter === 'all' || b.status === filter;
      const matchSearch = b.debitur_nama.toLowerCase().includes(search.toLowerCase()) ||
        b.barang_nama.toLowerCase().includes(search.toLowerCase());
      const matchDebitur = debiturFilter.length === 0 || debiturFilter.includes(b.debitur_nama);
      const matchJenis = jenisTempo === 'all' || b.jenis_tempo === jenisTempo;
      return matchFilter && matchSearch && matchDebitur && matchJenis;
    });
    switch (sortMode) {
      case 'sisa_terbesar': result = [...result].sort((a, b) => Number(b.sisa_hutang) - Number(a.sisa_hutang)); break;
      case 'jatuh_tempo': result = [...result].sort((a, b) => {
        const dateA = a.tanggal_jatuh_tempo ? new Date(a.tanggal_jatuh_tempo).getTime() : Infinity;
        const dateB = b.tanggal_jatuh_tempo ? new Date(b.tanggal_jatuh_tempo).getTime() : Infinity;
        return dateA - dateB;
      }); break;
      case 'nama_az': result = [...result].sort((a, b) => a.debitur_nama.localeCompare(b.debitur_nama)); break;
    }
    return result;
  }, [bills, filter, search, debiturFilter, jenisTempo, sortMode]);

  const handleFormSubmit = (data: Partial<Tagihan>, files?: File[]) => {
    if (editItem) updateMut.mutate({ id: editItem.id, ...data });
    else createMut.mutate({ data, files });
  };

  // Handler untuk edit dari detail - buka form edit dan kembali ke form
  const handleEditFromDetail = useCallback((item: Tagihan) => {
    setEditItem(item);
    setFormOpen(true);
  }, []);

  // Handler untuk delete dari detail
  const handleDeleteFromDetail = useCallback((item: Tagihan) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  }, []);

  const handleCalendarSelect = (date: string, items: Tagihan[]) => {
    setCalendarDate(date);
    setCalendarItems(items);
  };

  if (viewItem) {
    // Selalu gunakan data terbaru dari bills
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
        {/* Form edit bisa muncul di atas detail */}
        <TagihanForm
          open={formOpen}
          onOpenChange={(v) => {
            setFormOpen(v);
            if (!v) setEditItem(null);
          }}
          editItem={editItem}
          onSubmit={handleFormSubmit}
          isPending={updateMut.isPending}
        />
        {/* Delete confirm */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="font-display text-destructive text-base">Hapus Tagihan</DialogTitle>
              <DialogDescription className="text-xs">Hapus tagihan "{deleteItem?.debitur_nama} — {deleteItem?.barang_nama}"? Semua struk dan history terkait juga akan terhapus.</DialogDescription>
            </DialogHeader>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">Batal</button>
              <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
                {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const filters: { key: FilterStatus; label: string; count: number }[] = [
    { key: 'all', label: 'Semua', count: bills.length },
    { key: 'aktif', label: 'Aktif', count: bills.filter(b => b.status === 'aktif').length },
    { key: 'overdue', label: 'Overdue', count: bills.filter(b => b.status === 'overdue').length },
    { key: 'lunas', label: 'Lunas', count: bills.filter(b => b.status === 'lunas').length },
    { key: 'ditunda', label: 'Ditunda', count: bills.filter(b => b.status === 'ditunda').length },
  ];

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: 'terbaru', label: 'Terbaru' },
    { key: 'sisa_terbesar', label: 'Sisa Terbesar' },
    { key: 'jatuh_tempo', label: 'Jatuh Tempo' },
    { key: 'nama_az', label: 'Nama (A-Z)' },
  ];

  const activeFilterCount = [debiturFilter.length > 0, filter !== 'all', jenisTempo !== 'all', sortMode !== 'terbaru'].filter(Boolean).length;
  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";

  const subPages: { key: SubPage; label: string; icon: any }[] = [
    { key: 'tagihan', label: 'Daftar Tagihan', icon: CreditCard },
    { key: 'laporan', label: 'Laporan', icon: FileText },
    { key: 'kalkulator', label: 'Kalkulator', icon: Calculator },
  ];

  return (
    <div ref={containerRef}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h1 className="page-header">Manajemen Tagihan 💰</h1>
          <p className="page-subtitle">Tracking pinjaman, cicilan, keuntungan, dan pembayaran debitur.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <TagihanExport data={bills} onImportDone={() => queryClient.invalidateQueries({ queryKey: ['tagihan'] })} />
          <button onClick={() => { setEditItem(null); setFormOpen(true); }} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shrink-0 min-h-[44px]">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      {/* Sub-page tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {subPages.map(sp => {
          const Icon = sp.icon;
          return (
            <button key={sp.key} onClick={() => setSubPage(sp.key)}
              className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[40px] ${
                subPage === sp.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {sp.label}
            </button>
          );
        })}
      </div>

      {/* Sub-page: Laporan */}
      {subPage === 'laporan' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <TagihanCalendar data={bills} onSelectDate={handleCalendarSelect} />
            </div>
            <div className="glass-card p-4 sm:p-5">
              <h3 className="section-title mb-3">
                {calendarDate ? `Tagihan ${new Date(calendarDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Pilih tanggal di kalender'}
              </h3>
              {calendarItems.length === 0 ? (
                <p className="helper-text">{calendarDate ? 'Tidak ada tagihan pada tanggal ini.' : 'Klik tanggal untuk melihat tagihan yang jatuh tempo.'}</p>
              ) : (
                <div className="space-y-2">
                  {calendarItems.map(t => (
                    <button key={t.id} onClick={() => setViewItem(t)} className="w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-accent transition-colors min-h-[44px]">
                      <p className="text-sm font-semibold text-foreground">{t.debitur_nama}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t.barang_nama} · {fmt(Number(t.cicilan_per_bulan))}/bln</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <TagihanMonthlyReport data={bills} onView={t => setViewItem(t)} />
          <TagihanAnalytics data={bills} />
        </div>
      )}

      {/* Sub-page: Kalkulator */}
      {subPage === 'kalkulator' && (
        <TagihanCalculator open={true} onOpenChange={() => setSubPage('tagihan')} allTagihan={bills} />
      )}

      {/* Sub-page: Daftar Tagihan */}
      {subPage === 'tagihan' && (
        <>
          {/* Search & Filters */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari debitur atau barang..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
              </div>
              <div className="flex gap-2 flex-wrap">
                {uniqueDebiturs.length > 1 && (
                  <div className="relative">
                    <button onClick={() => setShowDebiturDropdown(!showDebiturDropdown)}
                      className={`inline-flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm hover:bg-muted transition-all min-w-[120px] min-h-[44px] ${debiturFilter.length > 0 ? 'border-primary bg-primary/5' : 'border-input bg-background'}`}>
                      <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="truncate text-xs">{debiturFilter.length === 0 ? 'Debitur' : `${debiturFilter.length} dipilih`}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-auto" />
                    </button>
                    {showDebiturDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setShowDebiturDropdown(false); setDebiturSearch(''); }} />
                        <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[220px] max-h-72 overflow-hidden animate-scale-in">
                          <div className="px-3 py-2 border-b border-border">
                            <input type="text" value={debiturSearch} onChange={e => setDebiturSearch(e.target.value)} placeholder="Cari debitur..."
                              className="w-full px-2.5 py-1.5 rounded-lg border border-input bg-background text-xs focus:outline-none" autoFocus />
                          </div>
                          <div className="overflow-y-auto max-h-52">
                            <button onClick={() => { setDebiturFilter([]); setShowDebiturDropdown(false); setDebiturSearch(''); }}
                              className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors ${debiturFilter.length === 0 ? 'font-semibold text-primary' : ''}`}>
                              Semua Debitur ({bills.length})
                            </button>
                            {filteredDebiturs.map(name => {
                              const isSelected = debiturFilter.includes(name);
                              return (
                                <button key={name} onClick={() => toggleDebitur(name)}
                                  className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors truncate flex items-center gap-2 ${isSelected ? 'font-semibold text-primary' : ''}`}>
                                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-input'}`}>
                                    {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                                  </span>
                                  <span className="truncate">{name} ({bills.filter(b => b.debitur_nama === name).length})</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <button onClick={() => {
                  const next = jenisTempo === 'all' ? 'bulanan' : jenisTempo === 'bulanan' ? 'berjangka' : 'all';
                  setJenisTempo(next);
                }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all min-h-[44px] ${jenisTempo !== 'all' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
                  {jenisTempo === 'all' ? 'Semua Jenis' : jenisTempo === 'bulanan' ? '🔄 Bulanan' : '📅 Berjangka'}
                </button>
                <div className="relative">
                  <button onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium hover:bg-muted transition-all min-h-[44px]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="hidden sm:inline">Urutkan</span>
                  </button>
                  {showSortDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[150px] animate-scale-in">
                        {sortOptions.map(opt => (
                          <button key={opt.key} onClick={() => { setSortMode(opt.key); setShowSortDropdown(false); }}
                            className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors ${sortMode === opt.key ? 'font-semibold text-primary' : ''}`}>
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {filters.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)} className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[40px] ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {f.label} ({f.count})
                </button>
              ))}
            </div>
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">Filter aktif:</span>
                {debiturFilter.map(name => (
                  <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {name}<button onClick={() => toggleDebitur(name)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
                {filter !== 'all' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{filter}<button onClick={() => setFilter('all')}><X className="w-3 h-3" /></button></span>}
                {jenisTempo !== 'all' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{jenisTempo}<button onClick={() => setJenisTempo('all')}><X className="w-3 h-3" /></button></span>}
                {sortMode !== 'terbaru' && <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">{sortOptions.find(o => o.key === sortMode)?.label}<button onClick={() => setSortMode('terbaru')}><X className="w-3 h-3" /></button></span>}
              </div>
            )}
          </div>

          <TagihanList
            data={filtered}
            isLoading={isLoading}
            onEdit={t => { setEditItem(t); setFormOpen(true); }}
            onDelete={t => { setDeleteItem(t); setDeleteOpen(true); }}
            onView={t => setViewItem(t)}
            onAdd={() => { setEditItem(null); setFormOpen(true); }}
            onQuickPay={t => { setQuickPayFull(false); setQuickPayItem(t); }}
          />
        </>
      )}

      {/* Form Modal */}
      <TagihanForm
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditItem(null);
        }}
        editItem={editItem}
        onSubmit={handleFormSubmit}
        isPending={createMut.isPending || updateMut.isPending}
      />

      {/* Quick Pay Modal */}
      <Dialog open={!!quickPayItem} onOpenChange={v => { if (!v) setQuickPayItem(null); }}>
        <DialogContent className="sm:max-w-sm max-h-[calc(100vh-2rem)] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-base"><CreditCard className="w-5 h-5" /> Catat Pembayaran</DialogTitle>
            <DialogDescription className="text-xs">{quickPayItem?.debitur_nama} — {quickPayItem?.barang_nama}</DialogDescription>
          </DialogHeader>
          <form onSubmit={e => { e.preventDefault(); if (quickPayAmount > 0 && quickPayItem) quickPayMut.mutate(); }} className="space-y-4 mt-2">
            <div className="flex gap-2">
              <button type="button" onClick={() => setQuickPayFull(false)}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${!quickPayFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
                Cicilan ({quickPayItem ? fmt(Number(quickPayItem.cicilan_per_bulan)) : '-'})
              </button>
              <button type="button" onClick={() => setQuickPayFull(true)}
                className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${quickPayFull ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
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
              <button type="button" onClick={() => setQuickPayItem(null)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">Batal</button>
              <button type="submit" disabled={quickPayMut.isPending} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
                {quickPayMut.isPending ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive text-base">Hapus Tagihan</DialogTitle>
            <DialogDescription className="text-xs">Hapus tagihan "{deleteItem?.debitur_nama} — {deleteItem?.barang_nama}"? Semua struk dan history terkait juga akan terhapus.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">Batal</button>
            <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TagihanPage;