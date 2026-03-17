import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import { Plus, Search, Heart, ImageIcon, Filter, X, SlidersHorizontal, Star } from 'lucide-react';
import { waifuService, animeService, donghuaService, uploadImage } from '@/lib/supabase-service';
import type { WaifuItem } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ExportMenu from '@/components/shared/ExportMenu';
import MediaCard from '@/components/shared/MediaCard';
import { useBackGesture } from '@/hooks/useBackGesture';

const tierColors: Record<string, string> = {
  S: 'bg-pastel-yellow text-warning font-bold',
  A: 'bg-pastel-green text-success font-bold',
  B: 'bg-pastel-blue text-info font-bold',
  C: 'bg-muted text-muted-foreground font-bold',
};

const tierDescriptions: Record<string, string> = {
  S: 'Best of the Best — Waifu terbaik sepanjang masa',
  A: 'Sangat Bagus — Waifu favorit tingkat tinggi',
  B: 'Bagus — Waifu yang cukup menarik',
  C: 'Biasa — Waifu yang dicatat saja',
};

const emptyForm: { name: string; source: string; source_type: 'anime' | 'donghua'; tier: 'S' | 'A' | 'B' | 'C'; image_url: string; notes: string } = { name: '', source: '', source_type: 'anime', tier: 'B', image_url: '', notes: '' };

type SortMode = 'terbaru' | 'nama_az' | 'tier';
type TierFilter = 'all' | 'S' | 'A' | 'B' | 'C';

