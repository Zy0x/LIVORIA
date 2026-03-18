import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  Plus, Search, Tv, ImageIcon, Layers, X, Star,
  SlidersHorizontal, ExternalLink, Copy, Eye, Edit2,
  Trash2, ChevronDown, Filter, Play, Clock, CheckCircle2,
  Bookmark, Grid3X3, List, MoreVertical
} from 'lucide-react';
import { donghuaService, uploadImage } from '@/lib/supabase-service';
import type { DonghuaItem as AnimeItem } from '@/lib/types';
import { DONGHUA_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ExportMenu from '@/components/shared/ExportMenu';
import GenreSelect from '@/components/shared/GenreSelect';
import { useBackGesture } from '@/hooks/useBackGesture';

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
  'on-going': {
    label: 'Tayang',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-400/15 dark:border-emerald-400/30',
    dot: 'bg-emerald-500',
  },
  'completed': {
    label: 'Selesai',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 border-sky-200 dark:bg-sky-400/15 dark:border-sky-400/30',
    dot: 'bg-sky-500',
  },
  'planned': {
    label: 'Rencana',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-400/15 dark:border-amber-400/30',
    dot: 'bg-amber-500',
  },
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
  const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  const today = new Date().getDay();
  const arr = schedule.split(',').map(s => s.trim().toLowerCase());
  let min = 999;
  for (const d of arr) {
    const idx = days.indexOf(d);
    if (idx !== -1) min = Math.min(min, (idx - today + 7) % 7);
  }
  return min;
};

// ─── Injected global styles ───────────────────────────────────────────────────
const cardStyles = `
  @keyframes stackPulseGlow {
    0%, 100% { box-shadow: 0 0 0 2px rgba(99,102,241,0.0), 0 4px 20px rgba(0,0,0,0.12); }
    50%       { box-shadow: 0 0 0 2px rgba(99,102,241,0.35), 0 4px 20px rgba(0,0,0,0.12); }
  }
  .stack-glow { animation: stackPulseGlow 3s ease-in-out infinite; }
  .cover-img-zoom { transition: transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94); }
  .cover-img-zoom:hover { transform: scale(1.06); }
`;

// ─── Anime Card ───────────────────────────────────────────────────────────────
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

