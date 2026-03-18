import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  Plus, Search, Tv, ImageIcon, Layers, X, Star,
  SlidersHorizontal, ExternalLink, Copy, Eye, Edit2,
  Trash2, ChevronDown, Filter, Play, Clock, CheckCircle2,
  Bookmark, Sparkles, TrendingUp, Grid3X3, List, MoreVertical
} from 'lucide-react';
import { animeService, uploadImage } from '@/lib/supabase-service';
import type { AnimeItem } from '@/lib/types';
import { ANIME_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ExportMenu from '@/components/shared/ExportMenu';
import GenreSelect from '@/components/shared/GenreSelect';
import { useBackGesture } from '@/hooks/useBackGesture';

// ─── Types ───────────────────────────────────────────────────────────────────
type SortMode = 'terbaru' | 'rating' | 'judul_az' | 'episode' | 'jadwal_terdekat';
type FilterStatus = 'all' | 'on-going' | 'completed' | 'planned';
type ViewMode = 'grid' | 'list';

const emptyForm = {
  title: '', status: 'planned' as const, genre: '', rating: 0, episodes: 0,
  episodes_watched: 0, cover_url: '', synopsis: '', notes: '',
  season: 1, cour: '', streaming_url: '', schedule: '', parent_title: '',
};

const DAY_LABELS: Record<string, string> = {
  senin: 'Sen', selasa: 'Sel', rabu: 'Rab', kamis: 'Kam',
  jumat: 'Jum', sabtu: 'Sab', minggu: 'Min',
};

const STATUS_CONFIG = {
  'on-going': { label: 'Tayang', icon: Play, color: 'text-emerald-400', bg: 'bg-emerald-400/15 border-emerald-400/30', dot: 'bg-emerald-400' },
  'completed': { label: 'Selesai', icon: CheckCircle2, color: 'text-sky-400', bg: 'bg-sky-400/15 border-sky-400/30', dot: 'bg-sky-400' },
  'planned': { label: 'Rencana', icon: Bookmark, color: 'text-amber-400', bg: 'bg-amber-400/15 border-amber-400/30', dot: 'bg-amber-400' },
};

const GENRE_PALETTE: Record<string, string> = {
  'Action': '#ef4444', 'Adventure': '#22c55e', 'Comedy': '#f59e0b',
  'Drama': '#a855f7', 'Fantasy': '#3b82f6', 'Horror': '#dc2626',
  'Mystery': '#8b5cf6', 'Romance': '#ec4899', 'Sci-Fi': '#06b6d4',
  'Slice of Life': '#10b981', 'Isekai': '#14b8a6', 'Supernatural': '#7c3aed',
  'Martial Arts': '#f97316', 'Psychological': '#6366f1', 'School': '#0ea5e9',
  'Shounen': '#3b82f6', 'Mecha': '#64748b', 'Sports': '#f97316',
};

const getNearestDay = (schedule: string) => {
  if (!schedule) return 999;
  const days = ['minggu','senin','selasa','rabu','kamis','jumat','sabtu'];
  const today = new Date().getDay();
  const arr = schedule.split(',').map(s => s.trim().toLowerCase());
  let min = 999;
  for (const d of arr) {
    const idx = days.indexOf(d);
    if (idx !== -1) min = Math.min(min, (idx - today + 7) % 7);
  }
  return min;
};

// ─── Anime Card Component ─────────────────────────────────────────────────────
interface AnimeCardProps {
  item: AnimeItem;
  stackCount: number;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onViewStack?: () => void;
  index: number;
}

function AnimeCard({ item, stackCount, viewMode, onEdit, onDelete, onView, onViewStack, index }: AnimeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
  const progress = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;

  const handleMouseEnter = () => {
    setHovered(true);
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { y: -8, scale: 1.02, duration: 0.35, ease: 'power2.out' });
    if (overlayRef.current) gsap.to(overlayRef.current, { opacity: 1, duration: 0.3 });
    if (glowRef.current) gsap.to(glowRef.current, { opacity: 0.6, scale: 1.1, duration: 0.4 });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.6)' });
    if (overlayRef.current) gsap.to(overlayRef.current, { opacity: 0, duration: 0.25 });
    if (glowRef.current) gsap.to(glowRef.current, { opacity: 0, scale: 1, duration: 0.3 });
  };

  if (viewMode === 'list') {
    return (
      <div
        ref={cardRef}
        className="anime-card group relative flex items-center gap-4 p-4 rounded-2xl border border-white/8 bg-white/3 backdrop-blur-sm cursor-pointer overflow-hidden transition-colors hover:border-white/15 hover:bg-white/6"
        onClick={onView}
        onMouseEnter={() => gsap.to(cardRef.current, { x: 4, duration: 0.2, ease: 'power2.out' })}
        onMouseLeave={() => gsap.to(cardRef.current, { x: 0, duration: 0.3, ease: 'elastic.out(1, 0.5)' })}
      >
        {/* Cover */}
        <div className="w-16 h-24 rounded-xl overflow-hidden shrink-0 bg-white/5">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Tv className="w-6 h-6 text-white/20" /></div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
            </span>
            {item.season > 1 && <span className="text-[10px] text-white/40 font-mono">S{item.season}</span>}
            {stackCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                <Layers className="w-2.5 h-2.5" />{stackCount + 1}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-white leading-tight truncate mb-1">{item.title}</h3>
          {genres.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {genres.slice(0, 3).map(g => (
                <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '25', color: GENRE_PALETTE[g] || '#94a3b8' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 shrink-0">
          {item.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-sm font-bold text-amber-400">{item.rating}</span>
            </div>
          )}
          {item.episodes > 0 && (
            <div className="text-right">
              <p className="text-xs font-bold text-white">{item.episodes_watched || 0}<span className="text-white/40">/{item.episodes}</span></p>
              <p className="text-[10px] text-white/40">ep</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {item.streaming_url && (
            <button onClick={() => window.open(item.streaming_url, '_blank')}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-sky-400 transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => { setMenuOpen(!menuOpen); }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/80 transition-all relative">
            <MoreVertical className="w-3.5 h-3.5" />
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl z-50 py-1 min-w-[140px] animate-scale-in">
                  <button onClick={() => { onEdit(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                  {onViewStack && <button onClick={() => { onViewStack(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"><Layers className="w-3.5 h-3.5" />Semua Season</button>}
                  <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-400/5 transition-colors"><Trash2 className="w-3.5 h-3.5" />Hapus</button>
                </div>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Grid card
  return (
    <div className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {/* Glow effect */}
      <div ref={glowRef} className="absolute inset-0 rounded-2xl blur-xl opacity-0 pointer-events-none transition-opacity"
        style={{ background: `radial-gradient(ellipse, ${GENRE_PALETTE[genres[0]] || '#6366f1'}40 0%, transparent 70%)` }} />

      {/* Stack fans */}
      {stackCount >= 2 && (
        <div className="absolute inset-x-4 top-1 bottom-0 rounded-2xl border border-white/5 bg-white/2"
          style={{ transform: 'rotate(-3deg)', transformOrigin: 'bottom center' }} />
      )}
      {stackCount >= 1 && (
        <div className="absolute inset-x-2 top-0.5 bottom-0 rounded-2xl border border-white/8 bg-white/3"
          style={{ transform: 'rotate(-1.5deg)', transformOrigin: 'bottom center' }} />
      )}

      <div
        ref={cardRef}
        onClick={stackCount > 0 ? onViewStack : onView}
        className="anime-card relative bg-white/4 border border-white/10 rounded-2xl overflow-hidden cursor-pointer backdrop-blur-sm"
        style={{ willChange: 'transform' }}
      >
        {/* Cover image */}
        <div className="relative aspect-[2/3] overflow-hidden bg-white/5">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                <Tv className="w-10 h-10 text-white/10" />
                <span className="text-[10px] text-white/20 font-medium">No Cover</span>
              </div>
          }

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Hover overlay */}
          <div ref={overlayRef} className="absolute inset-0 bg-black/50 opacity-0 flex items-center justify-center gap-2">
            <button onClick={e => { e.stopPropagation(); onView(); }}
              className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all border border-white/20">
              <Eye className="w-4 h-4" />
            </button>
            {item.streaming_url && (
              <button onClick={e => { e.stopPropagation(); window.open(item.streaming_url, '_blank'); }}
                className="p-2.5 rounded-xl bg-sky-500/80 backdrop-blur-sm text-white hover:bg-sky-400 transition-all border border-sky-400/30">
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm text-white hover:bg-white/25 transition-all border border-white/20">
              <Edit2 className="w-4 h-4" />
            </button>
          </div>

          {/* Status badge */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
              {statusCfg.label}
            </span>
          </div>

          {/* Rating */}
          {item.rating > 0 && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-bold text-amber-400">{item.rating}</span>
            </div>
          )}

          {/* Stack badge */}
          {stackCount > 0 && onViewStack && (
            <button onClick={e => { e.stopPropagation(); onViewStack(); }}
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/80 backdrop-blur-md text-[10px] font-bold text-white border border-primary/40 hover:bg-primary transition-all">
              <Layers className="w-3 h-3" />{stackCount + 1}
            </button>
          )}

          {/* Schedule pills */}
          {item.status === 'on-going' && schedules.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 flex gap-1">
              {schedules.slice(0, 2).map(d => (
                <span key={d} className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-bold text-sky-300 border border-sky-400/20">
                  {DAY_LABELS[d] || d}
                </span>
              ))}
            </div>
          )}

          {/* Season badge */}
          {item.season > 1 && (
            <div className="absolute bottom-10 left-2.5">
              <span className="px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-bold text-white/70 border border-white/10">
                S{item.season}{item.cour ? ` ${item.cour}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-3">
          <h3 className="font-bold text-sm text-white leading-tight line-clamp-2 mb-2"
            style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
            {item.title}
          </h3>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || '#94a3b8' }}>
                  {g}
                </span>
              ))}
              {genres.length > 2 && (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-white/5 text-white/30 font-semibold">
                  +{genres.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Episode progress */}
          {item.status !== 'planned' && (
            <div className="space-y-1.5">
              {item.episodes > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/40 flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" />{item.episodes_watched || 0}/{item.episodes} ep
                    </span>
                    <span className="text-[10px] text-white/30 font-mono">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: progress === 100
                          ? 'linear-gradient(90deg, #10b981, #34d399)'
                          : `linear-gradient(90deg, ${GENRE_PALETTE[genres[0]] || '#6366f1'}, ${GENRE_PALETTE[genres[0]] || '#818cf8'}88)`,
                      }} />
                  </div>
                </>
              ) : (item.episodes_watched || 0) > 0 ? (
                <span className="text-[10px] text-white/40">{item.episodes_watched} ep ditonton</span>
              ) : (
                <span className="text-[10px] text-white/25 italic">Eps belum diketahui</span>
              )}
            </div>
          )}

          {/* Actions footer */}
          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/6">
            {item.streaming_url ? (
              <button onClick={e => { e.stopPropagation(); window.open(item.streaming_url, '_blank'); }}
                className="flex items-center gap-1 text-[10px] text-sky-400 font-medium hover:text-sky-300 transition-colors">
                <ExternalLink className="w-3 h-3" />Tonton
              </button>
            ) : <span />}

            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={onEdit} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/8 transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const Anime = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [sortMode, setSortMode] = useState<SortMode>('terbaru');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showGenreDD, setShowGenreDD] = useState(false);
  const [showSortDD, setShowSortDD] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stackViewOpen, setStackViewOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [stackViewTitle, setStackViewTitle] = useState('');
  const [detailItem, setDetailItem] = useState<AnimeItem | null>(null);
  const [editItem, setEditItem] = useState<AnimeItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<AnimeItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [showParentDD, setShowParentDD] = useState(false);

  useBackGesture(modalOpen, () => setModalOpen(false), 'anime-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'anime-delete');
  useBackGesture(stackViewOpen, () => setStackViewOpen(false), 'anime-stack');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'anime-detail');

  const { data: animeList = [], isLoading } = useQuery({ queryKey: ['anime'], queryFn: animeService.getAll });

  // Page entrance animation
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('.anime-hero-title',
        { opacity: 0, y: 40, skewY: 3 },
        { opacity: 1, y: 0, skewY: 0, duration: 0.8 }
      )
      .fromTo('.anime-hero-sub',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5 }, '-=0.4'
      )
      .fromTo('.anime-stat-pill',
        { opacity: 0, scale: 0.8, y: 10 },
        { opacity: 1, scale: 1, y: 0, stagger: 0.08, duration: 0.45, ease: 'back.out(1.7)' }, '-=0.3'
      )
      .fromTo('.anime-filter-bar',
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, duration: 0.4 }, '-=0.2'
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Cards animation on data change
  useEffect(() => {
    if (!gridRef.current || isLoading) return;
    const cards = gridRef.current.querySelectorAll('.anime-card');
    if (!cards.length) return;
    gsap.fromTo(cards,
      { opacity: 0, y: 30, scale: 0.92 },
      { opacity: 1, y: 0, scale: 1, stagger: { amount: 0.5, from: 'start' }, duration: 0.5, ease: 'back.out(1.3)', clearProps: 'transform' }
    );
  }, [animeList, filter, search, genreFilter, sortMode, viewMode, isLoading]);

  const createMut = useMutation({
    mutationFn: async (row: Partial<AnimeItem>) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'anime'); setUploading(false); }
      return animeService.create({ ...row, cover_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['anime'] }); setModalOpen(false); setCoverFile(null); setCoverPreview(''); toast({ title: 'Berhasil ditambahkan ✨' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<AnimeItem> & { id: string }) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'anime'); setUploading(false); }
      return animeService.update(id, { ...row, cover_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['anime'] }); setModalOpen(false); setCoverFile(null); setCoverPreview(''); toast({ title: 'Berhasil diperbarui ✨' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => animeService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['anime'] }); setDeleteOpen(false); toast({ title: 'Dihapus' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const usedGenres = useMemo(() => {
    const s = new Set<string>();
    animeList.forEach(a => a.genre?.split(',').map(g => g.trim()).filter(Boolean).forEach(g => s.add(g)));
    return Array.from(s).sort();
  }, [animeList]);

  const { displayList, stackCounts } = useMemo(() => {
    const grouped = new Map<string, AnimeItem[]>();
    const standalone: AnimeItem[] = [];
    animeList.forEach(a => {
      const key = (a.parent_title || a.title).trim().toLowerCase();
      if (a.parent_title) { if (!grouped.has(key)) grouped.set(key, []); grouped.get(key)!.push(a); }
      else standalone.push(a);
    });
    const result: AnimeItem[] = [];
    const counts: Record<string, number> = {};
    standalone.forEach(a => {
      const key = a.title.trim().toLowerCase();
      const group = grouped.get(key);
      if (group) { const all = [a, ...group].sort((x, y) => (x.season || 1) - (y.season || 1)); const latest = all[all.length - 1]; result.push(latest); counts[latest.id] = all.length - 1; }
      else result.push(a);
    });
    grouped.forEach((items, key) => {
      if (!standalone.some(a => a.title.trim().toLowerCase() === key)) {
        const sorted = items.sort((x, y) => (x.season || 1) - (y.season || 1)); const latest = sorted[sorted.length - 1]; result.push(latest); counts[latest.id] = sorted.length - 1;
      }
    });
    return { displayList: result, stackCounts: counts };
  }, [animeList]);

  const filtered = useMemo(() => {
    let r = displayList.filter(a => {
      const mf = filter === 'all' || a.status === filter;
      const ms = a.title.toLowerCase().includes(search.toLowerCase()) || (a.genre || '').toLowerCase().includes(search.toLowerCase());
      const mg = genreFilter === 'all' || (a.genre || '').toLowerCase().includes(genreFilter.toLowerCase());
      return mf && ms && mg;
    });
    if (sortMode === 'rating') r = [...r].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortMode === 'judul_az') r = [...r].sort((a, b) => a.title.localeCompare(b.title));
    if (sortMode === 'episode') r = [...r].sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
    if (sortMode === 'jadwal_terdekat') r = [...r].sort((a, b) => getNearestDay(a.schedule || '') - getNearestDay(b.schedule || ''));
    return r;
  }, [displayList, filter, search, genreFilter, sortMode]);

  const openAdd = () => {
    setEditItem(null); setForm(emptyForm); setSelectedGenres([]); setSelectedSchedule([]);
    setCoverFile(null); setCoverPreview(''); setParentSearch(''); setModalOpen(true);
  };

  const openEdit = (item: AnimeItem) => {
    setEditItem(item);
    setForm({ title: item.title, status: item.status, genre: item.genre || '', rating: item.rating, episodes: item.episodes, episodes_watched: item.episodes_watched || 0, cover_url: item.cover_url || '', synopsis: item.synopsis || '', notes: item.notes || '', season: item.season || 1, cour: item.cour || '', streaming_url: item.streaming_url || '', schedule: item.schedule || '', parent_title: item.parent_title || '' });
    setSelectedGenres(item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : []);
    setSelectedSchedule(item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : []);
    setCoverPreview(item.cover_url || ''); setCoverFile(null); setParentSearch(item.parent_title || '');
    setModalOpen(true);
  };

  const openDetail = (item: AnimeItem) => { setDetailItem(item); setDetailOpen(true); };
  const openStackView = (title: string) => { setStackViewTitle(title.toLowerCase()); setStackViewOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = { ...form, genre: selectedGenres.join(', '), schedule: form.status === 'on-going' ? selectedSchedule.join(',') : '' };
    if (editItem) updateMut.mutate({ id: editItem.id, ...data });
    else createMut.mutate(data);
  };

  const stackItems = useMemo(() => {
    if (!stackViewTitle) return [];
    return animeList.filter(a => a.title.trim().toLowerCase() === stackViewTitle || (a.parent_title || '').trim().toLowerCase() === stackViewTitle).sort((a, b) => (a.season || 1) - (b.season || 1));
  }, [animeList, stackViewTitle]);

  const existingTitles = useMemo(() => Array.from(new Set(animeList.map(a => a.title))).sort(), [animeList]);
  const filteredParentTitles = useMemo(() => {
    if (!parentSearch.trim()) return existingTitles;
    return existingTitles.filter(t => t.toLowerCase().includes(parentSearch.toLowerCase()));
  }, [existingTitles, parentSearch]);

  const handleImport = async (items: any[]) => {
    for (const item of items) { const { id, user_id, created_at, ...rest } = item; await animeService.create(rest); }
    queryClient.invalidateQueries({ queryKey: ['anime'] });
    toast({ title: 'Import Berhasil', description: `${items.length} anime diimpor` });
  };

  // Stats
  const stats = useMemo(() => ({
    total: animeList.length,
    ongoing: animeList.filter(a => a.status === 'on-going').length,
    completed: animeList.filter(a => a.status === 'completed').length,
    planned: animeList.filter(a => a.status === 'planned').length,
    avgRating: animeList.filter(a => a.rating > 0).length > 0
      ? (animeList.filter(a => a.rating > 0).reduce((s, a) => s + a.rating, 0) / animeList.filter(a => a.rating > 0).length).toFixed(1)
      : '—',
  }), [animeList]);

  const ic = "w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all";

  return (
    <div ref={containerRef} className="min-h-screen" style={{ background: 'transparent' }}>

      {/* ── Hero Header ─────────────────────────────────────────────────────── */}
      <div ref={heroRef} className="relative mb-8 overflow-hidden">
        {/* Decorative background blobs */}
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: 'radial-gradient(ellipse, #6366f180, transparent)' }} />
        <div className="absolute -top-10 left-1/3 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15"
          style={{ background: 'radial-gradient(ellipse, #ec489940, transparent)' }} />

        <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                <Tv className="w-4 h-4 text-white" />
              </div>
              <span className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em]">Anime Archive</span>
            </div>
            <h1 className="anime-hero-title text-3xl sm:text-4xl font-black text-white leading-none tracking-tight"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
              Database
              <span className="block" style={{ WebkitTextStroke: '1px rgba(255,255,255,0.3)', color: 'transparent' }}>
                Anime 📺
              </span>
            </h1>
            <p className="anime-hero-sub text-sm text-white/40 mt-2">
              {animeList.length} judul tercatat · Kelola koleksi anime favoritmu
            </p>
          </div>

          {/* Stat pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Tayang', value: stats.ongoing, color: '#10b981' },
              { label: 'Selesai', value: stats.completed, color: '#3b82f6' },
              { label: 'Rencana', value: stats.planned, color: '#f59e0b' },
              { label: 'Avg Rating', value: stats.avgRating, color: '#f59e0b', icon: Star },
            ].map((s, i) => (
              <div key={i} className="anime-stat-pill flex items-center gap-2 px-3 py-2 rounded-xl border border-white/8 bg-white/4 backdrop-blur-sm">
                {s.icon ? <s.icon className="w-3 h-3 fill-current" style={{ color: s.color }} /> : <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />}
                <span className="text-sm font-bold" style={{ color: s.color }}>{s.value}</span>
                <span className="text-[10px] text-white/40 font-medium">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Controls bar ────────────────────────────────────────────────────── */}
      <div className="anime-filter-bar space-y-3 mb-6">
        {/* Row 1: Search + Add */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Cari judul, genre..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-white/15 focus:border-white/20 transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-white/30 hover:text-white/60">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <ExportMenu data={animeList} filename="anime-livoria" onImport={handleImport} />
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-bold text-white transition-all hover:opacity-90 hover:scale-105 active:scale-95 min-h-[48px]"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Tambah</span>
            </button>
          </div>
        </div>

        {/* Row 2: Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8">
            {([['all', 'Semua'], ['on-going', 'Tayang'], ['completed', 'Selesai'], ['planned', 'Rencana']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === k ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/70'}`}>
                {l} {k !== 'all' && <span className="ml-1 text-white/25 font-normal">
                  {k === 'on-going' ? stats.ongoing : k === 'completed' ? stats.completed : stats.planned}
                </span>}
              </button>
            ))}
          </div>

          {/* Genre filter */}
          {usedGenres.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowGenreDD(!showGenreDD)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${genreFilter !== 'all' ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-300' : 'border-white/10 bg-white/4 text-white/50 hover:text-white/80 hover:bg-white/8'}`}>
                <Filter className="w-3.5 h-3.5" />
                {genreFilter === 'all' ? 'Genre' : genreFilter}
                <ChevronDown className={`w-3 h-3 transition-transform ${showGenreDD ? 'rotate-180' : ''}`} />
              </button>
              {showGenreDD && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowGenreDD(false)} />
                  <div className="absolute left-0 top-full mt-2 bg-[#0f1420] border border-white/10 rounded-2xl shadow-2xl z-50 py-2 min-w-[180px] max-h-64 overflow-y-auto">
                    <button onClick={() => { setGenreFilter('all'); setShowGenreDD(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === 'all' ? 'text-indigo-400 font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                      Semua Genre
                    </button>
                    {usedGenres.map(g => (
                      <button key={g} onClick={() => { setGenreFilter(g); setShowGenreDD(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === g ? 'text-indigo-400 font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: GENRE_PALETTE[g] || '#64748b' }} />{g}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Sort */}
          <div className="relative">
            <button onClick={() => setShowSortDD(!showSortDD)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/4 text-xs font-semibold text-white/50 hover:text-white/80 hover:bg-white/8 transition-all">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Urutkan</span>
            </button>
            {showSortDD && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDD(false)} />
                <div className="absolute right-0 top-full mt-2 bg-[#0f1420] border border-white/10 rounded-2xl shadow-2xl z-50 py-2 min-w-[170px]">
                  {([['terbaru', 'Terbaru'], ['rating', 'Rating Tertinggi'], ['judul_az', 'Judul A-Z'], ['episode', 'Episode Terbanyak'], ['jadwal_terdekat', 'Jadwal Terdekat']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => { setSortMode(k); setShowSortDD(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortMode === k ? 'text-indigo-400 font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View mode */}
          <div className="flex gap-1 p-1 rounded-xl bg-white/4 border border-white/8 ml-auto">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
          <p className="text-sm text-white/30 font-medium">Memuat koleksi anime...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #6366f115, #8b5cf615)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <Tv className="w-10 h-10 text-indigo-400/40" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-white/60 mb-1">Tidak ada anime ditemukan</p>
            <p className="text-sm text-white/30">{search ? `Tidak ada hasil untuk "${search}"` : 'Mulai tambahkan anime favoritmu!'}</p>
          </div>
          {!search && (
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Plus className="w-4 h-4" />Tambah Anime Pertama
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((anime, i) => (
            <AnimeCard
              key={anime.id}
              item={anime}
              stackCount={stackCounts[anime.id] || 0}
              viewMode="grid"
              index={i}
              onEdit={() => openEdit(anime)}
              onDelete={() => { setDeleteItem(anime); setDeleteOpen(true); }}
              onView={() => openDetail(anime)}
              onViewStack={stackCounts[anime.id] ? () => openStackView(anime.parent_title || anime.title) : undefined}
            />
          ))}
        </div>
      ) : (
        <div ref={gridRef} className="space-y-2">
          {filtered.map((anime, i) => (
            <AnimeCard
              key={anime.id}
              item={anime}
              stackCount={stackCounts[anime.id] || 0}
              viewMode="list"
              index={i}
              onEdit={() => openEdit(anime)}
              onDelete={() => { setDeleteItem(anime); setDeleteOpen(true); }}
              onView={() => openDetail(anime)}
              onViewStack={stackCounts[anime.id] ? () => openStackView(anime.parent_title || anime.title) : undefined}
            />
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="font-display text-white text-lg">
              {editItem ? '✏️ Edit Anime' : '✨ Tambah Anime Baru'}
            </DialogTitle>
            <DialogDescription className="text-white/40 text-xs">
              {editItem ? 'Perbarui informasi anime.' : 'Isi detail anime yang ingin dicatat.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* Cover upload */}
            <div>
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Cover Image</label>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => coverInputRef.current?.click()}
                  className="w-20 h-[120px] rounded-xl overflow-hidden border-2 border-dashed border-white/15 bg-white/4 flex items-center justify-center cursor-pointer hover:border-indigo-400/40 transition-all shrink-0">
                  {coverPreview
                    ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-1.5 text-center px-2">
                        <ImageIcon className="w-6 h-6 text-white/20" />
                        <span className="text-[9px] text-white/25">Klik upload</span>
                      </div>
                  }
                </div>
                <div className="space-y-1.5">
                  <button type="button" onClick={() => coverInputRef.current?.click()}
                    className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Upload Cover</button>
                  <p className="text-[10px] text-white/30">Format 2:3 · Max 5MB</p>
                  {coverPreview && (
                    <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setForm({ ...form, cover_url: '' }); }}
                      className="text-[11px] text-red-400 hover:text-red-300 transition-colors">Hapus</button>
                  )}
                </div>
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); } }} />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Judul Anime *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="cth: Solo Leveling Season 2" className={ic} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Season</label>
                <input type="number" value={form.season || ''} onChange={e => setForm({ ...form, season: Number(e.target.value) })} placeholder="1" className={ic} min={1} />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Cour / Part</label>
                <input type="text" value={form.cour} onChange={e => setForm({ ...form, cour: e.target.value })} placeholder="Part 2" className={ic} />
              </div>
            </div>

            {/* Parent title */}
            <div className="relative">
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Kelompokkan Dengan</label>
              <input type="text" value={parentSearch}
                onChange={e => { setParentSearch(e.target.value); setForm({ ...form, parent_title: e.target.value }); setShowParentDD(true); }}
                onFocus={() => setShowParentDD(true)} placeholder="Ketik atau pilih judul..." className={ic} />
              {showParentDD && filteredParentTitles.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowParentDD(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#0f1420] border border-white/10 rounded-xl shadow-2xl z-50 py-1 max-h-40 overflow-y-auto">
                    <button type="button" onClick={() => { setForm({ ...form, parent_title: '' }); setParentSearch(''); setShowParentDD(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                      — Tidak dikelompokkan —
                    </button>
                    {filteredParentTitles.map(t => (
                      <button key={t} type="button" onClick={() => { setForm({ ...form, parent_title: t }); setParentSearch(t); setShowParentDD(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm truncate hover:bg-white/5 transition-colors ${form.parent_title === t ? 'text-indigo-400 font-semibold' : 'text-white/70'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="text-[10px] text-white/25 mt-1.5">Tumpuk beberapa season menjadi satu card</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className={ic}>
                  <option value="on-going">On-Going</option>
                  <option value="completed">Selesai</option>
                  <option value="planned">Direncanakan</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Rating (0-10)</label>
                <input type="number" value={form.rating || ''} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} placeholder="9.5" className={ic} min={0} max={10} step={0.1} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Total Episode</label>
                <input type="number" value={form.episodes || ''} onChange={e => setForm({ ...form, episodes: Number(e.target.value) })} placeholder="24" className={ic} min={0} />
              </div>
              {(form.status === 'on-going' || form.status === 'completed') && (
                <div>
                  <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Ditonton</label>
                  <input type="number" value={form.episodes_watched || ''} onChange={e => setForm({ ...form, episodes_watched: Number(e.target.value) })} placeholder="12" className={ic} min={0} />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Genre</label>
              <GenreSelect genres={ANIME_GENRES} selected={selectedGenres} onChange={setSelectedGenres} />
            </div>

            {form.status === 'on-going' && (
              <div>
                <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Jadwal Tayang</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day.value} type="button"
                      onClick={() => setSelectedSchedule(prev => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value])}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedSchedule.includes(day.value) ? 'text-white border-indigo-400/50' : 'text-white/40 border-white/10 hover:border-white/20 hover:text-white/60'}`}
                      style={selectedSchedule.includes(day.value) ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' } : {}}>
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Link Streaming</label>
              <input type="url" value={form.streaming_url} onChange={e => setForm({ ...form, streaming_url: e.target.value })} placeholder="https://..." className={ic} />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Sinopsis</label>
              <textarea value={form.synopsis} onChange={e => setForm({ ...form, synopsis: e.target.value })} placeholder="Ringkasan cerita..." rows={3} className={`${ic} resize-none`} />
            </div>

            <div>
              <label className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2 block">Catatan</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={`${ic} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/8">
              <button type="button" onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 hover:bg-white/5 transition-all border border-white/10">
                Batal
              </button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending || uploading}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                {uploading ? 'Mengupload...' : createMut.isPending || updateMut.isPending ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ──────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm" style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="font-display text-red-400">Hapus Anime</DialogTitle>
            <DialogDescription className="text-white/40 text-sm">Yakin hapus "{deleteItem?.title}"? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white/80 border border-white/10 hover:bg-white/5 transition-all">Batal</button>
            <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Stack View Modal ─────────────────────────────────────────────── */}
      <Dialog open={stackViewOpen} onOpenChange={setStackViewOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto" style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DialogHeader>
            <DialogTitle className="font-display text-white flex items-center gap-2"><Layers className="w-5 h-5 text-indigo-400" />Pilih Season</DialogTitle>
            <DialogDescription className="text-white/40 text-xs">Pilih season untuk melihat detail, edit, atau hapus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {stackItems.map(item => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
              return (
                <div key={item.id} className="rounded-2xl border border-white/8 overflow-hidden bg-white/3">
                  <button onClick={() => { setStackViewOpen(false); setTimeout(() => openDetail(item), 150); }}
                    className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/5 transition-colors">
                    <div className="w-12 h-16 rounded-xl bg-white/5 overflow-hidden shrink-0">
                      {item.cover_url ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" /> : <Tv className="w-4 h-4 text-white/20 m-auto mt-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-white/40">Season {item.season || 1}{item.cour ? ` · ${item.cour}` : ''} · {item.episodes || '?'} ep</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </button>
                  <div className="flex border-t border-white/6 divide-x divide-white/6">
                    <button onClick={() => { setStackViewOpen(false); setTimeout(() => openDetail(item), 150); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-400/5 transition-colors">
                      <Eye className="w-3.5 h-3.5" />Detail
                    </button>
                    <button onClick={() => { setStackViewOpen(false); setTimeout(() => openEdit(item), 150); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />Edit
                    </button>
                    <button onClick={() => { setStackViewOpen(false); setTimeout(() => { setDeleteItem(item); setDeleteOpen(true); }, 150); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-400/5 transition-colors">
                      <X className="w-3.5 h-3.5" />Hapus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto" style={{ background: '#0f1420', border: '1px solid rgba(255,255,255,0.1)' }}>
          {detailItem && (() => {
            const item = detailItem;
            const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
            const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
            const progress = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-white text-lg leading-tight">{item.title}</DialogTitle>
                  <DialogDescription className="text-white/40 text-xs">
                    {cfg.label} {item.season > 1 ? `· Season ${item.season}` : ''}{item.cour ? ` · ${item.cour}` : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {item.cover_url && (
                    <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-white/10">
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2">
                    {item.rating > 0 && (
                      <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400 mx-auto mb-1" />
                        <p className="text-sm font-bold text-amber-400">{item.rating}</p>
                        <p className="text-[10px] text-white/30">Rating</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3 text-center">
                      <Clock className="w-4 h-4 text-white/30 mx-auto mb-1" />
                      <p className="text-sm font-bold text-white">{item.episodes > 0 ? `${item.episodes_watched || 0}/${item.episodes}` : item.episodes_watched || '?'}</p>
                      <p className="text-[10px] text-white/30">Episode</p>
                    </div>
                    <div className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
                      <span className={`text-[10px] font-bold block mb-1 ${cfg.color}`}>{cfg.label}</span>
                      <span className={`w-2.5 h-2.5 rounded-full mx-auto block ${cfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
                      <p className="text-[10px] text-white/30 mt-1">Status</p>
                    </div>
                  </div>
                  {/* Progress */}
                  {item.episodes > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <div className="flex justify-between text-[10px] text-white/40 mb-2">
                        <span>Progress</span><span className="font-mono">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-white/8 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${GENRE_PALETTE[genres[0]] || '#6366f1'}, ${GENRE_PALETTE[genres[0]] || '#818cf8'})` }} />
                      </div>
                    </div>
                  )}
                  {/* Genres */}
                  {genres.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Genre</p>
                      <div className="flex flex-wrap gap-1.5">
                        {genres.map(g => (
                          <span key={g} className="px-2.5 py-1 rounded-xl text-xs font-semibold"
                            style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || '#94a3b8', border: `1px solid ${(GENRE_PALETTE[g] || '#64748b')}30` }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Schedule */}
                  {schedules.length > 0 && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Jadwal Tayang</p>
                      <div className="flex flex-wrap gap-1.5">
                        {schedules.map(d => (
                          <span key={d} className="px-2.5 py-1 rounded-xl bg-sky-400/10 text-sky-400 text-xs font-semibold border border-sky-400/20">
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Streaming */}
                  {item.streaming_url && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Link Streaming</p>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(item.streaming_url, '_blank')}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #0ea5e9, #2563eb)' }}>
                          <Play className="w-3.5 h-3.5 fill-current" />Tonton
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/50 text-xs font-semibold hover:bg-white/10 transition-all">
                          <Copy className="w-3.5 h-3.5" />Salin
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Synopsis */}
                  {item.synopsis && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Sinopsis</p>
                      <p className="text-sm text-white/70 leading-relaxed">{item.synopsis}</p>
                    </div>
                  )}
                  {item.notes && (
                    <div className="rounded-xl border border-white/8 bg-white/3 p-3">
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider mb-2">Catatan</p>
                      <p className="text-sm text-white/70 leading-relaxed">{item.notes}</p>
                    </div>
                  )}
                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-white/8">
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => openEdit(item), 200); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                      <Edit2 className="w-4 h-4" />Edit
                    </button>
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => { setDeleteItem(item); setDeleteOpen(true); }, 200); }}
                      className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-400/10 text-red-400 text-sm font-bold hover:bg-red-400/20 transition-all border border-red-400/20">
                      <Trash2 className="w-4 h-4" />Hapus
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

export default Anime;