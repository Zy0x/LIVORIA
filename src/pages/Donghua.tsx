import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  Plus, Search, Tv, ImageIcon, Layers, X, Star,
  SlidersHorizontal, ExternalLink, Copy, Eye, Edit2,
  Trash2, ChevronDown, Filter, Clock,
  Grid3X3, List, MoreVertical, Bookmark, Heart, ChevronLeft, ChevronRight
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

// ─── AnimeCard ────────────────────────────────────────────────────────────────
interface AnimeCardProps {
  item: AnimeItem;
  stackCount: number;
  viewMode: ViewMode;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
  onViewStack?: () => void;
  onToggleFavorite: () => void;
  onToggleBookmark: () => void;
  index: number;
}

function AnimeCard({
  item, stackCount, viewMode, onEdit, onDelete, onView,
  onViewStack, onToggleFavorite, onToggleBookmark,
}: AnimeCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fan1Ref    = useRef<HTMLDivElement>(null);
  const fan2Ref    = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const genres    = item.genre    ? item.genre.split(',').map(g => g.trim()).filter(Boolean)    : [];
  const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
  const progress  = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;

  const isFavorite  = item.is_favorite;
  const isBookmarked = item.is_bookmarked;

  const handleMouseEnter = () => {
    if (!wrapperRef.current) return;
    gsap.to(wrapperRef.current, { y: -8, scale: 1.03, duration: 0.4, ease: 'back.out(2)' });
    if (fan1Ref.current) gsap.to(fan1Ref.current, { rotate: -6, x: -5, y: -4, duration: 0.45, ease: 'back.out(2.5)' });
    if (fan2Ref.current) gsap.to(fan2Ref.current, { rotate: -11, x: -9, y: -7, duration: 0.5, ease: 'back.out(2)', delay: 0.04 });
  };

  const handleMouseLeave = () => {
    if (!wrapperRef.current) return;
    gsap.to(wrapperRef.current, { y: 0, scale: 1, duration: 0.55, ease: 'elastic.out(1, 0.5)' });
    if (fan1Ref.current) gsap.to(fan1Ref.current, { rotate: -1.5, x: 0, y: -1, duration: 0.5, ease: 'elastic.out(1, 0.55)' });
    if (fan2Ref.current) gsap.to(fan2Ref.current, { rotate: -3, x: 0, y: -2, duration: 0.55, ease: 'elastic.out(1, 0.45)' });
  };

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.streaming_url) {
      navigator.clipboard.writeText(item.streaming_url);
      toast({ title: 'Link disalin!', description: item.streaming_url.slice(0, 50) + (item.streaming_url.length > 50 ? '...' : '') });
    }
  };

  // ── List mode ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={`anime-card group flex items-center gap-4 p-4 rounded-2xl border bg-card cursor-pointer hover:border-primary/30 hover:bg-accent/30 transition-all ${
          isFavorite ? 'border-amber-300/60 dark:border-amber-500/40' :
          isBookmarked ? 'border-primary/40' : 'border-border'
        }`}
        onClick={onView}
      >
        <div className="relative w-14 h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Tv className="w-5 h-5 text-muted-foreground/40" /></div>
          }
          {/* Favorite/Bookmark micro-indicators on cover */}
          {(isFavorite || isBookmarked) && (
            <div className="absolute top-1 right-1 flex flex-col gap-0.5">
              {isFavorite && <Heart className="w-3 h-3 text-amber-500 fill-amber-500 drop-shadow-sm" />}
              {isBookmarked && <Bookmark className="w-3 h-3 text-primary fill-primary drop-shadow-sm" />}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
            </span>
            {item.season > 1 && <span className="text-[10px] text-muted-foreground font-mono">S{item.season}</span>}
            {item.cour && <span className="text-[10px] text-muted-foreground font-mono">{item.cour}</span>}
            {stackCount > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                <Layers className="w-2.5 h-2.5" />{stackCount + 1}
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
            <>
              <button onClick={() => window.open(item.streaming_url, '_blank')}
                className="p-2 rounded-xl bg-muted hover:bg-info/15 text-muted-foreground hover:text-info transition-all"
                title="Tonton">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button onClick={copyLink}
                className="p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground hover:text-foreground transition-all"
                title="Salin link">
                <Copy className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          <button onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            className={`p-2 rounded-xl transition-all ${isFavorite ? 'text-amber-500 bg-amber-50 dark:bg-amber-500/15' : 'text-muted-foreground bg-muted hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/15'}`}
            title="Favorit">
            <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
          </button>
          <button onClick={e => { e.stopPropagation(); onToggleBookmark(); }}
            className={`p-2 rounded-xl transition-all ${isBookmarked ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted hover:text-primary hover:bg-primary/10'}`}
            title="Bookmark">
            <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-primary' : ''}`} />
          </button>
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

  // ── Grid card ──────────────────────────────────────────────────────────────
  //
  // Badge layout (no overlap):
  // TOP-LEFT:   status badge
  // TOP-RIGHT:  rating badge
  // BOTTOM-LEFT: schedule days OR season+cour (not both)
  // BOTTOM-RIGHT: stack badge
  // If schedule is shown AND season exists → season shown right below status badge
  //
  const showScheduleBottom = item.status === 'on-going' && schedules.length > 0;
  const hasSeason = item.season > 0;
  // When schedule occupies bottom-left, season badge moves under status badge (top-left area)
  const seasonStr = hasSeason ? `S${item.season}${item.cour ? ` · ${item.cour}` : ''}` : (item.cour ? item.cour : null);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Fan cards behind */}
      {stackCount >= 2 && (
        <div ref={fan2Ref} className="absolute inset-x-3 top-1 bottom-0 rounded-2xl border border-border/50 bg-card/80"
          style={{ transform: 'rotate(-3deg) translateY(-2px)', transformOrigin: 'bottom center' }} />
      )}
      {stackCount >= 1 && (
        <div ref={fan1Ref} className="absolute inset-x-1.5 top-0.5 bottom-0 rounded-2xl border border-border/65 bg-card/90"
          style={{ transform: 'rotate(-1.5deg) translateY(-1px)', transformOrigin: 'bottom center' }} />
      )}

      {/* Main card */}
      <div
        className={`anime-card group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm z-10 border transition-colors ${
          isFavorite ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-300/60 dark:border-amber-500/40' :
          isBookmarked ? 'bg-primary/[0.03] border-primary/40' :
          'bg-card border-border'
        }`}
        onClick={stackCount > 0 ? onViewStack : onView}
      >
        {/* ── Cover image area ── */}
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                <Tv className="w-10 h-10 text-muted-foreground/20" />
                <span className="text-[10px] text-muted-foreground/40 font-medium">No Cover</span>
              </div>
          }

          {/* Bottom gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* ── TOP-LEFT: Status badge ── */}
          <div className="absolute top-2.5 left-2.5">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
              {statusCfg.label}
            </span>
            {/* Season badge below status — only when schedule is shown at bottom-left */}
            {showScheduleBottom && seasonStr && (
              <span className="mt-1 flex px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-bold text-white/80 border border-white/10">
                {seasonStr}
              </span>
            )}
          </div>

          {/* ── TOP-RIGHT: Rating badge ── */}
          {item.rating > 0 && (
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-md border border-white/10">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-bold text-amber-300">{item.rating}</span>
            </div>
          )}

          {/* ── BOTTOM-LEFT: schedule days OR season badge ── */}
          {showScheduleBottom ? (
            <div className={`absolute bottom-2.5 left-2.5 flex gap-0.5 flex-wrap ${stackCount > 0 ? 'max-w-[calc(100%-2.5rem)]' : ''}`}>
              {schedules.slice(0, 3).map(d => (
                <span key={d} className="px-1.5 py-0.5 rounded-md bg-info/80 backdrop-blur-md text-[9px] font-bold text-white border border-info/30">
                  {DAY_LABELS[d] || d}
                </span>
              ))}
              {schedules.length > 3 && (
                <span className="px-1 py-0.5 rounded-md bg-info/60 text-[9px] font-bold text-white">+{schedules.length - 3}</span>
              )}
            </div>
          ) : seasonStr ? (
            <div className="absolute bottom-2.5 left-2.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white/80 border border-white/10">
                {seasonStr}
              </span>
            </div>
          ) : null}

          {/* ── BOTTOM-RIGHT: Stack badge ── */}
          {stackCount > 0 && onViewStack && (
            <button
              onClick={e => { e.stopPropagation(); onViewStack(); }}
              className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/90 backdrop-blur-md text-[10px] font-semibold text-primary-foreground hover:bg-primary transition-colors z-10 border border-primary/40"
            >
              <Layers className="w-3 h-3" /> {stackCount + 1}
            </button>
          )}
        </div>

        {/* ── Card body ── */}
        <div className="p-3">
          <h3 className="font-bold text-sm text-foreground leading-tight line-clamp-2 mb-2">{item.title}</h3>

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2.5">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                  {g}
                </span>
              ))}
              {genres.length > 2 && (
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold">+{genres.length - 2}</span>
              )}
            </div>
          )}

          {item.status !== 'planned' && (
            <div className="space-y-1.5 mb-2.5">
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
                        background: progress === 100 ? 'hsl(var(--success))' : (GENRE_PALETTE[genres[0]] || 'hsl(var(--primary))'),
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

          {/* Bottom bar: actions */}
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            {/* Streaming actions */}
            {item.streaming_url ? (
              <div className="flex items-center gap-0.5">
                <button
                  onClick={e => { e.stopPropagation(); window.open(item.streaming_url, '_blank'); }}
                  className="flex items-center gap-1 text-[10px] text-info font-medium hover:text-info/80 transition-colors px-1.5 py-1 rounded-md hover:bg-info/10"
                >
                  <ExternalLink className="w-3 h-3" />Tonton
                </button>
                <button onClick={copyLink} className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 rounded-md hover:bg-muted" title="Salin link">
                  <Copy className="w-3 h-3" />
                </button>
              </div>
            ) : <span />}

            {/* Right: favorite, bookmark, edit, delete */}
            <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
              <button onClick={onToggleFavorite}
                className={`p-1.5 rounded-lg transition-all ${isFavorite ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-500'}`}
                title="Favorit">
                <Heart className={`w-3 h-3 ${isFavorite ? 'fill-amber-500' : ''}`} />
              </button>
              <button onClick={onToggleBookmark}
                className={`p-1.5 rounded-lg transition-all ${isBookmarked ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                title="Bookmark">
                <Bookmark className={`w-3 h-3 ${isBookmarked ? 'fill-primary' : ''}`} />
              </button>
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

// ─── AddCard placeholder ──────────────────────────────────────────────────────
function AddCard({ viewMode, onClick }: { viewMode: ViewMode; onClick: () => void }) {
  if (viewMode === 'list') {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group w-full"
      >
        <div className="w-14 h-20 rounded-xl border-2 border-dashed border-border group-hover:border-primary/40 flex items-center justify-center shrink-0 transition-colors">
          <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">Tambah Donghua Baru</p>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group flex flex-col items-center justify-center cursor-pointer"
      style={{ aspectRatio: '2 / 3.35' }}
    >
      <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center px-2">Tambah Donghua</p>
    </button>
  );
}

// ─── Stack Detail Modal ─────────────────────────────────────────────────────
// Shows all seasons in a group with navigation between them
interface StackDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: AnimeItem[];
  initialIndex: number;
  onEdit: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
}

function StackDetailModal({ open, onOpenChange, items, initialIndex, onEdit, onDelete }: StackDetailModalProps) {
  const [idx, setIdx] = useState(initialIndex);
  useEffect(() => { setIdx(initialIndex); }, [open, initialIndex]);

  const item = items[idx];
  if (!item) return null;

  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const progress = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base sm:text-lg leading-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            {item.title}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {cfg.label}{item.season > 1 ? ` · Season ${item.season}` : ''}{item.cour ? ` · ${item.cour}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Season switcher */}
        {items.length > 1 && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border">
            <button
              onClick={() => setIdx(i => Math.max(0, i - 1))}
              disabled={idx === 0}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
              {items.map((it, i) => (
                <button
                  key={it.id}
                  onClick={() => setIdx(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    i === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {it.season > 1 ? `S${it.season}` : 'S1'}{it.cour ? ` ${it.cour}` : ''}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))}
              disabled={idx === items.length - 1}
              className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="space-y-4 mt-1">
          {item.cover_url && (
            <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-xl overflow-hidden border border-border">
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
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
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
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jadwal Tayang</p>
              <div className="flex flex-wrap gap-1.5">
                {schedules.map(d => (
                  <span key={d} className="px-2.5 py-1 rounded-xl bg-info/10 text-info text-xs font-semibold border border-info/20">
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </span>
                ))}
              </div>
            </div>
          )}
          {item.streaming_url && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link Streaming</p>
              <div className="flex gap-2">
                <button onClick={() => window.open(item.streaming_url, '_blank')} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-bold hover:bg-info/20 transition-all min-h-[44px]">
                  <ExternalLink className="w-3.5 h-3.5" />Tonton
                </button>
                <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-accent transition-all min-h-[44px]">
                  <Copy className="w-3.5 h-3.5" />Salin
                </button>
              </div>
            </div>
          )}
          {item.synopsis && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sinopsis</p>
              <p className="text-sm text-foreground leading-relaxed">{item.synopsis}</p>
            </div>
          )}
          {item.notes && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Catatan</p>
              <p className="text-sm text-foreground leading-relaxed">{item.notes}</p>
            </div>
          )}
          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => { onOpenChange(false); setTimeout(() => onEdit(item), 200); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]">
              <Edit2 className="w-4 h-4" />Edit
            </button>
            <button onClick={() => { onOpenChange(false); setTimeout(() => onDelete(item), 200); }} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]">
              <Trash2 className="w-4 h-4" />Hapus
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
  const [stackDetailOpen, setStackDetailOpen] = useState(false);
  const [stackDetailItems, setStackDetailItems] = useState<AnimeItem[]>([]);
  const [stackDetailInitIdx, setStackDetailInitIdx] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
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

  useBackGesture(modalOpen, () => setModalOpen(false), 'donghua-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'donghua-delete');
  useBackGesture(stackDetailOpen, () => setStackDetailOpen(false), 'donghua-stack-detail');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'donghua-detail');

  const { data: animeList = [], isLoading } = useQuery({ queryKey: ['donghua'], queryFn: donghuaService.getAll });

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.anime-page-header', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      gsap.fromTo('.anime-stat-pill', { opacity: 0, scale: 0.85, y: 8 }, { opacity: 1, scale: 1, y: 0, stagger: 0.07, duration: 0.4, ease: 'back.out(1.7)', delay: 0.15 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!gridRef.current || isLoading) return;
    const wrappers = gridRef.current.querySelectorAll('[data-card-wrapper]');
    if (!wrappers.length) return;
    gsap.fromTo(wrappers,
      { opacity: 0, y: 24, scale: 0.94 },
      { opacity: 1, y: 0, scale: 1, stagger: { amount: 0.5, from: 'start' }, duration: 0.5, ease: 'back.out(1.4)', clearProps: 'transform' }
    );
  }, [animeList, filter, search, genreFilter, sortMode, viewMode, isLoading]);

  const createMut = useMutation({
    mutationFn: async (row: Partial<AnimeItem>) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'donghua'); setUploading(false); }
      return donghuaService.create({ ...row, cover_url });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setModalOpen(false); setCoverFile(null); setCoverPreview(''); toast({ title: 'Berhasil ditambahkan ✨' }); },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<AnimeItem> & { id: string }) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'donghua'); setUploading(false); }
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

  const toggleFavoriteMut = useMutation({
    mutationFn: (item: AnimeItem) => donghuaService.update(item.id, { is_favorite: !item.is_favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donghua'] }),
  });

  const toggleBookmarkMut = useMutation({
    mutationFn: (item: AnimeItem) => donghuaService.update(item.id, { is_bookmarked: !item.is_bookmarked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donghua'] }),
  });

  const usedGenres = useMemo(() => {
    const s = new Set<string>();
    animeList.forEach(a => a.genre?.split(',').map(g => g.trim()).filter(Boolean).forEach(g => s.add(g)));
    return Array.from(s).sort();
  }, [animeList]);

  // ── Grouping logic ──
  // Build groups: map from canonical title key → all items in group
  const { displayList, stackCounts, groupMap } = useMemo(() => {
    // Group by canonical title (parent_title falls back to title)
    const groups = new Map<string, AnimeItem[]>();
    animeList.forEach(a => {
      const key = (a.parent_title || a.title).trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });

    const result: AnimeItem[] = [];
    const counts: Record<string, number> = {};
    // groupMap: representative item id → all items in group sorted by season
    const gMap: Record<string, AnimeItem[]> = {};

    groups.forEach((items) => {
      const sorted = [...items].sort((a, b) => (a.season || 1) - (b.season || 1));
      const latest = sorted[sorted.length - 1];
      result.push(latest);
      const groupSize = sorted.length;
      counts[latest.id] = groupSize - 1;
      gMap[latest.id] = sorted;
    });

    return { displayList: result, stackCounts: counts, groupMap: gMap };
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
    setForm({
      title: item.title, status: item.status, genre: item.genre || '', rating: item.rating,
      episodes: item.episodes, episodes_watched: item.episodes_watched || 0,
      cover_url: item.cover_url || '', synopsis: item.synopsis || '', notes: item.notes || '',
      season: item.season || 1, cour: item.cour || '', streaming_url: item.streaming_url || '',
      schedule: item.schedule || '', parent_title: item.parent_title || '',
    });
    setSelectedGenres(item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : []);
    setSelectedSchedule(item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : []);
    setCoverPreview(item.cover_url || ''); setCoverFile(null);
    setParentSearch(item.parent_title || ''); setModalOpen(true);
  };

  const openDetail = (item: AnimeItem) => { setDetailItem(item); setDetailOpen(true); };

  const openStackDetail = (representativeId: string, clickedItem?: AnimeItem) => {
    const items = groupMap[representativeId];
    if (!items) return;
    const initIdx = clickedItem ? items.findIndex(it => it.id === clickedItem.id) : items.length - 1;
    setStackDetailItems(items);
    setStackDetailInitIdx(Math.max(0, initIdx));
    setStackDetailOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const data = { ...form, genre: selectedGenres.join(', '), schedule: form.status === 'on-going' ? selectedSchedule.join(',') : '' };
    if (editItem) updateMut.mutate({ id: editItem.id, ...data });
    else createMut.mutate(data);
  };

  // Parent title dropdown: only show canonical/root titles (unique parent keys)
  // Exclude the current item's title to avoid self-grouping
  const existingGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    animeList.forEach(a => keys.add((a.parent_title || a.title).trim()));
    // Remove the item being edited from the list
    if (editItem) {
      keys.delete(editItem.title.trim());
    }
    return Array.from(keys).sort();
  }, [animeList, editItem]);

  const filteredParentTitles = useMemo(() => {
    if (!parentSearch.trim()) return existingGroupKeys;
    return existingGroupKeys.filter(t => t.toLowerCase().includes(parentSearch.toLowerCase()));
  }, [existingGroupKeys, parentSearch]);

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
    favorites: animeList.filter(a => a.is_favorite).length,
    bookmarked: animeList.filter(a => a.is_bookmarked).length,
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
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]">
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
            { label: 'Favorit', value: stats.favorites, color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-400/15 dark:border-amber-400/20 dark:text-amber-400', icon: Heart },
            { label: 'Bookmark', value: stats.bookmarked, color: 'bg-primary/8 border-primary/20 text-primary', icon: Bookmark },
          ].map((s, i) => (
            <div key={i} className={`anime-stat-pill flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${s.color}`}>
              {(s as any).icon === Star ? <Star className="w-3 h-3 fill-current" /> :
               (s as any).icon === Heart ? <Heart className="w-3 h-3 fill-current" /> :
               (s as any).icon === Bookmark ? <Bookmark className="w-3 h-3 fill-current" /> :
               <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />}
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
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Grid3X3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
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
      ) : viewMode === 'grid' ? (
        <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {filtered.map((anime, i) => (
            <div key={anime.id} data-card-wrapper>
              <AnimeCard
                item={anime}
                stackCount={stackCounts[anime.id] || 0}
                viewMode="grid"
                index={i}
                onEdit={() => openEdit(anime)}
                onDelete={() => { setDeleteItem(anime); setDeleteOpen(true); }}
                onView={() => openDetail(anime)}
                onViewStack={stackCounts[anime.id] ? () => openStackDetail(anime.id) : undefined}
                onToggleFavorite={() => toggleFavoriteMut.mutate(anime)}
                onToggleBookmark={() => toggleBookmarkMut.mutate(anime)}
              />
            </div>
          ))}
          {/* Add card at end */}
          <div data-card-wrapper>
            <AddCard viewMode="grid" onClick={openAdd} />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center">
            <Tv className="w-10 h-10 text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-base font-bold text-foreground mb-1">Tidak ada anime ditemukan</p>
            <p className="text-sm text-muted-foreground">{search ? `Tidak ada hasil untuk "${search}"` : 'Mulai tambahkan donghua favoritmu!'}</p>
          </div>
          {!search && (
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
              <Plus className="w-4 h-4" />Tambah Donghua Pertama
            </button>
          )}
        </div>
      ) : (
        <div ref={gridRef} className="space-y-2">
          {filtered.map((anime, i) => (
            <div key={anime.id} data-card-wrapper>
              <AnimeCard item={anime} stackCount={stackCounts[anime.id] || 0} viewMode="list" index={i}
                onEdit={() => openEdit(anime)} onDelete={() => { setDeleteItem(anime); setDeleteOpen(true); }}
                onView={() => openDetail(anime)}
                onViewStack={stackCounts[anime.id] ? () => openStackDetail(anime.id) : undefined}
                onToggleFavorite={() => toggleFavoriteMut.mutate(anime)}
                onToggleBookmark={() => toggleBookmarkMut.mutate(anime)}
              />
            </div>
          ))}
          {/* Add card at end — list mode */}
          <AddCard viewMode="list" onClick={openAdd} />
        </div>
      )}

      {/* ── Stack Detail Modal (with season switcher) ─── */}
      <StackDetailModal
        open={stackDetailOpen}
        onOpenChange={setStackDetailOpen}
        items={stackDetailItems}
        initialIndex={stackDetailInitIdx}
        onEdit={openEdit}
        onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
      />

      {/* ── Simple Detail Modal (for single items) ── */}
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
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
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
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jadwal Tayang</p>
                      <div className="flex flex-wrap gap-1.5">
                        {schedules.map(d => (
                          <span key={d} className="px-2.5 py-1 rounded-xl bg-info/10 text-info text-xs font-semibold border border-info/20">
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.streaming_url && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link Streaming</p>
                      <div className="flex gap-2">
                        <button onClick={() => window.open(item.streaming_url, '_blank')} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-bold hover:bg-info/20 transition-all min-h-[44px]">
                          <ExternalLink className="w-3.5 h-3.5" />Tonton
                        </button>
                        <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold hover:bg-accent transition-all min-h-[44px]">
                          <Copy className="w-3.5 h-3.5" />Salin
                        </button>
                      </div>
                    </div>
                  )}
                  {item.synopsis && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sinopsis</p>
                      <p className="text-sm text-foreground leading-relaxed">{item.synopsis}</p>
                    </div>
                  )}
                  {item.notes && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Catatan</p>
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
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Judul Anime *</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="cth: Solo Leveling Season 2" className={ic} required />
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

            {/* Parent title — shows unique group keys only */}
            <div className="relative">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Kelompokkan Dengan</label>
              <input type="text" value={parentSearch}
                onChange={e => { setParentSearch(e.target.value); setForm({ ...form, parent_title: e.target.value }); setShowParentDD(true); }}
                onFocus={() => setShowParentDD(true)}
                placeholder="Ketik atau pilih judul induk..."
                className={ic} />
              {showParentDD && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowParentDD(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto">
                    <button type="button" onClick={() => { setForm({ ...form, parent_title: '' }); setParentSearch(''); setShowParentDD(false); }}
                      className="w-full text-left px-3.5 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                      — Tidak dikelompokkan —
                    </button>
                    {filteredParentTitles.map(t => (
                      <button key={t} type="button" onClick={() => { setForm({ ...form, parent_title: t }); setParentSearch(t); setShowParentDD(false); }}
                        className={`w-full text-left px-3.5 py-2.5 text-sm truncate hover:bg-muted transition-colors ${form.parent_title === t ? 'text-primary font-semibold' : 'text-foreground'}`}>
                        {t}
                      </button>
                    ))}
                    {filteredParentTitles.length === 0 && parentSearch && (
                      <p className="px-3.5 py-2.5 text-xs text-muted-foreground">Tekan Enter atau klik di luar untuk pakai teks ini sebagai kelompok baru</p>
                    )}
                  </div>
                </>
              )}
              <p className="text-[10px] text-muted-foreground mt-1">Tumpuk beberapa season menjadi satu card. Dropdown menampilkan nama kelompok yang sudah ada.</p>
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
    </div>
  );
};

export default Donghua;