const Waifu = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<'all' | 'anime' | 'donghua'>('all');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('terbaru');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<WaifuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<WaifuItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sourceSearch, setSourceSearch] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  useBackGesture(modalOpen, () => setModalOpen(false), 'waifu-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'waifu-delete');

  const { data: waifuList = [], isLoading } = useQuery({ queryKey: ['waifu'], queryFn: waifuService.getAll });
  const { data: animeList = [] } = useQuery({ queryKey: ['anime'], queryFn: animeService.getAll });
  const { data: donghuaList = [] } = useQuery({ queryKey: ['donghua'], queryFn: donghuaService.getAll });

  const sourceTitles = useMemo(() => {
    const titles: { title: string; type: 'anime' | 'donghua' }[] = [];
    animeList.forEach(a => titles.push({ title: a.title, type: 'anime' }));
    donghuaList.forEach(d => titles.push({ title: d.title, type: 'donghua' }));
    return titles.sort((a, b) => a.title.localeCompare(b.title));
  }, [animeList, donghuaList]);

  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return sourceTitles;
    const q = sourceSearch.toLowerCase();
    return sourceTitles.filter(s => s.title.toLowerCase().includes(q));
  }, [sourceTitles, sourceSearch]);

  const createMut = useMutation({
    mutationFn: async (row: Partial<WaifuItem>) => {
      let image_url = row.image_url || '';
      if (imageFile) { setUploading(true); image_url = await uploadImage('waifu-images', imageFile, 'waifu'); setUploading(false); }
      return waifuService.create({ ...row, image_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['waifu'] }); setModalOpen(false); setImageFile(null); setImagePreview(''); toast({ title: 'Berhasil', description: 'Waifu berhasil ditambahkan.' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<WaifuItem> & { id: string }) => {
      let image_url = row.image_url || '';
      if (imageFile) { setUploading(true); image_url = await uploadImage('waifu-images', imageFile, 'waifu'); setUploading(false); }
      return waifuService.update(id, { ...row, image_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['waifu'] }); setModalOpen(false); setImageFile(null); setImagePreview(''); toast({ title: 'Berhasil', description: 'Waifu berhasil diperbarui.' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => waifuService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['waifu'] }); setDeleteOpen(false); toast({ title: 'Berhasil', description: 'Waifu berhasil dihapus.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(containerRef.current.querySelectorAll('.media-card'),
        { opacity: 0, y: 20, rotateX: 5, scale: 0.95 },
        { opacity: 1, y: 0, rotateX: 0, scale: 1, stagger: 0.04, duration: 0.45, ease: 'back.out(1.2)' }
      );
    }
  }, [filter, search, waifuList, tierFilter, sortMode]);

  const filtered = useMemo(() => {
    let result = waifuList.filter(w => {
      const matchFilter = filter === 'all' || w.source_type === filter;
      const matchSearch = w.name.toLowerCase().includes(search.toLowerCase()) || w.source.toLowerCase().includes(search.toLowerCase());
      const matchTier = tierFilter === 'all' || w.tier === tierFilter;
      return matchFilter && matchSearch && matchTier;
    });
    switch (sortMode) {
      case 'nama_az': result = [...result].sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'tier': result = [...result].sort((a, b) => {
        const order = { S: 0, A: 1, B: 2, C: 3 };
        return (order[a.tier] || 9) - (order[b.tier] || 9);
      }); break;
    }
    return result;
  }, [waifuList, filter, search, tierFilter, sortMode]);

  const openAdd = () => {
    setEditItem(null); setForm(emptyForm); setImageFile(null);
    setImagePreview(''); setSourceSearch(''); setModalOpen(true);
  };

  const openEdit = (item: WaifuItem) => {
    setEditItem(item);
    setForm({ name: item.name, source: item.source, source_type: item.source_type, tier: item.tier, image_url: item.image_url || '', notes: item.notes || '' });
    setImagePreview(item.image_url || ''); setImageFile(null);
    setSourceSearch(item.source || ''); setModalOpen(true);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editItem) updateMut.mutate({ id: editItem.id, ...form });
    else createMut.mutate(form);
  };

  const handleImport = async (items: any[]) => {
    for (const item of items) { const { id, user_id, created_at, ...rest } = item; await waifuService.create(rest); }
    queryClient.invalidateQueries({ queryKey: ['waifu'] });
    toast({ title: 'Import Berhasil', description: `${items.length} waifu berhasil diimpor.` });
  };

  const tierStats = { S: waifuList.filter(w => w.tier === 'S').length, A: waifuList.filter(w => w.tier === 'A').length, B: waifuList.filter(w => w.tier === 'B').length, C: waifuList.filter(w => w.tier === 'C').length };
  const activeFilterCount = [filter !== 'all', tierFilter !== 'all', sortMode !== 'terbaru'].filter(Boolean).length;

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";

  return (
    <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-header">Waifu Collection 💕</h1>
          <p className="page-subtitle">Koleksi karakter waifu terbaik dari anime dan donghua.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportMenu data={waifuList} filename="waifu-livoria" onImport={handleImport} />
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shrink-0 min-h-[44px]">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-6">
        {(['S', 'A', 'B', 'C'] as const).map(tier => (
          <button key={tier} onClick={() => setTierFilter(tierFilter === tier ? 'all' : tier)}
            className={`stat-card text-center p-3 sm:p-4 transition-all ${tierFilter === tier ? 'ring-2 ring-primary' : ''}`}>
            <span className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm mb-1 ${tierColors[tier]}`}>{tier}</span>
            <p className="text-base sm:text-lg font-bold font-display">{tierStats[tier]}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">Tier {tier}</p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama waifu atau sumber..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
          </div>
          <div className="relative">
            <button onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium hover:bg-muted transition-all min-h-[44px]">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="hidden sm:inline">Urutkan</span>
            </button>
            {showSortDropdown && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[140px] animate-scale-in">
                  {([['terbaru', 'Terbaru'], ['nama_az', 'Nama (A-Z)'], ['tier', 'Tier (S→C)']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => { setSortMode(k); setShowSortDropdown(false); }}
                      className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted ${sortMode === k ? 'font-semibold text-primary' : ''}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'anime', 'donghua'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[40px] ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {f === 'all' ? `Semua (${waifuList.length})` : f === 'anime' ? `Anime (${waifuList.filter(w => w.source_type === 'anime').length})` : `Donghua (${waifuList.filter(w => w.source_type === 'donghua').length})`}
            </button>
          ))}
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter aktif:</span>
            {tierFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                Tier {tierFilter} <button onClick={() => setTierFilter('all')}><X className="w-3 h-3" /></button>
              </span>
            )}
            {sortMode !== 'terbaru' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {sortMode} <button onClick={() => setSortMode('terbaru')}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada waifu yang tercatat.</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary font-medium hover:underline">+ Tambah waifu pertama</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map(waifu => (
            <MediaCard
              key={waifu.id}
              id={waifu.id}
              title={waifu.name}
              coverUrl={waifu.image_url}
              status="completed"
              type="waifu"
              waifuTier={waifu.tier}
              waifuSource={waifu.source}
              waifuSourceType={waifu.source_type}
              notes={waifu.notes}
              onEdit={() => openEdit(waifu)}
              onDelete={() => { setDeleteItem(waifu); setDeleteOpen(true); }}
            />
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editItem ? 'Edit Waifu' : 'Tambah Waifu Baru'}</DialogTitle>
            <DialogDescription>{editItem ? 'Perbarui informasi waifu.' : 'Tambahkan karakter waifu baru ke koleksimu.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Image upload */}
            <div>
              <label className="label-text mb-1.5 block">Gambar Waifu</label>
              <div className="flex items-center gap-3">
                <div className="w-20 h-[120px] rounded-xl bg-muted flex items-center justify-center overflow-hidden border-2 border-dashed border-border shrink-0 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => imageInputRef.current?.click()}>
                  {imagePreview ? <img src={imagePreview} alt="Waifu" className="w-full h-full object-cover" /> : (
                    <div className="flex flex-col items-center gap-1">
                      <ImageIcon className="w-6 h-6 text-muted-foreground/30" />
                      <span className="text-[9px] text-muted-foreground">Upload</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <button type="button" onClick={() => imageInputRef.current?.click()} className="text-sm text-primary font-medium hover:underline">
                    {imagePreview ? 'Ganti Gambar' : 'Upload Gambar'}
                  </button>
                  <p className="helper-text">Format potrait 2:3 · Max 5MB</p>
                  {imagePreview && (
                    <button type="button" onClick={() => { setImageFile(null); setImagePreview(''); setForm({ ...form, image_url: '' }); }}
                      className="text-xs text-destructive hover:underline">Hapus gambar</button>
                  )}
                </div>
              </div>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>

            {/* Name */}
            <div>
              <label className="label-text mb-1.5 block">Nama Waifu *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="cth: Frieren, Yor Forger" className={inputClass} required />
            </div>

            {/* Source — searchable with auto-fill source_type */}
            <div className="relative">
              <label className="label-text mb-1.5 block">Sumber (Anime / Donghua)</label>
              <input
                type="text"
                value={sourceSearch}
                onChange={e => {
                  setSourceSearch(e.target.value);
                  setForm({ ...form, source: e.target.value });
                  setShowSourceDropdown(true);
                }}
                onFocus={() => setShowSourceDropdown(true)}
                placeholder="Ketik atau pilih judul anime/donghua..."
                className={inputClass}
              />
              {showSourceDropdown && filteredSources.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSourceDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-48 overflow-y-auto animate-scale-in">
                    {filteredSources.map((s, i) => (
                      <button key={`${s.title}-${s.type}-${i}`} type="button"
                        onClick={() => {
                          setForm({ ...form, source: s.title, source_type: s.type });
                          setSourceSearch(s.title);
                          setShowSourceDropdown(false);
                        }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors truncate flex items-center gap-2 ${form.source === s.title ? 'font-semibold text-primary' : ''}`}>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${s.type === 'anime' ? 'bg-pastel-blue text-info' : 'bg-pastel-green text-success'}`}>
                          {s.type === 'anime' ? 'A' : 'D'}
                        </span>
                        <span className="truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="helper-text mt-1">Pilih dari daftar anime/donghua atau ketik manual</p>
            </div>

            {/* Source type + Tier */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Tipe Sumber</label>
                <select value={form.source_type} onChange={e => setForm({ ...form, source_type: e.target.value as any })} className={inputClass}>
                  <option value="anime">Anime</option>
                  <option value="donghua">Donghua</option>
                </select>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Tier</label>
                <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value as any })} className={inputClass}>
                  <option value="S">S — Best of the Best</option>
                  <option value="A">A — Sangat Bagus</option>
                  <option value="B">B — Bagus</option>
                  <option value="C">C — Biasa</option>
                </select>
              </div>
            </div>

            {/* Tier visual selector */}
            <div>
              <label className="label-text mb-2 block">Pilih Tier</label>
              <div className="grid grid-cols-4 gap-2">
                {(['S', 'A', 'B', 'C'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setForm({ ...form, tier: t })}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${form.tier === t ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'}`}>
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-lg ${tierColors[t]}`}>{t}</span>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">
                      {t === 'S' ? 'Terbaik' : t === 'A' ? 'Sangat Bagus' : t === 'B' ? 'Bagus' : 'Biasa'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="label-text mb-1.5 block">Catatan</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Kenapa karakter ini jadi waifu favorit?" rows={3} className={`${inputClass} resize-none`} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">Batal</button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending || uploading} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
                {uploading ? 'Mengupload...' : createMut.isPending || updateMut.isPending ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Hapus Waifu</DialogTitle>
            <DialogDescription>Yakin hapus "{deleteItem?.name}" dari koleksi?</DialogDescription>
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

export default Waifu;