function AnimeCard({ item, stackCount, viewMode, onEdit, onDelete, onView, onViewStack }: AnimeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const fan1Ref = useRef<HTMLDivElement>(null);
  const fan2Ref = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
  const progress = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;
  const hasStack = stackCount > 0;

  const handleMouseEnter = () => {
    setHovered(true);
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { y: -8, scale: 1.025, duration: 0.35, ease: 'power3.out' });
    if (fan1Ref.current) gsap.to(fan1Ref.current, { rotate: -4, x: -5, y: 5, duration: 0.4, ease: 'power2.out' });
    if (fan2Ref.current) gsap.to(fan2Ref.current, { rotate: -8, x: -9, y: 9, duration: 0.4, ease: 'power2.out', delay: 0.04 });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { y: 0, scale: 1, duration: 0.5, ease: 'elastic.out(1, 0.55)' });
    if (fan1Ref.current) gsap.to(fan1Ref.current, { rotate: -1.5, x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)' });
    if (fan2Ref.current) gsap.to(fan2Ref.current, { rotate: -3, x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.6)', delay: 0.04 });
  };

  // ── List view ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        ref={cardRef}
        className="anime-card group flex items-center gap-4 p-4 rounded-2xl border border-border bg-card cursor-pointer hover:border-primary/30 hover:bg-accent/30 transition-all"
        onMouseEnter={() => { if (!cardRef.current) return; gsap.to(cardRef.current, { y: -3, duration: 0.3, ease: 'power2.out' }); }}
        onMouseLeave={() => { if (!cardRef.current) return; gsap.to(cardRef.current, { y: 0, duration: 0.4, ease: 'elastic.out(1, 0.6)' }); }}
        onClick={onView}
      >
        <div className="w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Tv className="w-5 h-5 text-muted-foreground/40" /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
            </span>
            {item.season > 1 && <span className="text-[10px] text-muted-foreground font-mono">S{item.season}</span>}
            {stackCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                <Layers className="w-2.5 h-2.5" />{stackCount + 1} Season
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground leading-tight truncate mb-1">{item.title}</h3>
          {genres.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {genres.slice(0, 3).map(g => (
                <span key={g} className="text-[10px] px-1.5 py-0.5 rounded-md font-medium"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '22', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          {item.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.rating}</span>
            </div>
          )}
          {item.episodes > 0 && (
            <div className="text-right">
              <p className="text-xs font-bold text-foreground">{item.episodes_watched || 0}<span className="text-muted-foreground">/{item.episodes}</span></p>
              <p className="text-[10px] text-muted-foreground">ep</p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          {item.streaming_url && (
            <button onClick={() => window.open(item.streaming_url, '_blank')}
              className="p-2 rounded-xl bg-muted hover:bg-sky-500/15 text-muted-foreground hover:text-sky-500 transition-all">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all relative">
            <MoreVertical className="w-3.5 h-3.5" />
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[140px] animate-scale-in">
                  <button onClick={() => { onEdit(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                  {onViewStack && <button onClick={() => { onViewStack(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"><Layers className="w-3.5 h-3.5" />Semua Season</button>}
                  <button onClick={() => { onDelete(); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" />Hapus</button>
                </div>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Grid view ──────────────────────────────────────────────────────────────
  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Stack fan – back card */}
      {stackCount >= 2 && (
        <div
          ref={fan2Ref}
          className="absolute inset-x-3 top-1.5 bottom-0 rounded-2xl border border-border bg-card/80"
          style={{ transform: 'rotate(-3deg)', transformOrigin: 'bottom center', zIndex: 0, opacity: 0.5, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}
        />
      )}
      {/* Stack fan – middle card */}
      {stackCount >= 1 && (
        <div
          ref={fan1Ref}
          className="absolute inset-x-1.5 top-0.5 bottom-0 rounded-2xl border border-border bg-card/90"
          style={{ transform: 'rotate(-1.5deg)', transformOrigin: 'bottom center', zIndex: 1, opacity: 0.72, boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
        />
      )}

      {/* Main card */}
      <div
        ref={cardRef}
        onClick={hasStack ? onViewStack : onView}
        className={`anime-card relative bg-card border rounded-2xl overflow-hidden cursor-pointer shadow-sm ${hasStack ? 'stack-glow border-primary/20' : 'border-border'}`}
        style={{ willChange: 'transform', zIndex: 2 }}
      >
        {/* Cover */}
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {item.cover_url
            ? <img
                src={item.cover_url}
                alt={item.title}
                className="w-full h-full object-cover"
                style={{ transition: 'transform 0.55s cubic-bezier(0.25,0.46,0.45,0.94)', transform: hovered ? 'scale(1.07)' : 'scale(1)' }}
                loading="lazy"
              />
            : <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                <Tv className="w-10 h-10 text-muted-foreground/20" />
                <span className="text-[10px] text-muted-foreground/40 font-medium">No Cover</span>
              </div>
          }

          {/* Persistent soft gradient at bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/5 to-transparent pointer-events-none" />

          {/* Hover action strip – slides up from bottom */}
          <div
            className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1.5 pb-3 pt-8 pointer-events-none"
            style={{
              transform: hovered ? 'translateY(0)' : 'translateY(110%)',
              opacity: hovered ? 1 : 0,
              transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            <button
              onClick={e => { e.stopPropagation(); onView(); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 hover:bg-black/70 transition-colors"
            >
              <Eye className="w-3 h-3" />Detail
            </button>
            {item.streaming_url && (
              <button
                onClick={e => { e.stopPropagation(); window.open(item.streaming_url, '_blank'); }}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-500/85 backdrop-blur-md text-white text-[10px] font-bold border border-sky-400/40 hover:bg-sky-500 transition-colors"
              >
                <Play className="w-3 h-3 fill-current" />Tonton
              </button>
            )}
            <button
              onClick={e => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-black/50 backdrop-blur-md text-white text-[10px] font-bold border border-white/20 hover:bg-black/70 transition-colors"
            >
              <Edit2 className="w-3 h-3" />Edit
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
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/55 backdrop-blur-md border border-white/10">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-bold text-amber-300">{item.rating}</span>
            </div>
          )}

          {/* Stack badge with pulse glow */}
          {stackCount > 0 && onViewStack && (
            <button
              onClick={e => { e.stopPropagation(); onViewStack(); }}
              className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-md text-[10px] font-bold text-white border border-indigo-400/40 hover:scale-105 transition-transform"
              style={{ background: 'rgba(79,70,229,0.88)', boxShadow: hovered ? '0 0 12px rgba(99,102,241,0.6)' : '0 0 0 0 transparent', transition: 'box-shadow 0.3s ease' }}
            >
              <Layers className="w-3 h-3" />{stackCount + 1}
            </button>
          )}

          {/* Schedule pills */}
          {item.status === 'on-going' && schedules.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 flex gap-1">
              {schedules.slice(0, 2).map(d => (
                <span key={d} className="px-1.5 py-0.5 rounded-md bg-sky-500/80 backdrop-blur-md text-[9px] font-bold text-white border border-sky-400/30">
                  {DAY_LABELS[d] || d}
                </span>
              ))}
            </div>
          )}

          {/* Season badge */}
          {item.season > 1 && (
            <div className="absolute bottom-9 left-2.5">
              <span className="px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white/80 border border-white/10">
                S{item.season}{item.cour ? ` ${item.cour}` : ''}
              </span>
            </div>
          )}
        </div>

        {/* Card body */}
        <div className="p-3">
          <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2 mb-2">
            {item.title}
          </h3>

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                  {g}
                </span>
              ))}
              {genres.length > 2 && (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">
                  +{genres.length - 2}
                </span>
              )}
            </div>
          )}

          {item.status !== 'planned' && (
            <div className="space-y-1.5">
              {item.episodes > 0 ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Eye className="w-2.5 h-2.5" />{item.episodes_watched || 0}/{item.episodes} ep
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{Math.round(progress)}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${progress}%`,
                        background: progress === 100
                          ? 'hsl(var(--success))'
                          : (GENRE_PALETTE[genres[0]] || 'hsl(var(--primary))'),
                      }} />
                  </div>
                </>
              ) : (item.episodes_watched || 0) > 0 ? (
                <span className="text-[10px] text-muted-foreground">{item.episodes_watched} ep ditonton</span>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">Eps belum diketahui</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-border/50">
            {item.streaming_url ? (
              <button onClick={e => { e.stopPropagation(); window.open(item.streaming_url, '_blank'); }}
                className="flex items-center gap-1 text-[10px] text-sky-500 dark:text-sky-400 font-medium hover:text-sky-400 transition-colors">
                <ExternalLink className="w-3 h-3" />Tonton
              </button>
            ) : <span />}
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={onEdit} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={onDelete} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
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
const Donghua = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
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

  // Inject card styles once
  useEffect(() => {
    const id = 'donghua-card-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = cardStyles;
      document.head.appendChild(style);
    }
  }, []);

  useBackGesture(modalOpen, () => setModalOpen(false), 'donghua-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'donghua-delete');
  useBackGesture(stackViewOpen, () => setStackViewOpen(false), 'donghua-stack');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'donghua-detail');

  const { data: animeList = [], isLoading } = useQuery({ queryKey: ['donghua'], queryFn: donghuaService.getAll });

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.anime-page-header',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' }
      );
      gsap.fromTo('.anime-stat-pill',
        { opacity: 0, scale: 0.85, y: 8 },
        { opacity: 1, scale: 1, y: 0, stagger: 0.07, duration: 0.4, ease: 'back.out(1.7)', delay: 0.15 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!gridRef.current || isLoading) return;
    const cards = gridRef.current.querySelectorAll('.anime-card');
    if (!cards.length) return;
    gsap.fromTo(cards,
      { opacity: 0, y: 20, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, stagger: { amount: 0.4 }, duration: 0.45, ease: 'back.out(1.2)', clearProps: 'transform' }
    );
  }, [animeList, filter, search, genreFilter, sortMode, viewMode, isLoading]);

  const createMut = useMutation({
    mutationFn: async (row: Partial<AnimeItem>) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'anime'); setUploading(false); }
      return donghuaService.create({ ...row, cover_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setModalOpen(false); setCoverFile(null); setCoverPreview(''); toast({ title: 'Berhasil ditambahkan ✨' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<AnimeItem> & { id: string }) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'anime'); setUploading(false); }
      return donghuaService.update(id, { ...row, cover_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setModalOpen(false); setCoverFile(null); setCoverPreview(''); toast({ title: 'Berhasil diperbarui ✨' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => donghuaService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setDeleteOpen(false); toast({ title: 'Dihapus' }); },
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

  const openAdd = () => { setEditItem(null); setForm(emptyForm); setSelectedGenres([]); setSelectedSchedule([]); setCoverFile(null); setCoverPreview(''); setParentSearch(''); setModalOpen(true); };
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
    for (const item of items) { const { id, user_id, created_at, ...rest } = item; await donghuaService.create(rest); }
    queryClient.invalidateQueries({ queryKey: ['donghua'] });
    toast({ title: 'Import Berhasil', description: `${items.length} donghua diimpor` });
  };

  const stats = useMemo(() => ({
    total: animeList.length,
    ongoing: animeList.filter(a => a.status === 'on-going').length,
    completed: animeList.filter(a => a.status === 'completed').length,
    planned: animeList.filter(a => a.status === 'planned').length,
    avgRating: animeList.filter(a => a.rating > 0).length > 0
      ? (animeList.filter(a => a.rating > 0).reduce((s, a) => s + a.rating, 0) / animeList.filter(a => a.rating > 0).length).toFixed(1)
      : '—',
  }), [animeList]);

  const ic = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";

  return (
    <div ref={containerRef}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="anime-page-header mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <Tv className="w-4 h-4 text-primary" />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Donghua Archive</span>
            </div>
            <h1 className="page-header">Database Donghua 🎬</h1>
            <p className="page-subtitle">{animeList.length} judul tercatat · Kelola koleksi donghua favoritmu</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <ExportMenu data={animeList} filename="donghua-livoria" onImport={handleImport} />
            <button onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]">
              <Plus className="w-4 h-4" /><span>Tambah</span>
            </button>
          </div>
        </div>

        {/* Stat pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tayang', value: stats.ongoing, color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-400/15 dark:border-emerald-400/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
            { label: 'Selesai', value: stats.completed, color: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-400/15 dark:border-sky-400/20 dark:text-sky-400', dot: 'bg-sky-500' },
            { label: 'Rencana', value: stats.planned, color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-400/15 dark:border-amber-400/20 dark:text-amber-400', dot: 'bg-amber-500' },
            { label: 'Avg Rating', value: stats.avgRating, color: 'bg-muted border-border text-foreground', dot: 'bg-warning', icon: Star },
          ].map((s, i) => (
            <div key={i} className={`anime-stat-pill flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${s.color}`}>
              {(s as any).icon ? <Star className="w-3 h-3 fill-current" /> : <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />}
              <span className="font-bold">{s.value}</span>
              <span className="font-medium opacity-70">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls bar ──────────────────────────────────────────────── */}
      <div className="space-y-3 mb-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul, genre..."
              className="w-full pl-10 pr-4 py-3 rounded-2xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border">
            {([['all', 'Semua'], ['on-going', 'Tayang'], ['completed', 'Selesai'], ['planned', 'Rencana']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {l}{k !== 'all' && <span className="ml-1 text-muted-foreground font-normal">
                  {k === 'on-going' ? stats.ongoing : k === 'completed' ? stats.completed : stats.planned}
                </span>}
              </button>
            ))}
          </div>

          {/* Genre filter */}
          {usedGenres.length > 0 && (
            <div className="relative">
              <button onClick={() => setShowGenreDD(!showGenreDD)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${genreFilter !== 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                <Filter className="w-3.5 h-3.5" />
                {genreFilter === 'all' ? 'Genre' : genreFilter}
                <ChevronDown className={`w-3 h-3 transition-transform ${showGenreDD ? 'rotate-180' : ''}`} />
              </button>
              {showGenreDD && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowGenreDD(false)} />
                  <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[180px] max-h-64 overflow-y-auto">
                    <button onClick={() => { setGenreFilter('all'); setShowGenreDD(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === 'all' ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>
                      Semua Genre
                    </button>
                    {usedGenres.map(g => (
                      <button key={g} onClick={() => { setGenreFilter(g); setShowGenreDD(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === g ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>
                        <span className="inline-flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: GENRE_PALETTE[g] || '#64748b' }} />{g}
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Urutkan</span>
            </button>
            {showSortDD && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowSortDD(false)} />
                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[170px]">
                  {([['terbaru', 'Terbaru'], ['rating', 'Rating Tertinggi'], ['judul_az', 'Judul A-Z'], ['episode', 'Episode Terbanyak'], ['jadwal_terdekat', 'Jadwal Terdekat']] as const).map(([k, l]) => (
                    <button key={k} onClick={() => { setSortMode(k); setShowSortDD(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortMode === k ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* View mode */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border ml-auto">
            <button onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Memuat koleksi donghua...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
            <Tv className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-foreground mb-1">Tidak ada anime ditemukan</p>
            <p className="text-sm text-muted-foreground">{search ? `Tidak ada hasil untuk "${search}"` : 'Mulai tambahkan anime favoritmu!'}</p>
          </div>
          {!search && (
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
              <Plus className="w-4 h-4" />Tambah Donghua Pertama
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((anime, i) => (
            <AnimeCard key={anime.id} item={anime} stackCount={stackCounts[anime.id] || 0} viewMode="grid" index={i}
              onEdit={() => openEdit(anime)} onDelete={() => { setDeleteItem(anime); setDeleteOpen(true); }}
              onView={() => openDetail(anime)} onViewStack={stackCounts[anime.id] ? () => openStackView(anime.parent_title || anime.title) : undefined} />
          ))}
        </div>
      ) : (
        <div ref={gridRef} className="space-y-2">
          {filtered.map((anime, i) => (
            <AnimeCard key={anime.id} item={anime} stackCount={stackCounts[anime.id] || 0} viewMode="list" index={i}
              onEdit={() => openEdit(anime)} onDelete={() => { setDeleteItem(anime); setDeleteOpen(true); }}
              onView={() => openDetail(anime)} onViewStack={stackCounts[anime.id] ? () => openStackView(anime.parent_title || anime.title) : undefined} />
          ))}
        </div>
      )}

      {/* ── Add/Edit Modal ─────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg">
              {editItem ? '✏️ Edit Donghua' : '✨ Tambah Donghua Baru'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editItem ? 'Perbarui informasi anime.' : 'Isi detail anime yang ingin dicatat.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Cover Image</label>
              <div className="flex items-center gap-4">
                <div onClick={() => coverInputRef.current?.click()}
                  className="w-20 h-[120px] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all shrink-0">
                  {coverPreview
                    ? <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    : <div className="flex flex-col items-center gap-1.5 text-center px-2">
                        <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                        <span className="text-[9px] text-muted-foreground">Upload</span>
                      </div>
                  }
                </div>
                <div className="space-y-1.5">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Upload Cover</button>
                  <p className="text-[10px] text-muted-foreground">Format 2:3 · Max 5MB</p>
                  {coverPreview && <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setForm({ ...form, cover_url: '' }); }} className="text-[11px] text-destructive hover:text-destructive/80 transition-colors">Hapus</button>}
                </div>
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); } }} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Judul Donghua *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="cth: Martial Universe Season 2" className={ic} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Season</label>
                <input type="number" value={form.season || ''} onChange={e => setForm({ ...form, season: Number(e.target.value) })} placeholder="1" className={ic} min={1} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Cour / Part</label>
                <input type="text" value={form.cour} onChange={e => setForm({ ...form, cour: e.target.value })} placeholder="Part 2" className={ic} />
              </div>
            </div>

            <div className="relative">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Kelompokkan Dengan</label>
              <input type="text" value={parentSearch} onChange={e => { setParentSearch(e.target.value); setForm({ ...form, parent_title: e.target.value }); setShowParentDD(true); }} onFocus={() => setShowParentDD(true)} placeholder="Ketik atau pilih judul..." className={ic} />
              {showParentDD && filteredParentTitles.length > 0 && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowParentDD(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto">
                    <button type="button" onClick={() => { setForm({ ...form, parent_title: '' }); setParentSearch(''); setShowParentDD(false); }} className="w-full text-left px-3.5 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">— Tidak dikelompokkan —</button>
                    {filteredParentTitles.map(t => (
                      <button key={t} type="button" onClick={() => { setForm({ ...form, parent_title: t }); setParentSearch(t); setShowParentDD(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm truncate hover:bg-muted transition-colors ${form.parent_title === t ? 'text-primary font-semibold' : 'text-foreground'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <p className="text-[10px] text-muted-foreground mt-1.5">Tumpuk beberapa season menjadi satu card</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })} className={ic}>
                  <option value="on-going">On-Going</option>
                  <option value="completed">Selesai</option>
                  <option value="planned">Direncanakan</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Rating (0-10)</label>
                <input type="number" value={form.rating || ''} onChange={e => setForm({ ...form, rating: Number(e.target.value) })} placeholder="9.5" className={ic} min={0} max={10} step={0.1} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Total Episode</label>
                <input type="number" value={form.episodes || ''} onChange={e => setForm({ ...form, episodes: Number(e.target.value) })} placeholder="24" className={ic} min={0} />
              </div>
              {(form.status === 'on-going' || form.status === 'completed') && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ditonton</label>
                  <input type="number" value={form.episodes_watched || ''} onChange={e => setForm({ ...form, episodes_watched: Number(e.target.value) })} placeholder="12" className={ic} min={0} />
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Genre</label>
              <GenreSelect genres={DONGHUA_GENRES} selected={selectedGenres} onChange={setSelectedGenres} />
            </div>

            {form.status === 'on-going' && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Jadwal Tayang</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day.value} type="button"
                      onClick={() => setSelectedSchedule(prev => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value])}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedSchedule.includes(day.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'}`}>
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Link Streaming</label>
              <input type="url" value={form.streaming_url} onChange={e => setForm({ ...form, streaming_url: e.target.value })} placeholder="https://..." className={ic} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Sinopsis</label>
              <textarea value={form.synopsis} onChange={e => setForm({ ...form, synopsis: e.target.value })} placeholder="Ringkasan cerita..." rows={3} className={`${ic} resize-none`} />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Catatan</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={`${ic} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending || uploading} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all">
                {uploading ? 'Mengupload...' : createMut.isPending || updateMut.isPending ? 'Menyimpan...' : editItem ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ─────────────────────────────────────────────────── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Hapus Donghua</DialogTitle>
            <DialogDescription>Yakin hapus "{deleteItem?.title}"? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
            <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending} className="px-4 py-2.5 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 transition-all">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Stack View Modal ─────────────────────────────────────────────── */}
      <Dialog open={stackViewOpen} onOpenChange={setStackViewOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2"><Layers className="w-5 h-5 text-primary" />Pilih Season</DialogTitle>
            <DialogDescription className="text-xs">Pilih season untuk melihat detail, edit, atau hapus.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {stackItems.map(item => {
              const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
              return (
                <div key={item.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                  <button onClick={() => { setStackViewOpen(false); setTimeout(() => openDetail(item), 150); }} className="w-full text-left flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                    <div className="w-12 h-16 rounded-xl bg-muted overflow-hidden shrink-0">
                      {item.cover_url ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" /> : <Tv className="w-4 h-4 text-muted-foreground/30 m-auto mt-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-[11px] text-muted-foreground">Season {item.season || 1}{item.cour ? ` · ${item.cour}` : ''} · {item.episodes || '?'} ep</p>
                    </div>
                    <span className={`text-[10px] px-2 py-1 rounded-lg border font-bold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                  </button>
                  <div className="flex border-t border-border/50 divide-x divide-border/50">
                    <button onClick={() => { setStackViewOpen(false); setTimeout(() => openDetail(item), 150); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"><Eye className="w-3.5 h-3.5" />Detail</button>
                    <button onClick={() => { setStackViewOpen(false); setTimeout(() => openEdit(item), 150); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                    <button onClick={() => { setStackViewOpen(false); setTimeout(() => { setDeleteItem(item); setDeleteOpen(true); }, 150); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-destructive hover:bg-destructive/5 transition-colors"><X className="w-3.5 h-3.5" />Hapus</button>
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Modal ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {detailItem && (() => {
            const item = detailItem;
            const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
            const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
            const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
            const progress = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-lg leading-tight">{item.title}</DialogTitle>
                  <DialogDescription className="text-xs">
                    {cfg.label}{item.season > 1 ? ` · Season ${item.season}` : ''}{item.cour ? ` · ${item.cour}` : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {item.cover_url && (
                    <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-border">
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-2">
                    {item.rating > 0 && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
                        <p className="text-sm font-bold text-foreground">{item.rating}</p>
                        <p className="text-[10px] text-muted-foreground">Rating</p>
                      </div>
                    )}
                    <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                      <Clock className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-bold text-foreground">{item.episodes > 0 ? `${item.episodes_watched || 0}/${item.episodes}` : item.episodes_watched || '?'}</p>
                      <p className="text-[10px] text-muted-foreground">Episode</p>
                    </div>
                    <div className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
                      <span className={`text-[10px] font-bold block mb-1 ${cfg.color}`}>{cfg.label}</span>
                      <span className={`w-2.5 h-2.5 rounded-full mx-auto block ${cfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
                      <p className="text-[10px] text-muted-foreground mt-1">Status</p>
                    </div>
                  </div>

                  {item.episodes > 0 && (
                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-2">
                        <span>Progress</span><span className="font-mono">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${progress}%`, background: GENRE_PALETTE[genres[0]] || 'hsl(var(--primary))' }} />
                      </div>
                    </div>
                  )}

                  {genres.length > 0 && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="section-subtitle mb-2">Genre</p>
                      <div className="flex flex-wrap gap-1.5">
                        {genres.map(g => (
                          <span key={g} className="px-2.5 py-1 rounded-xl text-xs font-semibold"
                            style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))', border: `1px solid ${(GENRE_PALETTE[g] || '#64748b')}30` }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {schedules.length > 0 && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="section-subtitle mb-2">Jadwal Tayang</p>
                      <div className="flex flex-wrap gap-1.5">
                        {schedules.map(d => (
                          <span key={d} className="px-2.5 py-1 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold border border-sky-500/20">
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {item.streaming_url && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="section-subtitle mb-2">Link Streaming</p>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(item.streaming_url, '_blank')} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-all min-h-[44px]">
                          <Play className="w-3.5 h-3.5 fill-current" />Tonton
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-accent transition-all min-h-[44px]">
                          <Copy className="w-3.5 h-3.5" />Salin
                        </button>
                      </div>
                    </div>
                  )}

                  {item.synopsis && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="section-subtitle mb-1.5">Sinopsis</p>
                      <p className="text-sm text-foreground leading-relaxed">{item.synopsis}</p>
                    </div>
                  )}
                  {item.notes && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="section-subtitle mb-1.5">Catatan</p>
                      <p className="text-sm text-foreground leading-relaxed">{item.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => openEdit(item), 200); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]">
                      <Edit2 className="w-4 h-4" />Edit
                    </button>
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => { setDeleteItem(item); setDeleteOpen(true); }, 200); }} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]">
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

export default Donghua;