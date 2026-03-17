import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import { Plus, Search, Pill, AlertCircle, Clock, Trash2, ShieldAlert, Edit2, MoreVertical, Filter, X, SlidersHorizontal, Eye } from 'lucide-react';
import { obatService } from '@/lib/supabase-service';
import type { ObatItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ExportMenu from '@/components/shared/ExportMenu';
import { useBackGesture } from '@/hooks/useBackGesture';

const obatTypes = ['Analgesik', 'Antibiotik', 'Antasida', 'Antihistamin', 'Suplemen', 'Vitamin', 'Anti-inflamasi', 'Antiseptik', 'Lainnya'];
const emptyForm = { name: '', type: 'Lainnya', dosage: '', usage_info: '', notes: '', frequency: '', side_effects: '' };

type SortMode = 'terbaru' | 'nama_az' | 'tipe';

const Obat = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [freqFilter, setFreqFilter] = useState<'all' | 'rutin' | 'lainnya'>('all');
  const [sortMode, setSortMode] = useState<SortMode>('terbaru');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editItem, setEditItem] = useState<ObatItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ObatItem | null>(null);
  const [detailItem, setDetailItem] = useState<ObatItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useBackGesture(modalOpen, () => setModalOpen(false), 'obat-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'obat-delete');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'obat-detail');

  const { data: obatList = [], isLoading } = useQuery({ queryKey: ['obat'], queryFn: obatService.getAll });

  const createMut = useMutation({
    mutationFn: (row: Partial<ObatItem>) => obatService.create(row),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['obat'] }); setModalOpen(false); toast({ title: 'Berhasil', description: 'Obat berhasil ditambahkan.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...row }: Partial<ObatItem> & { id: string }) => obatService.update(id, row),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['obat'] }); setModalOpen(false); toast({ title: 'Berhasil', description: 'Obat berhasil diperbarui.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => obatService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['obat'] }); setDeleteOpen(false); toast({ title: 'Berhasil', description: 'Obat berhasil dihapus.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(containerRef.current.querySelectorAll('.obat-card'),
        { opacity: 0, y: 20, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.05, duration: 0.4, ease: 'back.out(1.2)' }
      );
    }
  }, [search, obatList, typeFilter, freqFilter, sortMode]);

  useEffect(() => {
    if (!openMenuId) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.card-action-menu')) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('touchstart', handler); };
  }, [openMenuId]);

  const filtered = useMemo(() => {
    let result = obatList.filter(o => {
      const matchSearch = o.name.toLowerCase().includes(search.toLowerCase()) ||
        o.type.toLowerCase().includes(search.toLowerCase()) ||
        o.usage_info.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || o.type === typeFilter;
      const matchFreq = freqFilter === 'all' ||
        (freqFilter === 'rutin' && o.frequency.includes('sehari')) ||
        (freqFilter === 'lainnya' && !o.frequency.includes('sehari'));
      return matchSearch && matchType && matchFreq;
    });
    switch (sortMode) {
      case 'nama_az': result = [...result].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'tipe': result = [...result].sort((a, b) => a.type.localeCompare(b.type)); break;
    }
    return result;
  }, [obatList, search, typeFilter, freqFilter, sortMode]);

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (item: ObatItem) => {
    setEditItem(item);
    setForm({ name: item.name, type: item.type, dosage: item.dosage, usage_info: item.usage_info, notes: item.notes || '', frequency: item.frequency, side_effects: item.side_effects || '' });
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editItem) { updateMut.mutate({ id: editItem.id, ...form }); }
    else { createMut.mutate(form); }
  };

  const handleImport = async (items: any[]) => {
    for (const item of items) { const { id, user_id, created_at, ...rest } = item; await obatService.create(rest); }
    queryClient.invalidateQueries({ queryKey: ['obat'] });
    toast({ title: 'Import Berhasil', description: `${items.length} obat berhasil diimpor.` });
  };

  const uniqueTypes = Array.from(new Set(obatList.map(o => o.type)));
  const activeFilterCount = [typeFilter !== 'all', freqFilter !== 'all', sortMode !== 'terbaru'].filter(Boolean).length;

  return (
    <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-header">List Obat 💊</h1>
          <p className="page-subtitle">Arsip obat-obatan penting beserta dosis, kegunaan, dan efek samping.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportMenu data={obatList} filename="obat-livoria" onImport={handleImport} />
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shrink-0">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl bg-pastel-yellow/50 border border-warning/10 mb-6">
        <ShieldAlert className="w-5 h-5 text-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">Informasi Penting</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">Data obat hanya untuk catatan pribadi. Selalu konsultasikan penggunaan obat dengan dokter atau apoteker.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        <div className="stat-card text-center p-3 sm:p-4">
          <Pill className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-base sm:text-lg font-bold font-display">{obatList.length}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Total Obat</p>
        </div>
        <div className="stat-card text-center p-3 sm:p-4">
          <p className="text-base sm:text-lg font-bold font-display">{new Set(obatList.map(o => o.type)).size}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Kategori</p>
        </div>
        <div className="stat-card text-center p-3 sm:p-4">
          <p className="text-base sm:text-lg font-bold font-display">{obatList.filter(o => o.frequency.includes('sehari')).length}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Rutin Harian</p>
        </div>
        <div className="stat-card text-center p-3 sm:p-4">
          <p className="text-base sm:text-lg font-bold font-display">{obatList.filter(o => o.side_effects).length}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Efek Samping</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama obat, tipe, atau kegunaan..." className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setFreqFilter(freqFilter === 'all' ? 'rutin' : freqFilter === 'rutin' ? 'lainnya' : 'all')}
              className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all ${freqFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
              {freqFilter === 'all' ? 'Semua Frekuensi' : freqFilter === 'rutin' ? '⏰ Rutin Harian' : '📋 Lainnya'}
            </button>
            <div className="relative">
              <button onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-input bg-background text-xs font-medium hover:bg-muted transition-all">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Urutkan</span>
              </button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[140px] animate-scale-in">
                    {([['terbaru', 'Terbaru'], ['nama_az', 'Nama (A-Z)'], ['tipe', 'Kategori']] as const).map(([k, l]) => (
                      <button key={k} onClick={() => { setSortMode(k); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted ${sortMode === k ? 'font-semibold text-primary' : ''}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setTypeFilter('all')} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${typeFilter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
            Semua ({obatList.length})
          </button>
          {uniqueTypes.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)} className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${typeFilter === t ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {t} ({obatList.filter(o => o.type === t).length})
            </button>
          ))}
        </div>
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter aktif:</span>
            {typeFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {typeFilter} <button onClick={() => setTypeFilter('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {freqFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {freqFilter} <button onClick={() => setFreqFilter('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Pill className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada obat yang tercatat.</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary font-medium hover:underline">+ Tambah obat pertama</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(obat => {
            const menuOpen = openMenuId === obat.id;
            return (
              <div key={obat.id} className="obat-card stat-card group cursor-pointer relative" onClick={() => { setDetailItem(obat); setDetailOpen(true); }}>
                <button onClick={e => { e.stopPropagation(); setDeleteItem(obat); setDeleteOpen(true); }} className="absolute top-4 right-4 p-1.5 rounded-md bg-card/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-destructive/10 z-10 hidden md:flex">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </button>
                <div className="absolute top-4 right-4 md:hidden card-action-menu z-10">
                  <button onClick={e => { e.stopPropagation(); setOpenMenuId(menuOpen ? null : obat.id); }}
                    className="p-1.5 rounded-md bg-card/80 backdrop-blur-sm">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px] animate-scale-in">
                      <button onClick={e => { e.stopPropagation(); setDetailItem(obat); setDetailOpen(true); setOpenMenuId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                      <button onClick={e => { e.stopPropagation(); openEdit(obat); setOpenMenuId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteItem(obat); setDeleteOpen(true); setOpenMenuId(null); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors text-destructive">
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pastel-green flex items-center justify-center shrink-0">
                    <Pill className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-foreground">{obat.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{obat.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{obat.usage_info || 'Kegunaan belum diisi'}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {obat.dosage || '-'}</span>
                      <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {obat.frequency || '-'}</span>
                    </div>
                    {obat.side_effects && (
                      <p className="text-xs text-warning mt-2 inline-flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> {obat.side_effects}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Pill className="w-5 h-5 text-success" /> {detailItem?.name}
            </DialogTitle>
            <DialogDescription>{detailItem?.type}</DialogDescription>
          </DialogHeader>
          {detailItem && (
            <div className="space-y-3 mt-2 text-sm">
              <div><span className="text-xs text-muted-foreground block">Kegunaan</span><p>{detailItem.usage_info || '-'}</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-xs text-muted-foreground block">Dosis</span><p>{detailItem.dosage || '-'}</p></div>
                <div><span className="text-xs text-muted-foreground block">Frekuensi</span><p>{detailItem.frequency || '-'}</p></div>
              </div>
              {detailItem.side_effects && <div><span className="text-xs text-muted-foreground block">Efek Samping</span><p className="text-warning">{detailItem.side_effects}</p></div>}
              {detailItem.notes && <div><span className="text-xs text-muted-foreground block">Catatan</span><p>{detailItem.notes}</p></div>}
              <div className="flex gap-2 pt-2 border-t border-border">
                <button onClick={() => { setDetailOpen(false); openEdit(detailItem); }} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setDetailOpen(false); setDeleteItem(detailItem); setDeleteOpen(true); }} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all">
                  <Trash2 className="w-3.5 h-3.5" /> Hapus
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editItem ? 'Edit Obat' : 'Tambah Obat Baru'}</DialogTitle>
            <DialogDescription>{editItem ? 'Perbarui informasi obat.' : 'Isi detail obat yang ingin dicatat untuk arsip kesehatan.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nama Obat *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="cth: Paracetamol" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Tipe/Kategori</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all">
                  {obatTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Dosis</label>
                <input type="text" value={form.dosage} onChange={e => setForm({ ...form, dosage: e.target.value })} placeholder="cth: 500mg" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Kegunaan / Indikasi</label>
              <input type="text" value={form.usage_info} onChange={e => setForm({ ...form, usage_info: e.target.value })} placeholder="cth: Demam, sakit kepala" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Frekuensi Penggunaan</label>
              <input type="text" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })} placeholder="cth: 3x sehari" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Efek Samping</label>
              <input type="text" value={form.side_effects} onChange={e => setForm({ ...form, side_effects: e.target.value })} placeholder="cth: Dapat menyebabkan kantuk" className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Catatan Tambahan</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan penting tentang obat ini..." rows={2} className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all resize-none" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                {createMut.isPending || updateMut.isPending ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Hapus Obat</DialogTitle>
            <DialogDescription>Yakin hapus "{deleteItem?.name}" dari arsip?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
            <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending} className="px-4 py-2 rounded-lg text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Obat;
