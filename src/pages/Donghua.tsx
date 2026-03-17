import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import { Plus, Search, Film, ImageIcon, Layers, Filter, X, SlidersHorizontal, Heart, Bookmark } from 'lucide-react';
import { donghuaService, uploadImage } from '@/lib/supabase-service';
import type { DonghuaItem } from '@/lib/types';
import { DONGHUA_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ExportMenu from '@/components/shared/ExportMenu';
import GenreSelect from '@/components/shared/GenreSelect';
import MediaCard from '@/components/shared/MediaCard';
import { useBackGesture } from '@/hooks/useBackGesture';

const emptyForm: {
  title: string; status: 'on-going' | 'completed' | 'planned'; genre: string; rating: number; episodes: number;
  episodes_watched: number; cover_url: string; synopsis: string; notes: string;
  season: number; cour: string; streaming_url: string; schedule: string; parent_title: string;
} = {
  title: '', status: 'planned', genre: '', rating: 0, episodes: 0,
  episodes_watched: 0, cover_url: '', synopsis: '', notes: '',
  season: 1, cour: '', streaming_url: '', schedule: '', parent_title: '',
};

type SortMode = 'terbaru' | 'rating' | 'judul_az' | 'episode' | 'jadwal_terdekat';

const getNearestDayDistance = (schedule: string) => {
  if (!schedule) return 999;
  const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  const today = new Date().getDay();
  const scheduleDays = schedule.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  let minDist = 999;
  for (const d of scheduleDays) {
    const idx = days.indexOf(d);
    if (idx === -1) continue;
    let dist = (idx - today + 7) % 7;
    if (dist === 0) dist = 0;
    minDist = Math.min(minDist, dist);
  }
  return minDist;
};

const Donghua = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<'all' | 'on-going' | 'completed' | 'planned'>('all');
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState<string>('all');
  const [sortMode, setSortMode] = useState<SortMode>('terbaru');
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stackViewOpen, setStackViewOpen] = useState(false);
  const [stackViewTitle, setStackViewTitle] = useState('');
  const [stackDetailItem, setStackDetailItem] = useState<DonghuaItem | null>(null);
  const [editItem, setEditItem] = useState<DonghuaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<DonghuaItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [showParentDropdown, setShowParentDropdown] = useState(false);

  useBackGesture(modalOpen, () => setModalOpen(false), 'donghua-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'donghua-delete');
  useBackGesture(stackViewOpen, () => setStackViewOpen(false), 'donghua-stack');

  const { data: donghuaList = [], isLoading } = useQuery({ queryKey: ['donghua'], queryFn: donghuaService.getAll });

  const createMut = useMutation({
    mutationFn: async (row: Partial<DonghuaItem>) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'donghua'); setUploading(false); }
      return donghuaService.create({ ...row, cover_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setModalOpen(false); setCoverFile(null); setCoverPreview(''); toast({ title: 'Berhasil', description: 'Donghua berhasil ditambahkan.' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<DonghuaItem> & { id: string }) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'donghua'); setUploading(false); }
      return donghuaService.update(id, { ...row, cover_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setModalOpen(false); setCoverFile(null); setCoverPreview(''); toast({ title: 'Berhasil', description: 'Donghua berhasil diperbarui.' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => donghuaService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setDeleteOpen(false); toast({ title: 'Berhasil', description: 'Donghua berhasil dihapus.' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (containerRef.current) {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(containerRef.current.querySelectorAll('.media-card'),
        { opacity: 0, y: 20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.04, duration: 0.4, ease: 'back.out(1.2)' }
      );
    }
  }, [filter, search, donghuaList, genreFilter, sortMode]);

  const usedGenres = useMemo(() => {
    const genres = new Set<string>();
    donghuaList.forEach(d => { if (d.genre) d.genre.split(',').map(g => g.trim()).filter(Boolean).forEach(g => genres.add(g)); });
    return Array.from(genres).sort();
  }, [donghuaList]);

  const { displayList, stackCounts } = useMemo(() => {
    const grouped = new Map<string, DonghuaItem[]>();
    const standalone: DonghuaItem[] = [];
    donghuaList.forEach(d => {
      const key = (d.parent_title || d.title).trim().toLowerCase();
      if (d.parent_title) {
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(d);
      } else standalone.push(d);
    });
    const result: DonghuaItem[] = [];
    const counts: Record<string, number> = {};
    standalone.forEach(d => {
      const key = d.title.trim().toLowerCase();
      const group = grouped.get(key);
      if (group) {
        const all = [d, ...group].sort((x, y) => (x.season || 1) - (y.season || 1));
        const latest = all[all.length - 1];
        result.push(latest);
        counts[latest.id] = all.length - 1;
      } else result.push(d);
    });
    grouped.forEach((items, key) => {
      if (!standalone.some(d => d.title.trim().toLowerCase() === key)) {
        const sorted = items.sort((x, y) => (x.season || 1) - (y.season || 1));
        const latest = sorted[sorted.length - 1];
        result.push(latest);
        counts[latest.id] = sorted.length - 1;
      }
    });
    return { displayList: result, stackCounts: counts };
  }, [donghuaList]);

  const filtered = useMemo(() => {
    let result = displayList.filter(d => {
      const matchFilter = filter === 'all' || d.status === filter;
      const matchSearch = d.title.toLowerCase().includes(search.toLowerCase()) || (d.genre || '').toLowerCase().includes(search.toLowerCase());
      const matchGenre = genreFilter === 'all' || (d.genre || '').toLowerCase().includes(genreFilter.toLowerCase());
      return matchFilter && matchSearch && matchGenre;
    });
    switch (sortMode) {
      case 'rating': result = [...result].sort((a, b) => (b.rating || 0) - (a.rating || 0)); break;
      case 'judul_az': result = [...result].sort((a, b) => a.title.localeCompare(b.title)); break;
      case 'episode': result = [...result].sort((a, b) => (b.episodes || 0) - (a.episodes || 0)); break;
      case 'jadwal_terdekat': result = [...result].sort((a, b) => getNearestDayDistance(a.schedule || '') - getNearestDayDistance(b.schedule || '')); break;
    }
    return result;
  }, [displayList, filter, search, genreFilter, sortMode]);

  const statusLabel = (s: string) => s === 'on-going' ? 'On-Going' : s === 'completed' ? 'Selesai' : 'Direncanakan';

  const openAdd = () => {
    setEditItem(null); setForm(emptyForm); setSelectedGenres([]);
    setSelectedSchedule([]); setCoverFile(null); setCoverPreview('');
    setParentSearch(''); setModalOpen(true);
  };

  const openEdit = (item: DonghuaItem) => {
    setEditItem(item);
    setForm({
      title: item.title, status: item.status, genre: item.genre || '',
      rating: item.rating, episodes: item.episodes,
      episodes_watched: item.episodes_watched || 0,
      cover_url: item.cover_url || '', synopsis: item.synopsis || '', notes: item.notes || '',
      season: item.season || 1, cour: item.cour || '',
      streaming_url: item.streaming_url || '', schedule: item.schedule || '',
      parent_title: item.parent_title || '',
    });
    setSelectedGenres(item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : []);
    setSelectedSchedule(item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : []);
    setCoverPreview(item.cover_url || ''); setCoverFile(null);
    setParentSearch(item.parent_title || ''); setModalOpen(true);
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setCoverFile(file); setCoverPreview(URL.createObjectURL(file)); }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = {
      ...form,
      genre: selectedGenres.join(', '),
      schedule: form.status === 'on-going' ? selectedSchedule.join(',') : '',
    };
    if (editItem) updateMut.mutate({ id: editItem.id, ...data });
    else createMut.mutate(data);
  };

  const handleImport = async (items: any[]) => {
    for (const item of items) { const { id, user_id, created_at, ...rest } = item; await donghuaService.create(rest); }
    queryClient.invalidateQueries({ queryKey: ['donghua'] });
    toast({ title: 'Import Berhasil', description: `${items.length} donghua berhasil diimpor.` });
  };

  const existingTitles = useMemo(() => Array.from(new Set(donghuaList.map(d => d.title))).sort(), [donghuaList]);

  const filteredParentTitles = useMemo(() => {
    if (!parentSearch.trim()) return existingTitles;
    const q = parentSearch.toLowerCase();
    return existingTitles.filter(t => t.toLowerCase().includes(q));
  }, [existingTitles, parentSearch]);

  const openStackView = (parentTitle: string) => { setStackViewTitle(parentTitle.toLowerCase()); setStackViewOpen(true); };

  const stackItems = useMemo(() => {
    if (!stackViewTitle) return [];
    return donghuaList
      .filter(d => d.title.trim().toLowerCase() === stackViewTitle || (d.parent_title || '').trim().toLowerCase() === stackViewTitle)
      .sort((a, b) => (a.season || 1) - (b.season || 1));
  }, [donghuaList, stackViewTitle]);

  const inputClass = "w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";
  const activeFilterCount = [genreFilter !== 'all', filter !== 'all', sortMode !== 'terbaru'].filter(Boolean).length;

  return (
    <div ref={containerRef}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="page-header">Database Donghua 🎬</h1>
          <p className="page-subtitle">Kelola koleksi donghua (animasi Tiongkok) favoritmu.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ExportMenu data={donghuaList} filename="donghua-livoria" onImport={handleImport} />
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shrink-0 min-h-[44px]">
            <Plus className="w-4 h-4" /> Tambah
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul atau genre donghua..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {usedGenres.length > 0 && (
              <div className="relative">
                <button onClick={() => setShowGenreDropdown(!showGenreDropdown)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all min-h-[44px] ${genreFilter !== 'all' ? 'border-primary bg-primary/5 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted'}`}>
                  <Filter className="w-3.5 h-3.5" />
                  <span className="truncate max-w-[80px]">{genreFilter === 'all' ? 'Genre' : genreFilter}</span>
                </button>
                {showGenreDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowGenreDropdown(false)} />
                    <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[160px] max-h-60 overflow-y-auto animate-scale-in">
                      <button onClick={() => { setGenreFilter('all'); setShowGenreDropdown(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors ${genreFilter === 'all' ? 'font-semibold text-primary' : ''}`}>
                        Semua Genre
                      </button>
                      {usedGenres.map(g => (
                        <button key={g} onClick={() => { setGenreFilter(g); setShowGenreDropdown(false); }}
                          className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors ${genreFilter === g ? 'font-semibold text-primary' : ''}`}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            <div className="relative">
              <button onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-input bg-background text-xs font-medium hover:bg-muted transition-all min-h-[44px]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Urutkan</span>
              </button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[180px] animate-scale-in">
                    {([['terbaru', 'Terbaru'], ['rating', 'Rating Tertinggi'], ['judul_az', 'Judul (A-Z)'], ['episode', 'Episode Terbanyak'], ['jadwal_terdekat', 'Jadwal Terdekat']] as const).map(([k, l]) => (
                      <button key={k} onClick={() => { setSortMode(k as SortMode); setShowSortDropdown(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors ${sortMode === k ? 'font-semibold text-primary' : ''}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap overflow-x-auto pb-1">
          {(['all', 'on-going', 'completed', 'planned'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap min-h-[40px] ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
              {f === 'all' ? `Semua (${donghuaList.length})` : `${statusLabel(f)} (${donghuaList.filter(d => d.status === f).length})`}
            </button>
          ))}
        </div>

        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filter aktif:</span>
            {genreFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {genreFilter} <button onClick={() => setGenreFilter('all')}><X className="w-3 h-3" /></button>
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
          <Film className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada donghua yang tercatat.</p>
          <button onClick={openAdd} className="mt-3 text-sm text-primary font-medium hover:underline">+ Tambah donghua pertama</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {filtered.map(donghua => (
            <MediaCard
              key={donghua.id}
              id={donghua.id}
              title={donghua.title}
              coverUrl={donghua.cover_url}
              status={donghua.status}
              genre={donghua.genre}
              rating={donghua.rating}
              episodes={donghua.episodes}
              episodesWatched={donghua.episodes_watched}
              season={donghua.season}
              cour={donghua.cour}
              streamingUrl={donghua.streaming_url}
              schedule={donghua.schedule}
              synopsis={donghua.synopsis}
              notes={donghua.notes}
              stackCount={stackCounts[donghua.id] || 0}
              type="donghua"
              onClick={stackCounts[donghua.id] > 0 ? () => openStackView(donghua.parent_title || donghua.title) : undefined}
              onEdit={() => stackCounts[donghua.id] > 0 ? openStackView(donghua.parent_title || donghua.title) : openEdit(donghua)}
              onDelete={() => stackCounts[donghua.id] > 0 ? openStackView(donghua.parent_title || donghua.title) : (() => { setDeleteItem(donghua); setDeleteOpen(true); })()}
              onViewStack={stackCounts[donghua.id] ? () => openStackView(donghua.parent_title || donghua.title) : undefined}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editItem ? 'Edit Donghua' : 'Tambah Donghua Baru'}</DialogTitle>
            <DialogDescription>{editItem ? 'Perbarui informasi donghua.' : 'Isi detail donghua yang ingin dicatat.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="label-text mb-1.5 block">Cover Image</label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-24 sm:w-20 sm:h-[120px] rounded-lg bg-muted flex items-center justify-center overflow-hidden border border-border shrink-0">
                  {coverPreview ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" /> : <ImageIcon className="w-6 h-6 text-muted-foreground/30" />}
                </div>
                <div>
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="text-sm text-primary font-medium hover:underline">Upload Cover</button>
                  <p className="helper-text mt-0.5">Format potrait 2:3 · Max 5MB</p>
                  {coverPreview && <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setForm({ ...form, cover_url: '' }); }} className="text-xs text-destructive mt-1 hover:underline">Hapus cover</button>}
                </div>
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverSelect} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Judul Donghua *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="cth: Battle Through the Heavens" className={inputClass} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Season</label>
                <input type="number" value={form.season || ''} onChange={e => setForm({ ...form, season: Number(e.target.value) })} placeholder="1" className={inputClass} min={1} />
              </div>
              <div>
                <label className="label-text mb-1.5 block">Cour / Part</label>
                <input type="text" value={form.cour} onChange={e => setForm({ ...form, cour: e.target.value })} placeholder="cth: Part 2" className={inputClass} />
              </div>
            </div>

            <div className="relative">
              <label className="label-text mb-1.5 block">Kelompokkan dengan Donghua Lain</label>
              <input
                type="text"
                value={parentSearch}
                onChange={e => { setParentSearch(e.target.value); setForm({ ...form, parent_title: e.target.value }); setShowParentDropdown(true); }}
                onFocus={() => setShowParentDropdown(true)}
                placeholder="Ketik atau pilih judul..."
                className={inputClass}
              />
              {showParentDropdown && filteredParentTitles.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowParentDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto animate-scale-in">
                    <button type="button" onClick={() => { setForm({ ...form, parent_title: '' }); setParentSearch(''); setShowParentDropdown(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors text-muted-foreground">
                      — Tidak dikelompokkan —
                    </button>
                    {filteredParentTitles.map(t => (
                      <button key={t} type="button" onClick={() => { setForm({ ...form, parent_title: t }); setParentSearch(t); setShowParentDropdown(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm hover:bg-muted transition-colors truncate ${form.parent_title === t ? 'font-semibold text-primary' : ''}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="helper-text mt-1">Ketik untuk mencari atau pilih judul donghua yang sama untuk menumpuk card</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className={inputClass}>
                  <option value="on-going">On-Going</option>
                  <option value="completed">Selesai</option>
                  <option value="planned">Direncanakan</option>
                </select>
              </div>
              <div>
                <label className="label-text mb-1.5 block">Rating (0-10)</label>
                <input type="number" value={form.rating || ''} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} placeholder="9.5" className={inputClass} min={0} max={10} step={0.1} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text mb-1.5 block">Total Episode</label>
                <input type="number" value={form.episodes || ''} onChange={e => setForm({ ...form, episodes: Number(e.target.value) })} placeholder="24" className={inputClass} min={0} />
              </div>
              {(form.status === 'on-going' || form.status === 'completed') && (
                <div>
                  <label className="label-text mb-1.5 block">Episode Ditonton</label>
                  <input type="number" value={form.episodes_watched || ''} onChange={e => setForm({ ...form, episodes_watched: Number(e.target.value) })} placeholder="12" className={inputClass} min={0} />
                </div>
              )}
            </div>
            <div>
              <label className="label-text mb-1.5 block">Genre</label>
              <GenreSelect genres={DONGHUA_GENRES} selected={selectedGenres} onChange={setSelectedGenres} />
            </div>
            {form.status === 'on-going' && (
              <div>
                <label className="label-text mb-1.5 block">Jadwal Tayang</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day.value} type="button"
                      onClick={() => {
                        if (selectedSchedule.includes(day.value)) setSelectedSchedule(selectedSchedule.filter(d => d !== day.value));
                        else setSelectedSchedule([...selectedSchedule, day.value]);
                      }}
                      className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[40px] ${
                        selectedSchedule.includes(day.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'
                      }`}>
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="label-text mb-1.5 block">Link Streaming</label>
              <input type="url" value={form.streaming_url} onChange={e => setForm({ ...form, streaming_url: e.target.value })} placeholder="https://..." className={inputClass} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Sinopsis</label>
              <textarea value={form.synopsis} onChange={e => setForm({ ...form, synopsis: e.target.value })} placeholder="Ringkasan cerita donghua..." rows={2} className={`${inputClass} resize-none`} />
            </div>
            <div>
              <label className="label-text mb-1.5 block">Catatan Pribadi</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Catatan tambahan (opsional)" rows={2} className={`${inputClass} resize-none`} />
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
            <DialogTitle className="font-display text-destructive">Hapus Donghua</DialogTitle>
            <DialogDescription>Yakin hapus "{deleteItem?.title}"? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]">Batal</button>
            <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending} className="px-4 py-2.5 rounded-xl text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={stackViewOpen} onOpenChange={setStackViewOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Layers className="w-5 h-5" /> Pilih Season</DialogTitle>
            <DialogDescription>Pilih season untuk melihat detail, edit, atau hapus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {stackItems.map(item => (
              <div key={item.id} className="rounded-xl border border-border overflow-hidden">
                <button onClick={() => { setStackViewOpen(false); setTimeout(() => setStackDetailItem(item), 150); }}
                  className="w-full text-left flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors min-h-[56px]">
                  <div className="w-10 h-14 rounded-md bg-muted overflow-hidden shrink-0">
                    {item.cover_url ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" /> : <Film className="w-4 h-4 text-muted-foreground/30 m-auto mt-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground">Season {item.season || 1}{item.cour ? ` · ${item.cour}` : ''} · {item.episodes || '?'} ep</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${item.status === 'completed' ? 'bg-pastel-green text-success' : item.status === 'on-going' ? 'bg-pastel-blue text-info' : 'bg-pastel-yellow text-warning'}`}>
                    {item.status === 'completed' ? 'Selesai' : item.status === 'on-going' ? 'On-Going' : 'Planned'}
                  </span>
                </button>
                <div className="flex border-t border-border divide-x divide-border">
                  <button onClick={() => { setStackViewOpen(false); setTimeout(() => setStackDetailItem(item), 150); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-info hover:bg-info/5 transition-colors min-h-[44px]">
                    <Film className="w-3.5 h-3.5" /> Detail
                  </button>
                  <button onClick={() => { setStackViewOpen(false); setTimeout(() => openEdit(item), 150); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors min-h-[44px]">
                    <Layers className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { setStackViewOpen(false); setTimeout(() => { setDeleteItem(item); setDeleteOpen(true); }, 150); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors min-h-[44px]">
                    <X className="w-3.5 h-3.5" /> Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stack Detail Dialog */}
      <Dialog open={!!stackDetailItem} onOpenChange={v => { if (!v) setStackDetailItem(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {stackDetailItem && (() => {
            const item = stackDetailItem;
            const genreArr = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
            const scheduleArr = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
            const hasEps = item.episodes > 0;
            const progress = hasEps ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;
            const dayNameMap: Record<string, string> = { senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis', jumat: 'Jumat', sabtu: 'Sabtu', minggu: 'Minggu' };
            const genreColorMap: Record<string, string> = {
              'Action': 'bg-destructive/15 text-destructive', 'Adventure': 'bg-success/15 text-success',
              'Comedy': 'bg-pastel-yellow text-warning', 'Drama': 'bg-pastel-purple text-primary',
              'Fantasy': 'bg-pastel-blue text-info', 'Romance': 'bg-pastel-pink text-destructive',
            };
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-base leading-tight">{item.title}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {item.status === 'on-going' ? 'On-Going' : item.status === 'completed' ? 'Selesai' : 'Direncanakan'}
                    {item.season ? ` · Season ${item.season}` : ''}{item.cour ? ` · ${item.cour}` : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  {item.cover_url && (
                    <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-xl overflow-hidden border border-border">
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {hasEps && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-2">Episode</span>
                      <span className="text-sm font-bold">{item.episodes_watched || 0}/{item.episodes}</span>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                  {genreArr.length > 0 && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-2">Genre</span>
                      <div className="flex flex-wrap gap-1.5">
                        {genreArr.map(g => <span key={g} className={`px-2 py-0.5 rounded-lg text-xs font-medium ${genreColorMap[g] || 'bg-muted text-muted-foreground'}`}>{g}</span>)}
                      </div>
                    </div>
                  )}
                  {scheduleArr.length > 0 && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-2">Jadwal</span>
                      <div className="flex flex-wrap gap-1.5">
                        {scheduleArr.map(d => <span key={d} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-xs font-medium">{dayNameMap[d] || d}</span>)}
                      </div>
                    </div>
                  )}
                  {item.streaming_url && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-2">Streaming</span>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(item.streaming_url, '_blank', 'noopener')} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors min-h-[44px]">
                          <Film className="w-3.5 h-3.5" /> Buka
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]">
                          <Layers className="w-3.5 h-3.5" /> Salin
                        </button>
                      </div>
                    </div>
                  )}
                  {item.synopsis && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-1.5">Sinopsis</span>
                      <p className="text-sm leading-relaxed">{item.synopsis}</p>
                    </div>
                  )}
                  {item.notes && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-1.5">Catatan</span>
                      <p className="text-sm leading-relaxed">{item.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button onClick={() => { setStackDetailItem(null); setTimeout(() => openEdit(item), 150); }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all min-h-[44px]">
                      Edit
                    </button>
                    <button onClick={() => { setStackDetailItem(null); setTimeout(() => { setDeleteItem(item); setDeleteOpen(true); }, 150); }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-medium hover:bg-destructive/20 transition-all min-h-[44px]">
                      Hapus
                    </button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Donghua;