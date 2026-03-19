/**
 * Donghua.tsx — LIVORIA
 *
 * Port penuh dari Anime.tsx, disesuaikan untuk Donghua:
 * - Service        : donghuaService (bukan animeService)
 * - QueryKey       : ['donghua']
 * - Genre          : DONGHUA_GENRES
 * - Upload folder  : 'donghua'
 * - Label UI       : "Donghua" (bukan "Anime")
 * - Icon utama     : Film (bukan Tv) — untuk membedakan visual
 * - watch_status   : TETAP ADA (DonghuaItem punya field yang sama)
 * - is_movie       : TETAP ADA (DonghuaItem sudah punya field ini)
 * - useWatchedAutoRemove: dipakai untuk Donghua juga
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  Plus, Search, Film, ImageIcon, Layers, X, Star,
  SlidersHorizontal, ExternalLink, Copy, Eye, Edit2,
  Trash2, ChevronDown, Filter, Clock,
  Grid3X3, List, MoreVertical, Bookmark, Heart, ChevronLeft, ChevronRight,
  CalendarClock, Building2, BookmarkPlus, CheckCircle, PlayCircle,
  Bookmark as BookmarkAlt,
} from 'lucide-react';
import { donghuaService, uploadImage } from '@/lib/supabase-service';
import type { DonghuaItem } from '@/lib/types';
import { DONGHUA_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ExportMenu from '@/components/shared/ExportMenu';
import GenreSelect from '@/components/shared/GenreSelect';
import { useBackGesture } from '@/hooks/useBackGesture';
import AnimeExtraFields, { type AnimeExtraData } from '@/components/shared/AnimeExtraFields';
import { buildGroupMap } from '@/lib/titleGrouping';
import { GroupActionMenu } from '@/components/GroupActionMenu';
import { useWatchedAutoRemove } from '@/hooks/useWatchedAutoRemove';

// ─── Types ─────────────────────────────────────────────────────────────────────
type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';
type SortMode = 'terbaru' | 'rating' | 'judul_az' | 'episode' | 'jadwal_terdekat' | 'tahun_terbaru';
type FilterStatus = 'all' | 'on-going' | 'completed' | 'planned';
type ViewMode = 'grid' | 'list';
type PageTab = 'semua' | 'watchlist';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

function formatDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

const emptyForm = {
  title: '', status: 'planned' as const, genre: '', rating: 0, episodes: 0,
  episodes_watched: 0, cover_url: '', synopsis: '', notes: '',
  season: 1, cour: '', streaming_url: '', schedule: '', parent_title: '',
  is_movie: false,
  duration_minutes: null as number | null,
};

const emptyExtra: AnimeExtraData = {
  release_year: null,
  studio: '',
  mal_url: '',
  anilist_url: '',
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
    label: 'Akan Rilis',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-400/15 dark:border-amber-400/30',
    dot: 'bg-amber-500',
  },
};

const WATCH_STATUS_CONFIG: Record<WatchStatus, { label: string; icon: any; color: string; bg: string }> = {
  none: {
    label: 'Belum Ditandai',
    icon: BookmarkAlt,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
  want_to_watch: {
    label: 'Mau Nonton',
    icon: BookmarkPlus,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300/50 dark:border-amber-600/40',
  },
  watching: {
    label: 'Sedang Nonton',
    icon: PlayCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300/50 dark:border-emerald-600/40',
  },
  watched: {
    label: 'Sudah Ditonton',
    icon: CheckCircle,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-300/50 dark:border-sky-600/40',
  },
};

const GENRE_PALETTE: Record<string, string> = {
  'Action': '#ef4444', 'Adventure': '#22c55e', 'Comedy': '#f59e0b',
  'Drama': '#a855f7', 'Fantasy': '#3b82f6', 'Horror': '#dc2626',
  'Mystery': '#8b5cf6', 'Romance': '#ec4899', 'Sci-Fi': '#06b6d4',
  'Slice of Life': '#10b981', 'Isekai': '#14b8a6', 'Supernatural': '#7c3aed',
  'Martial Arts': '#f97316', 'Cultivation': '#34d399', 'Wuxia': '#fb923c',
  'Xianxia': '#a78bfa', 'Xuanhuan': '#60a5fa', 'Psychological': '#6366f1',
  'School': '#0ea5e9', 'Mecha': '#64748b', 'Sports': '#f97316',
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

function extractExtra(item: DonghuaItem): AnimeExtraData {
  return {
    release_year: (item as any).release_year ?? null,
    studio: (item as any).studio ?? '',
    mal_url: (item as any).mal_url ?? '',
    anilist_url: (item as any).anilist_url ?? '',
    mal_id: (item as any).mal_id ?? null,
    anilist_id: (item as any).anilist_id ?? null,
    episodes: (item as any).episodes ?? null,
    synopsis_id: (item as any).synopsis ?? '',
  };
}

function getWatchStatus(item: DonghuaItem): WatchStatus {
  return ((item as any).watch_status as WatchStatus) || 'none';
}

function getCardBgClasses(isFavorite: boolean, isBookmarked: boolean, isMovie: boolean, watchStatus: WatchStatus): string {
  if (watchStatus === 'want_to_watch') return 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300/50 dark:border-amber-600/40';
  if (watchStatus === 'watching')      return 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300/40 dark:border-emerald-600/30';
  if (watchStatus === 'watched')       return 'bg-sky-50/40 dark:bg-sky-950/20 border-sky-300/40 dark:border-sky-600/30';
  if (isFavorite && isBookmarked)      return 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500';
  if (isFavorite)                      return 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500';
  if (isBookmarked)                    return 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500';
  if (isMovie)                         return 'bg-card border-violet-300/40 dark:border-violet-500/30';
  return 'bg-card border-border';
}

function MovieBadge({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-600/85 backdrop-blur-sm text-[8px] font-bold text-white leading-none">
        <Film className="w-1.5 h-1.5" />FILM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20">
      <Film className="w-2.5 h-2.5" />FILM
    </span>
  );
}

// ─── WatchStatusButton ────────────────────────────────────────────────────────
const MENU_WIDTH_WS = 192;
const GAP_WS = 8;

interface WatchStatusButtonProps {
  item: DonghuaItem;
  onUpdate: (item: DonghuaItem, newStatus: WatchStatus) => void;
  compact?: boolean;
}

function WatchStatusButton({ item, onUpdate, compact = false }: WatchStatusButtonProps) {
  const ws = getWatchStatus(item);
  const [showMenu, setShowMenu] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cfg = WATCH_STATUS_CONFIG[ws];
  const Icon = cfg.icon;

  const options: { status: WatchStatus; label: string; icon: any; color: string }[] = [
    { status: 'want_to_watch', label: 'Mau Nonton',   icon: BookmarkPlus, color: 'text-amber-600 dark:text-amber-400'   },
    { status: 'watching',      label: 'Sedang Nonton', icon: PlayCircle,   color: 'text-emerald-600 dark:text-emerald-400' },
    { status: 'watched',       label: 'Sudah Ditonton', icon: CheckCircle, color: 'text-sky-600 dark:text-sky-400'       },
    { status: 'none',          label: 'Hapus Penanda', icon: X,            color: 'text-muted-foreground'                },
  ];

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estimatedHeight = 48 + options.length * 40;
    let left = rect.right - MENU_WIDTH_WS;
    left = Math.max(GAP_WS, Math.min(left, vw - MENU_WIDTH_WS - GAP_WS));
    const spaceBelow = vh - rect.bottom - GAP_WS;
    const spaceAbove = rect.top - GAP_WS;
    const showAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
    const newStyle: React.CSSProperties = {
      position: 'fixed', left: `${left}px`, width: `${MENU_WIDTH_WS}px`, zIndex: 99999,
      maxHeight: showAbove ? Math.min(320, spaceAbove) : Math.min(320, Math.max(spaceBelow, 160)),
    };
    if (showAbove) { newStyle.bottom = `${vh - rect.top + GAP_WS}px`; newStyle.top = 'auto'; }
    else           { newStyle.top = `${rect.bottom + GAP_WS}px`; newStyle.bottom = 'auto'; }
    setMenuStyle(newStyle);
  }, [options.length]);

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    setShowMenu(true);
  }, []);

  useEffect(() => {
    if (showMenu) requestAnimationFrame(() => computePosition());
  }, [showMenu, computePosition]);

  useEffect(() => {
    if (!showMenu) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setShowMenu(false);
    };
    const onScroll = () => setShowMenu(false);
    const onResize = () => computePosition();
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
  }, [showMenu, computePosition]);

  const menuContent = showMenu ? (
    <div ref={menuRef} style={menuStyle} onClick={e => e.stopPropagation()}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col">
      <p className="px-3 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 shrink-0">
        Status Tonton
      </p>
      <div className="overflow-y-auto">
        {options.map(opt => {
          const OptIcon = opt.icon;
          const isActive = ws === opt.status;
          return (
            <button key={opt.status} type="button"
              onClick={e => { e.stopPropagation(); onUpdate(item, opt.status); setShowMenu(false); }}
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-xs transition-colors ${isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-muted'}`}>
              <OptIcon className={`w-3.5 h-3.5 shrink-0 ${opt.color}`} />
              <span className={isActive ? 'text-primary' : 'text-foreground'}>{opt.label}</span>
              {isActive && <CheckCircle className="w-3 h-3 ml-auto text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button ref={triggerRef} type="button" onClick={openMenu}
        className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all border
          ${compact ? 'px-1.5 py-1 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'}
          ${ws === 'none' ? 'bg-muted/60 border-border text-muted-foreground hover:bg-muted' : `${cfg.bg} ${cfg.color} border-current/20`}`}
        title="Status Tonton">
        <Icon className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />
        {!compact && <span>{cfg.label}</span>}
        {!compact && <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-60" />}
      </button>
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}

// ─── WatchedCountdown ─────────────────────────────────────────────────────────
function WatchedCountdown({ watchedAt }: { watchedAt: string }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    const AUTO_REMOVE_MS = 60 * 60 * 1000;
    const update = () => {
      const elapsed = Date.now() - new Date(watchedAt).getTime();
      const left = AUTO_REMOVE_MS - elapsed;
      if (left <= 0) { setRemaining('Segera dihapus...'); return; }
      const minutes = Math.floor(left / 60000);
      const seconds = Math.floor((left % 60000) / 1000);
      if (minutes >= 60) { setRemaining(''); return; }
      setRemaining(minutes > 0 ? `Dihapus dari watchlist dalam ${minutes}m ${seconds}s` : `Dihapus dari watchlist dalam ${seconds}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [watchedAt]);
  if (!remaining) return null;
  return (
    <p className="text-[9px] text-muted-foreground/70 flex items-center gap-0.5 mt-0.5">
      <Clock className="w-2 h-2 shrink-0" />{remaining}
    </p>
  );
}

// ─── WatchlistCard ────────────────────────────────────────────────────────────
interface WatchlistCardProps {
  item: DonghuaItem;
  onUpdateWatchStatus: (item: DonghuaItem, newStatus: WatchStatus) => void;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onView: () => void;
}

function WatchlistCard({ item, onUpdateWatchStatus, onEdit, onDelete, onView }: WatchlistCardProps) {
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const extra = extractExtra(item);
  const ws = getWatchStatus(item);
  const wsCfg = WATCH_STATUS_CONFIG[ws];
  const WsIcon = wsCfg.icon;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;

  return (
    <div className={`group relative rounded-2xl border overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${wsCfg.bg}`}
      onClick={onView}>
      <div className={`h-1 w-full ${ws === 'want_to_watch' ? 'bg-amber-400' : ws === 'watching' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
      <div className="flex gap-3 p-3">
        <div className="w-16 h-[90px] rounded-xl overflow-hidden shrink-0 bg-muted border border-border/30">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center">
                {item.is_movie ? <Film className="w-6 h-6 text-muted-foreground/30" /> : <Film className="w-6 h-6 text-muted-foreground/30" />}
              </div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 mb-1 flex-wrap">
            <h3 className="text-sm font-bold text-foreground leading-tight line-clamp-2 flex-1">{item.title}</h3>
            {item.is_movie && <MovieBadge size="xs" />}
          </div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
            </span>
            {(extra.studio || extra.release_year) && (
              <span className="text-[9px] text-muted-foreground">
                {extra.studio}{extra.studio && extra.release_year ? ' · ' : ''}{extra.release_year}
              </span>
            )}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mb-1.5">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[8px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
          {item.episodes > 0 && !item.is_movie && (
            <p className="text-[10px] text-muted-foreground mb-1">{item.episodes} episode</p>
          )}
          {item.is_movie && item.duration_minutes && (
            <p className="text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-0.5 mb-1">
              <Clock className="w-2.5 h-2.5" />{formatDurationLong(item.duration_minutes)}
            </p>
          )}
          {ws === 'watched' && (item as any).watched_at && (
            <WatchedCountdown watchedAt={(item as any).watched_at} />
          )}
          <div className="flex gap-1.5 pt-1.5 border-t border-border/30" onClick={e => e.stopPropagation()}>
            <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} />
            <div className="ml-auto flex gap-1">
              <button onClick={() => onEdit(item)} className="flex items-center justify-center p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors min-h-[30px] min-w-[30px]">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={() => onDelete(item)} className="flex items-center justify-center p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[30px] min-w-[30px]">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DonghuaCard ──────────────────────────────────────────────────────────────
interface DonghuaCardProps {
  item: DonghuaItem;
  stackCount: number;
  groupItems: DonghuaItem[];
  viewMode: ViewMode;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onView: () => void;
  onViewStack?: () => void;
  onToggleFavorite: () => void;
  onToggleBookmark: () => void;
  onUpdateWatchStatus: (item: DonghuaItem, newStatus: WatchStatus) => void;
  fanCoverUrls?: string[];
  index: number;
}

function DonghuaCard({
  item, stackCount, groupItems, viewMode, onEdit, onDelete, onView,
  onViewStack, onToggleFavorite, onToggleBookmark, onUpdateWatchStatus, fanCoverUrls = [],
}: DonghuaCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fan1Ref    = useRef<HTMLDivElement>(null);
  const fan2Ref    = useRef<HTMLDivElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── FIX: tutup menu saat klik di luar ──────────────────────────────────
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handler);
      document.addEventListener('touchstart', handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [menuOpen]);

  const statusCfg    = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const genres       = item.genre    ? item.genre.split(',').map(g => g.trim()).filter(Boolean)    : [];
  const schedules    = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
  const progress     = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;
  const isFavorite   = item.is_favorite;
  const isBookmarked = item.is_bookmarked;
  const isMovie      = item.is_movie;
  const ws           = getWatchStatus(item);
  const wsCfg        = WATCH_STATUS_CONFIG[ws];
  const WsIcon       = wsCfg.icon;
  const extra        = extractExtra(item);
  const hasStack     = stackCount > 0;
  const cardBgClasses = getCardBgClasses(!!isFavorite, !!isBookmarked, !!isMovie, ws);

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
      toast({ title: 'Link disalin!', description: item.streaming_url.slice(0, 50) });
    }
  };

  // ── LIST mode ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border cursor-pointer hover:border-primary/30 hover:bg-accent/30 transition-all ${cardBgClasses}`}
        onClick={onView}
      >
        <div className="relative w-12 sm:w-14 h-[72px] sm:h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center">
                <Film className="w-5 h-5 text-muted-foreground/40" />
              </div>}
          {isMovie && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-center">
              <span className="px-1 py-0.5 rounded bg-violet-600/90 text-[7px] font-bold text-white leading-none">FILM</span>
            </div>
          )}
          {ws !== 'none' && (
            <div className="absolute top-1 left-1">
              <WsIcon className={`w-3 h-3 drop-shadow-sm ${wsCfg.color}`} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
            </span>
            {isMovie && <MovieBadge />}
            {!isMovie && item.season > 1 && <span className="text-[10px] text-muted-foreground font-mono">S{item.season}</span>}
            {hasStack && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                <Layers className="w-2.5 h-2.5" />{stackCount + 1}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground leading-tight truncate mb-1">{item.title}</h3>
          {extra.studio && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mb-0.5">
              <Building2 className="w-2.5 h-2.5 shrink-0" />{extra.studio}
            </p>
          )}
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
        <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {item.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.rating}</span>
            </div>
          )}
          <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} compact />
          <button onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            className={`flex items-center justify-center p-2 rounded-xl transition-all min-w-[36px] min-h-[36px] ${isFavorite ? 'text-amber-500 bg-amber-100 dark:bg-amber-500/20' : 'text-muted-foreground bg-muted hover:text-amber-500'}`}>
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
          </button>
          {hasStack ? (
            <GroupActionMenu items={groupItems} trigger={
              <button className="flex items-center justify-center p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground transition-all min-w-[36px] min-h-[36px]">
                <MoreVertical className="w-4 h-4" />
              </button>
            } onEdit={onEdit} onDelete={onDelete} onViewStack={() => onViewStack?.()} />
          ) : (
            <div ref={menuRef} className="relative">
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
                className="flex items-center justify-center p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground transition-all min-w-[36px] min-h-[36px]"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[140px]"
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => { onEdit(item); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />Edit
                  </button>
                  <button
                    onClick={() => { onDelete(item); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />Hapus
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── GRID mode ──────────────────────────────────────────────────────────────
  const showScheduleBottom = !isMovie && item.status === 'on-going' && schedules.length > 0;
  const hasSeason = !isMovie && item.season > 0;
  const seasonStr = hasSeason ? `S${item.season}${item.cour ? ` · ${item.cour}` : ''}` : (!isMovie && item.cour ? item.cour : null);

  return (
    <div ref={wrapperRef} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {stackCount >= 2 && (
        <div ref={fan2Ref} className="absolute inset-x-3 top-1 bottom-0 rounded-2xl border border-border/50 overflow-hidden bg-card"
          style={{ transform: 'rotate(-3deg) translateY(-2px)', transformOrigin: 'bottom center' }}>
          {fanCoverUrls[1] ? <img src={fanCoverUrls[1]} alt="" className="w-full h-full object-cover opacity-70" loading="lazy" /> : null}
        </div>
      )}
      {stackCount >= 1 && (
        <div ref={fan1Ref} className="absolute inset-x-1.5 top-0.5 bottom-0 rounded-2xl border border-border/65 overflow-hidden bg-card"
          style={{ transform: 'rotate(-1.5deg) translateY(-1px)', transformOrigin: 'bottom center' }}>
          {fanCoverUrls[0] ? <img src={fanCoverUrls[0]} alt="" className="w-full h-full object-cover opacity-80" loading="lazy" /> : null}
        </div>
      )}
      <div
        className={`group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm z-10 border transition-colors ${cardBgClasses}`}
        onClick={hasStack ? onViewStack : onView}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                <Film className="w-10 h-10 text-muted-foreground/20" />
              </div>}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
              {statusCfg.label}
            </span>
          </div>

          {item.rating > 0 && (
            <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              <span className="text-[11px] font-bold text-amber-300">{item.rating}</span>
            </div>
          )}

          {ws !== 'none' && (
            <div className="absolute top-8 left-2">
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-sm text-[9px] font-bold border whitespace-nowrap
                ${ws === 'want_to_watch' ? 'bg-amber-500/85 text-white border-amber-400/30' :
                  ws === 'watching' ? 'bg-emerald-500/85 text-white border-emerald-400/30' :
                  'bg-sky-500/85 text-white border-sky-400/30'}`}>
                <WsIcon className="w-2 h-2 shrink-0" />{wsCfg.label}
              </span>
            </div>
          )}

          {isMovie && ws === 'none' && (
            <div className="absolute top-8 left-2">
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-600/90 backdrop-blur-sm text-[9px] font-bold text-white border border-violet-400/30">
                <Film className="w-2 h-2" />FILM
              </span>
            </div>
          )}

          <div className="absolute bottom-2.5 left-2.5 flex flex-col items-start gap-1">
            {showScheduleBottom && (
              <div className={`flex gap-0.5 flex-wrap ${hasStack ? 'max-w-[calc(100%-2.5rem)]' : ''}`}>
                {schedules.slice(0, 3).map(d => (
                  <span key={d} className="px-1.5 py-0.5 rounded-md bg-info/80 backdrop-blur-md text-[9px] font-bold text-white border border-info/30">{DAY_LABELS[d] || d}</span>
                ))}
              </div>
            )}
            {seasonStr && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-white/80 border border-white/10 whitespace-nowrap">
                {seasonStr}
              </span>
            )}
            {isMovie && item.duration_minutes && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-semibold text-violet-300 border border-violet-400/20 whitespace-nowrap">
                <Clock className="w-2.5 h-2.5" />{formatDuration(item.duration_minutes)}
              </span>
            )}
          </div>

          {hasStack && onViewStack && (
            <button onClick={e => { e.stopPropagation(); onViewStack(); }}
              className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/90 backdrop-blur-md text-[10px] font-semibold text-primary-foreground hover:bg-primary transition-colors z-10 border border-primary/40">
              <Layers className="w-3 h-3" /> {stackCount + 1}
            </button>
          )}
        </div>

        <div className="p-2 sm:p-3">
          <h3 className="font-bold text-[11px] sm:text-sm text-foreground leading-tight line-clamp-2 mb-1">{item.title}</h3>
          {(extra.studio || extra.release_year) && (
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              {extra.studio && <span className="text-[8px] sm:text-[9px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[80%]"><Building2 className="w-2 h-2 shrink-0" />{extra.studio}</span>}
              {extra.release_year && <span className="text-[8px] sm:text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0"><CalendarClock className="w-2 h-2 shrink-0" />{extra.release_year}</span>}
            </div>
          )}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mb-1.5">
              <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-md font-semibold max-w-full truncate"
                style={{ background: (GENRE_PALETTE[genres[0]] || '#64748b') + '20', color: GENRE_PALETTE[genres[0]] || 'hsl(var(--muted-foreground))' }}>
                {genres[0]}
              </span>
              {genres.length > 1 && <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold flex-shrink-0">+{genres.length - 1}</span>}
            </div>
          )}

          {isMovie ? (
            item.duration_minutes ? (
              <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-violet-600 dark:text-violet-400 mb-1.5">
                <Clock className="w-2 sm:w-2.5 h-2 sm:h-2.5 shrink-0" />
                <span className="font-semibold">{formatDurationLong(item.duration_minutes)}</span>
              </div>
            ) : null
          ) : (
            <div className="space-y-1 mb-1.5">
              {item.episodes > 0 ? (
                <>
                  <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground">
                    <Eye className="w-3 h-3 shrink-0" />
                    <span className="font-semibold text-foreground">{item.episodes_watched || 0}</span>
                    <span>/ {item.episodes} ep</span>
                  </div>
                  <div className="h-0.5 sm:h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${progress}%`, background: progress === 100 ? 'hsl(var(--success))' : (GENRE_PALETTE[genres[0]] || 'hsl(var(--primary))') }} />
                  </div>
                </>
              ) : null}
            </div>
          )}

          <div className="flex items-center justify-between gap-1 pt-1.5 sm:pt-2 border-t border-border/50" onClick={e => e.stopPropagation()}>
            <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} compact />
            <div className="flex items-center gap-0.5">
              {item.streaming_url && (
                <button onClick={e => { e.stopPropagation(); window.open(item.streaming_url, '_blank'); }}
                  className="flex items-center justify-center p-1.5 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors min-w-[30px] min-h-[30px]">
                  <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                </button>
              )}
              <button onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
                className={`flex items-center justify-center rounded-lg transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px] ${isFavorite ? 'text-amber-500 bg-amber-100 dark:bg-amber-500/25' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}>
                <Heart className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
              </button>
              <button onClick={e => { e.stopPropagation(); onToggleBookmark(); }}
                className={`flex items-center justify-center rounded-lg transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px] ${isBookmarked ? 'text-sky-500 bg-sky-100 dark:bg-sky-500/25' : 'text-muted-foreground hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10'}`}>
                <Bookmark className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isBookmarked ? 'fill-sky-500' : ''}`} />
              </button>
              {hasStack ? (
                <GroupActionMenu items={groupItems} trigger={
                  <button className="flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px]">
                    <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                } onEdit={onEdit} onDelete={onDelete} onViewStack={() => onViewStack?.()} />
              ) : (
                <div ref={menuRef} className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
                    className="flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px]"
                  >
                    <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                  {menuOpen && (
                    <div
                      className="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => { onEdit(item); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors min-w-[130px]"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => { onDelete(item); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AddCard ──────────────────────────────────────────────────────────────────
function AddCard({ viewMode, onClick }: { viewMode: ViewMode; onClick: () => void }) {
  if (viewMode === 'list') {
    return (
      <button onClick={onClick} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group w-full">
        <div className="w-14 h-20 rounded-xl border-2 border-dashed border-border group-hover:border-primary/40 flex items-center justify-center shrink-0 transition-colors">
          <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">Tambah Donghua / Film Baru</p>
      </button>
    );
  }
  return (
    <button onClick={onClick} className="rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group flex flex-col items-center justify-center cursor-pointer" style={{ aspectRatio: '2 / 3.35' }}>
      <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center px-2">Tambah</p>
    </button>
  );
}

// ─── StackDetailModal ─────────────────────────────────────────────────────────
interface StackDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: DonghuaItem[];
  initialIndex: number;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onUpdateWatchStatus: (item: DonghuaItem, newStatus: WatchStatus) => void;
}

function StackDetailModal({ open, onOpenChange, items, initialIndex, onEdit, onDelete, onUpdateWatchStatus }: StackDetailModalProps) {
  const [idx, setIdx] = useState(initialIndex);
  useEffect(() => { setIdx(initialIndex); }, [open, initialIndex]);
  const item = items[idx];
  if (!item) return null;

  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const ws = getWatchStatus(item);
  const wsCfg = WATCH_STATUS_CONFIG[ws];
  const isMovie = item.is_movie;
  const extra = extractExtra(item);
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [];
  const hasKnownEps = item.episodes > 0;
  const watched = item.episodes_watched || 0;
  const progress = hasKnownEps ? Math.min(100, (watched / item.episodes) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base sm:text-lg leading-tight flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            {item.title}
            {isMovie && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20"><Film className="w-2.5 h-2.5" />FILM</span>}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {cfg.label}
            {isMovie ? ' · Film' : (item.season > 1 ? ` · Season ${item.season}` : '')}
            {item.cour ? ` · ${item.cour}` : ''}
            {extra.studio ? ` · ${extra.studio}` : ''}
            {extra.release_year ? ` · ${extra.release_year}` : ''}
          </DialogDescription>
        </DialogHeader>

        {items.length > 1 && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border">
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
              {items.map((it, i) => (
                <button key={it.id} onClick={() => setIdx(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${i === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {it.is_movie ? '🎬' : `S${it.season || 1}`}{it.cour ? ` ${it.cour}` : ''}
                </button>
              ))}
            </div>
            <button onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}

        <div className="space-y-3 mt-1">
          {item.cover_url && (
            <div className="w-full max-w-[180px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-border shadow-sm">
              <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Watch status */}
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Tonton Saya</p>
            <div className="flex items-center gap-2 flex-wrap">
              <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} />
              <p className="text-[10px] text-muted-foreground">Terpisah dari status rilis</p>
            </div>
          </div>

          {/* Status + Rating */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
              <span className={`w-2 h-2 rounded-full mx-auto block mb-1 ${cfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
              <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Status Rilis</p>
            </div>
            {item.rating > 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
                <p className="text-sm font-bold">{item.rating}/10</p>
                <p className="text-[9px] text-muted-foreground">Rating</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                {isMovie ? (
                  <>
                    <Film className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                      {item.duration_minutes ? formatDuration(item.duration_minutes) : 'Film'}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Durasi</p>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm font-bold">{hasKnownEps ? `${watched}/${item.episodes}` : watched > 0 ? `${watched} ep` : '—'}</p>
                    <p className="text-[9px] text-muted-foreground">Episode</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Episode progress */}
          {!isMovie && hasKnownEps && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{watched} / {item.episodes} episode ditonton</span>
                <span className="font-mono font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: GENRE_PALETTE[genres[0]] || 'hsl(var(--primary))' }} />
              </div>
            </div>
          )}

          {/* Info MAL/AniList */}
          {(extra.studio || extra.release_year || extra.mal_url || extra.anilist_url || extra.mal_id || extra.anilist_id) && (
            <div className="rounded-xl border border-border p-3 space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Info Donghua</p>
              <div className="grid grid-cols-2 gap-2">
                {extra.release_year && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <CalendarClock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div><p className="text-[9px] text-muted-foreground">Tahun Rilis</p><p className="text-xs font-semibold">{extra.release_year}</p></div>
                  </div>
                )}
                {extra.studio && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div className="min-w-0"><p className="text-[9px] text-muted-foreground">Studio</p><p className="text-xs font-semibold truncate">{extra.studio}</p></div>
                  </div>
                )}
                {isMovie && item.duration_minutes ? (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Clock className="w-3 h-3 text-violet-500 shrink-0" />
                    <div><p className="text-[9px] text-muted-foreground">Durasi</p><p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{formatDurationLong(item.duration_minutes)}</p></div>
                  </div>
                ) : !isMovie && item.episodes > 0 ? (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Eye className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div><p className="text-[9px] text-muted-foreground">Episode</p><p className="text-xs font-semibold">{watched}/{item.episodes}</p></div>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {extra.mal_url && (
                  <a href={extra.mal_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-colors whitespace-nowrap"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-2.5 h-2.5" />MAL{extra.mal_id ? ` #${extra.mal_id}` : ''}
                  </a>
                )}
                {extra.anilist_url && (
                  <a href={extra.anilist_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-[10px] font-bold hover:bg-violet-500/20 transition-colors whitespace-nowrap"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-2.5 h-2.5" />AniList{extra.anilist_id ? ` #${extra.anilist_id}` : ''}
                  </a>
                )}
              </div>
            </div>
          )}

          {genres.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
              <div className="flex flex-wrap gap-1.5">
                {genres.map(g => (
                  <span key={g} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold"
                    style={{ background: (GENRE_PALETTE[g] || '#64748b') + '22', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {schedules.length > 0 && item.status === 'on-going' && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jadwal Tayang</p>
              <div className="flex flex-wrap gap-1.5">
                {schedules.map(d => (
                  <span key={d} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-[10px] font-semibold border border-info/20">
                    {DAY_LABELS[d] || d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {item.streaming_url && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link Streaming</p>
              <div className="flex gap-2">
                <button onClick={() => window.open(item.streaming_url, '_blank', 'noopener')}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors min-h-[44px]">
                  <ExternalLink className="w-3.5 h-3.5" /> {isMovie ? 'Tonton Film' : 'Tonton'}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]">
                  <Copy className="w-3.5 h-3.5" /> Salin
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
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Catatan Pribadi</p>
              <p className="text-sm text-foreground leading-relaxed">{item.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => { onOpenChange(false); setTimeout(() => onEdit(item), 200); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]">
              <Edit2 className="w-4 h-4" />Edit
            </button>
            <button onClick={() => { onOpenChange(false); setTimeout(() => onDelete(item), 200); }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]">
              <Trash2 className="w-4 h-4" />
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

  const [pageTab,        setPageTab]        = useState<PageTab>('semua');
  const [watchlistFilter, setWatchlistFilter] = useState<'all' | WatchStatus>('all');
  const [filter,         setFilter]         = useState<FilterStatus>('all');
  const [search,         setSearch]         = useState('');
  const [genreFilter,    setGenreFilter]    = useState('all');
  const [movieFilter,    setMovieFilter]    = useState<'all' | 'movie' | 'series'>('all');
  const [watchStatusFilter, setWatchStatusFilter] = useState<'all' | WatchStatus>('all');
  const [sortMode,       setSortMode]       = useState<SortMode>('terbaru');
  const [viewMode,       setViewMode]       = useState<ViewMode>('grid');
  const [showGenreDD,    setShowGenreDD]    = useState(false);
  const [showSortDD,     setShowSortDD]     = useState(false);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [deleteOpen,     setDeleteOpen]     = useState(false);
  const [stackDetailOpen, setStackDetailOpen] = useState(false);
  const [stackDetailItems, setStackDetailItems] = useState<DonghuaItem[]>([]);
  const [stackDetailInitIdx, setStackDetailInitIdx] = useState(0);
  const [detailOpen,     setDetailOpen]     = useState(false);
  const [detailItem,     setDetailItem]     = useState<DonghuaItem | null>(null);
  const [editItem,       setEditItem]       = useState<DonghuaItem | null>(null);
  const [deleteItem,     setDeleteItem]     = useState<DonghuaItem | null>(null);
  const [form,           setForm]           = useState(emptyForm);
  const [formWatchStatus, setFormWatchStatus] = useState<WatchStatus>('none');
  const [extraData,      setExtraData]      = useState<AnimeExtraData>(emptyExtra);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string[]>([]);
  const [coverFile,      setCoverFile]      = useState<File | null>(null);
  const [coverPreview,   setCoverPreview]   = useState('');
  const [uploading,      setUploading]      = useState(false);
  const [parentSearch,   setParentSearch]   = useState('');
  const [showParentDD,   setShowParentDD]   = useState(false);

  useBackGesture(modalOpen,       () => setModalOpen(false),       'donghua-form');
  useBackGesture(deleteOpen,      () => setDeleteOpen(false),      'donghua-delete');
  useBackGesture(stackDetailOpen, () => setStackDetailOpen(false), 'donghua-stack-detail');
  useBackGesture(detailOpen,      () => setDetailOpen(false),      'donghua-detail');

  // Auto-remove 'watched' setelah 1 jam — sama seperti Anime
  useWatchedAutoRemove();

  const { data: donghuaList = [], isLoading } = useQuery({ queryKey: ['donghua'], queryFn: donghuaService.getAll });

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.donghua-page-header', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      gsap.fromTo('.donghua-stat-pill', { opacity: 0, scale: 0.85, y: 8 }, { opacity: 1, scale: 1, y: 0, stagger: 0.07, duration: 0.4, ease: 'back.out(1.7)', delay: 0.15 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: async (row: Partial<DonghuaItem>) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'donghua'); setUploading(false); }
      return donghuaService.create({ ...row, cover_url: cover_url || row.cover_url || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donghua'] });
      setModalOpen(false); setCoverFile(null); setCoverPreview('');
      toast({ title: 'Berhasil ditambahkan ✨' });
    },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<DonghuaItem> & { id: string }) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'donghua'); setUploading(false); }
      return donghuaService.update(id, { ...row, cover_url: cover_url || row.cover_url || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donghua'] });
      setModalOpen(false); setCoverFile(null); setCoverPreview('');
      toast({ title: 'Berhasil diperbarui ✨' });
    },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => donghuaService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['donghua'] }); setDeleteOpen(false); toast({ title: 'Dihapus' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleFavoriteMut = useMutation({
    mutationFn: (item: DonghuaItem) => donghuaService.update(item.id, { is_favorite: !item.is_favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donghua'] }),
  });

  const toggleBookmarkMut = useMutation({
    mutationFn: (item: DonghuaItem) => donghuaService.update(item.id, { is_bookmarked: !item.is_bookmarked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['donghua'] }),
  });

  const updateWatchStatusMut = useMutation({
    mutationFn: ({ item, newStatus }: { item: DonghuaItem; newStatus: WatchStatus }) => {
      const payload: Record<string, any> = {
        watch_status: newStatus,
        watched_at: newStatus === 'watched' ? new Date().toISOString() : null,
      };
      return donghuaService.update(item.id, payload as any);
    },
    onSuccess: (_, { newStatus, item }) => {
      queryClient.invalidateQueries({ queryKey: ['donghua'] });
      const statusLabels: Record<WatchStatus, string> = {
        none: 'Penanda dihapus',
        want_to_watch: 'Ditandai: Mau Nonton',
        watching: 'Ditandai: Sedang Nonton',
        watched: 'Ditandai: Sudah Ditonton — akan dihapus dari watchlist dalam 1 jam',
      };
      toast({ title: statusLabels[newStatus], description: item.title });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const handleUpdateWatchStatus = useCallback((item: DonghuaItem, newStatus: WatchStatus) => {
    updateWatchStatusMut.mutate({ item, newStatus });
  }, [updateWatchStatusMut]);

  // ── Derived data ───────────────────────────────────────────────────────────
  const usedGenres = useMemo(() => {
    const s = new Set<string>();
    donghuaList.forEach(a => a.genre?.split(',').map(g => g.trim()).filter(Boolean).forEach(g => s.add(g)));
    return Array.from(s).sort();
  }, [donghuaList]);

  const { displayList, stackCounts, groupMap } = useMemo(() => buildGroupMap(donghuaList), [donghuaList]);

  const watchlistItems = useMemo(() => donghuaList.filter(a => getWatchStatus(a) !== 'none'), [donghuaList]);

  const watchlistFiltered = useMemo(() => {
    if (watchlistFilter === 'all') return watchlistItems;
    return watchlistItems.filter(a => getWatchStatus(a) === watchlistFilter);
  }, [watchlistItems, watchlistFilter]);

  const filtered = useMemo(() => {
    let r = displayList.filter(a => {
      const mf = filter === 'all' || a.status === filter;
      const ms = a.title.toLowerCase().includes(search.toLowerCase()) || (a.genre || '').toLowerCase().includes(search.toLowerCase());
      const mg = genreFilter === 'all' || (a.genre || '').toLowerCase().includes(genreFilter.toLowerCase());
      const mm = movieFilter === 'all' || (movieFilter === 'movie' ? a.is_movie : !a.is_movie);
      const mw = watchStatusFilter === 'all' || getWatchStatus(a) === watchStatusFilter;
      return mf && ms && mg && mm && mw;
    });
    if (sortMode === 'rating')          r = [...r].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortMode === 'judul_az')        r = [...r].sort((a, b) => a.title.localeCompare(b.title));
    if (sortMode === 'episode')         r = [...r].sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
    if (sortMode === 'jadwal_terdekat') r = [...r].sort((a, b) => getNearestDay(a.schedule || '') - getNearestDay(b.schedule || ''));
    if (sortMode === 'tahun_terbaru')   r = [...r].sort((a, b) => ((b as any).release_year || 0) - ((a as any).release_year || 0));
    return r;
  }, [displayList, filter, search, genreFilter, sortMode, movieFilter, watchStatusFilter]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null); setForm(emptyForm); setFormWatchStatus('none'); setExtraData(emptyExtra);
    setSelectedGenres([]); setSelectedSchedule([]);
    setCoverFile(null); setCoverPreview(''); setParentSearch(''); setModalOpen(true);
  };

  const openEdit = (item: DonghuaItem) => {
    setEditItem(item);
    setForm({
      title: item.title, status: item.status, genre: item.genre || '', rating: item.rating,
      episodes: item.episodes, episodes_watched: item.episodes_watched || 0,
      cover_url: item.cover_url || '', synopsis: item.synopsis || '', notes: item.notes || '',
      season: item.season || 1, cour: item.cour || '', streaming_url: item.streaming_url || '',
      schedule: item.schedule || '', parent_title: item.parent_title || '',
      is_movie: item.is_movie || false,
      duration_minutes: item.duration_minutes ?? null,
    });
    setFormWatchStatus(getWatchStatus(item));
    setExtraData(extractExtra(item));
    setSelectedGenres(item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : []);
    setSelectedSchedule(item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : []);
    setCoverPreview(item.cover_url || ''); setCoverFile(null);
    setParentSearch(item.parent_title || ''); setModalOpen(true);
  };

  const openDetail = (item: DonghuaItem) => { setDetailItem(item); setDetailOpen(true); };

  const openStackDetail = (representativeId: string, clickedItem?: DonghuaItem) => {
    const items = groupMap[representativeId];
    if (!items) return;
    const initIdx = clickedItem ? items.findIndex(it => it.id === clickedItem.id) : items.length - 1;
    setStackDetailItems(items);
    setStackDetailInitIdx(Math.max(0, initIdx));
    setStackDetailOpen(true);
  };

  const handleMovieToggle = useCallback((newIsMovie: boolean) => {
    setForm(prev => ({
      ...prev,
      is_movie: newIsMovie,
      season: newIsMovie ? 0 : (prev.season || 1),
      duration_minutes: newIsMovie ? prev.duration_minutes : null,
    }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      genre: selectedGenres.join(', '),
      schedule: (form.status === 'on-going' && !form.is_movie) ? selectedSchedule.join(',') : '',
      season: form.is_movie ? 0 : (form.season || 1),
      release_year: extraData.release_year ?? null,
      studio: extraData.studio || null,
      mal_url: extraData.mal_url || null,
      anilist_url: extraData.anilist_url || null,
      mal_id: extraData.mal_id ?? null,
      anilist_id: extraData.anilist_id ?? null,
      is_movie: form.is_movie,
      duration_minutes: form.is_movie ? (form.duration_minutes || null) : null,
      watch_status: formWatchStatus,
    };
    if (editItem) updateMut.mutate({ id: editItem.id, ...data });
    else createMut.mutate(data);
  };

  const existingGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    donghuaList.filter(a => !a.is_movie).forEach(a => keys.add((a.parent_title || a.title).trim()));
    if (editItem) keys.delete(editItem.title.trim());
    return Array.from(keys).sort();
  }, [donghuaList, editItem]);

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
    total: donghuaList.length,
    ongoing: donghuaList.filter(a => a.status === 'on-going').length,
    completed: donghuaList.filter(a => a.status === 'completed').length,
    planned: donghuaList.filter(a => a.status === 'planned').length,
    favorites: donghuaList.filter(a => a.is_favorite).length,
    movies: donghuaList.filter(a => a.is_movie).length,
    wantToWatch: donghuaList.filter(a => getWatchStatus(a) === 'want_to_watch').length,
    watching: donghuaList.filter(a => getWatchStatus(a) === 'watching').length,
    watched: donghuaList.filter(a => getWatchStatus(a) === 'watched').length,
  }), [donghuaList]);

  const ic = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";

  return (
    <div ref={containerRef}>
      {/* ── Header ── */}
      <div className="donghua-page-header mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Film className="w-4 h-4 text-primary" /></div>
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.12em]">Donghua & Film Archive</span>
            </div>
            <h1 className="page-header">Database Donghua 🎬</h1>
            <p className="page-subtitle">{donghuaList.length} judul · {stats.movies} film · {watchlistItems.length} di watchlist</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <ExportMenu data={donghuaList} filename="donghua-livoria" onImport={handleImport} />
            <button onClick={openAdd} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]">
              <Plus className="w-4 h-4" /><span>Tambah</span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Tayang',         value: stats.ongoing,      color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-400/15 dark:border-emerald-400/20 dark:text-emerald-400', dot: 'bg-emerald-500' },
            { label: 'Selesai Rilis',  value: stats.completed,    color: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-400/15 dark:border-sky-400/20 dark:text-sky-400', dot: 'bg-sky-500' },
            { label: 'Akan Rilis',     value: stats.planned,      color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-400/15 dark:border-amber-400/20 dark:text-amber-400', dot: 'bg-amber-500' },
            { label: 'Film',           value: stats.movies,       color: 'bg-violet-50 border-violet-200 text-violet-700 dark:bg-violet-400/15 dark:border-violet-400/20 dark:text-violet-400', icon: Film },
            { label: 'Mau Nonton',     value: stats.wantToWatch,  color: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-400/15 dark:border-amber-400/20 dark:text-amber-400', icon: BookmarkPlus },
            { label: 'Sedang Nonton',  value: stats.watching,     color: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-400/15 dark:border-emerald-400/20 dark:text-emerald-400', icon: PlayCircle },
            { label: 'Sudah Nonton',   value: stats.watched,      color: 'bg-sky-50 border-sky-200 text-sky-700 dark:bg-sky-400/15 dark:border-sky-400/20 dark:text-sky-400', icon: CheckCircle },
          ].map((s, i) => {
            const Icon = (s as any).icon;
            return (
              <div key={i} className={`donghua-stat-pill flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${s.color}`}>
                {Icon ? <Icon className="w-3 h-3" /> : <span className={`w-2 h-2 rounded-full shrink-0 ${(s as any).dot}`} />}
                <span className="font-bold">{s.value}</span>
                <span className="font-medium opacity-70">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Page Tabs ── */}
      <div className="flex gap-1 p-1 rounded-2xl bg-muted/60 w-fit mb-5">
        <button onClick={() => setPageTab('semua')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${pageTab === 'semua' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <Grid3X3 className="w-4 h-4" />
          <span className="hidden sm:inline">Koleksi</span>
        </button>
        <button onClick={() => setPageTab('watchlist')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${pageTab === 'watchlist' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
          <BookmarkPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Watchlist</span>
          {watchlistItems.length > 0 && (
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${pageTab === 'watchlist' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {watchlistItems.length}
            </span>
          )}
        </button>
      </div>

      {/* ── WATCHLIST TAB ── */}
      {pageTab === 'watchlist' && (
        <div>
          <div className="rounded-xl bg-info/5 border border-info/20 p-3 mb-4 flex items-start gap-2.5">
            <BookmarkPlus className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground">Status Tonton</span> terpisah dari status rilis donghua.
              Kamu bisa menandai donghua sebagai "Mau Nonton", "Sedang Nonton", atau "Sudah Ditonton" tanpa mengubah status rilisnya.
            </p>
          </div>

          <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
            {([
              { key: 'all',           label: `Semua (${watchlistItems.length})` },
              { key: 'want_to_watch', label: `Mau Nonton (${stats.wantToWatch})` },
              { key: 'watching',      label: `Sedang Nonton (${stats.watching})` },
              { key: 'watched',       label: `Sudah Ditonton (${stats.watched})` },
            ] as const).map(tab => (
              <button key={tab.key} onClick={() => setWatchlistFilter(tab.key as any)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0 ${watchlistFilter === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {watchlistFiltered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-20 h-20 rounded-3xl bg-muted/60 border border-border flex items-center justify-center">
                <BookmarkPlus className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground mb-1">
                  {watchlistFilter === 'all' ? 'Watchlist Kosong' : `Tidak Ada "${WATCH_STATUS_CONFIG[watchlistFilter as WatchStatus]?.label}"`}
                </p>
                <p className="text-sm text-muted-foreground">Tandai donghua dari koleksi dengan tombol status tonton.</p>
              </div>
              <button onClick={() => setPageTab('semua')} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all">
                <Film className="w-4 h-4" />Ke Koleksi
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {watchlistFiltered.map(item => (
                <WatchlistCard key={item.id} item={item}
                  onUpdateWatchStatus={handleUpdateWatchStatus}
                  onEdit={openEdit}
                  onDelete={i => { setDeleteItem(i); setDeleteOpen(true); }}
                  onView={() => openDetail(item)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── KOLEKSI TAB ── */}
      {pageTab === 'semua' && (
        <>
          {/* Controls */}
          <div className="space-y-3 mb-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari judul, genre..."
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-input bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all" />
                {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status rilis filter */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border">
                {([['all', 'Semua'], ['on-going', 'Tayang'], ['completed', 'Selesai Rilis'], ['planned', 'Akan Rilis']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {/* Film/serial filter */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border">
                {([['all', 'Semua'], ['series', 'Serial'], ['movie', 'Film']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setMovieFilter(k)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${movieFilter === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {k === 'movie' && <Film className="w-3 h-3" />}{l}
                  </button>
                ))}
              </div>
              {/* Watch status filter */}
              <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border">
                {([['all', 'Semua'], ['want_to_watch', 'Mau Nonton'], ['watching', 'Nonton'], ['watched', 'Selesai Nonton']] as const).map(([k, l]) => (
                  <button key={k} onClick={() => setWatchStatusFilter(k)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${watchStatusFilter === k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {l}
                  </button>
                ))}
              </div>

              {usedGenres.length > 0 && (
                <div className="relative">
                  <button onClick={() => setShowGenreDD(!showGenreDD)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${genreFilter !== 'all' ? 'border-primary bg-primary/10 text-primary' : 'border-input bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                    <Filter className="w-3.5 h-3.5" />{genreFilter === 'all' ? 'Genre' : genreFilter}
                    <ChevronDown className={`w-3 h-3 transition-transform ${showGenreDD ? 'rotate-180' : ''}`} />
                  </button>
                  {showGenreDD && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowGenreDD(false)} />
                      <div className="absolute left-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[180px] max-h-64 overflow-y-auto">
                        <button onClick={() => { setGenreFilter('all'); setShowGenreDD(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === 'all' ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>Semua Genre</button>
                        {usedGenres.map(g => (
                          <button key={g} onClick={() => { setGenreFilter(g); setShowGenreDD(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${genreFilter === g ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>
                            <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full shrink-0" style={{ background: GENRE_PALETTE[g] || '#64748b' }} />{g}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              <div className="relative">
                <button onClick={() => setShowSortDD(!showSortDD)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
                  <SlidersHorizontal className="w-3.5 h-3.5" /><span className="hidden sm:inline">Urutkan</span>
                </button>
                {showSortDD && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSortDD(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-2xl shadow-xl z-50 py-2 min-w-[180px]">
                      {([['terbaru', 'Terbaru'], ['rating', 'Rating Tertinggi'], ['judul_az', 'Judul A-Z'], ['episode', 'Episode Terbanyak'], ['jadwal_terdekat', 'Jadwal Terdekat'], ['tahun_terbaru', 'Tahun Terbaru']] as const).map(([k, l]) => (
                        <button key={k} onClick={() => { setSortMode(k); setShowSortDD(false); }} className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${sortMode === k ? 'text-primary font-semibold' : 'text-foreground hover:bg-muted'}`}>{l}</button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-1 p-1 rounded-xl bg-muted/60 border border-border ml-auto">
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><Grid3X3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><List className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-sm text-muted-foreground font-medium">Memuat koleksi donghua...</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
              {filtered.map((item, i) => (
                <div key={item.id} data-card-wrapper>
                  <DonghuaCard
                    item={item}
                    stackCount={stackCounts[item.id] || 0}
                    groupItems={groupMap[item.id] || [item]}
                    viewMode="grid"
                    index={i}
                    fanCoverUrls={(groupMap[item.id] || []).filter(it => it.id !== item.id).sort((a, b) => (a.season || 1) - (b.season || 1)).map(it => it.cover_url).filter(Boolean) as string[]}
                    onEdit={openEdit}
                    onDelete={(it) => { setDeleteItem(it); setDeleteOpen(true); }}
                    onView={() => openDetail(item)}
                    onViewStack={stackCounts[item.id] ? () => openStackDetail(item.id) : undefined}
                    onToggleFavorite={() => toggleFavoriteMut.mutate(item)}
                    onToggleBookmark={() => toggleBookmarkMut.mutate(item)}
                    onUpdateWatchStatus={handleUpdateWatchStatus}
                  />
                </div>
              ))}
              <div data-card-wrapper><AddCard viewMode="grid" onClick={openAdd} /></div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center"><Film className="w-10 h-10 text-muted-foreground/30" /></div>
              <div className="text-center">
                <p className="text-base font-bold text-foreground mb-1">Tidak ada donghua ditemukan</p>
                <p className="text-sm text-muted-foreground">{search ? `Tidak ada hasil untuk "${search}"` : 'Mulai tambahkan donghua favoritmu!'}</p>
              </div>
              {!search && <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all"><Plus className="w-4 h-4" />Tambah Pertama</button>}
            </div>
          ) : (
            <div ref={gridRef} className="space-y-2">
              {filtered.map((item, i) => (
                <div key={item.id} data-card-wrapper>
                  <DonghuaCard
                    item={item}
                    stackCount={stackCounts[item.id] || 0}
                    groupItems={groupMap[item.id] || [item]}
                    viewMode="list"
                    index={i}
                    onEdit={openEdit}
                    onDelete={(it) => { setDeleteItem(it); setDeleteOpen(true); }}
                    onView={() => openDetail(item)}
                    onViewStack={stackCounts[item.id] ? () => openStackDetail(item.id) : undefined}
                    onToggleFavorite={() => toggleFavoriteMut.mutate(item)}
                    onToggleBookmark={() => toggleBookmarkMut.mutate(item)}
                    onUpdateWatchStatus={handleUpdateWatchStatus}
                  />
                </div>
              ))}
              <AddCard viewMode="list" onClick={openAdd} />
            </div>
          )}
        </>
      )}

      {/* ── Stack Detail Modal ── */}
      <StackDetailModal open={stackDetailOpen} onOpenChange={setStackDetailOpen}
        items={stackDetailItems} initialIndex={stackDetailInitIdx}
        onEdit={openEdit} onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
        onUpdateWatchStatus={handleUpdateWatchStatus} />

      {/* ── Detail Modal ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          {detailItem && (() => {
            const item = detailItem;
            const freshItem = donghuaList.find(a => a.id === item.id) || item;
            const cfg = STATUS_CONFIG[freshItem.status] || STATUS_CONFIG.planned;
            const extra = extractExtra(freshItem);
            const genres = freshItem.genre ? freshItem.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
            const schedules = freshItem.schedule ? freshItem.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
            const progress = freshItem.episodes > 0
              ? Math.min(100, ((freshItem.episodes_watched || 0) / freshItem.episodes) * 100) : 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-lg leading-tight flex items-center gap-2 flex-wrap">
                    {freshItem.title}
                    {freshItem.is_movie && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20"><Film className="w-2.5 h-2.5" />FILM</span>}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {cfg.label}
                    {freshItem.is_movie ? ' · Film' : (freshItem.season > 1 ? ` · Season ${freshItem.season}` : '')}
                    {freshItem.cour ? ` · ${freshItem.cour}` : ''}
                    {extra.studio ? ` · ${extra.studio}` : ''}
                    {extra.release_year ? ` · ${extra.release_year}` : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  {freshItem.cover_url && (
                    <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-border">
                      <img src={freshItem.cover_url} alt={freshItem.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Watch status control */}
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Tonton Saya</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <WatchStatusButton item={freshItem} onUpdate={handleUpdateWatchStatus} />
                      <p className="text-[10px] text-muted-foreground">Terpisah dari status rilis</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
                      <span className={`w-2 h-2 rounded-full mx-auto block mb-1 ${cfg.dot} ${freshItem.status === 'on-going' ? 'animate-pulse' : ''}`} />
                      <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">Status Rilis</p>
                    </div>
                    {freshItem.rating > 0 && (
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                        <Star className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
                        <p className="text-sm font-bold">{freshItem.rating}/10</p>
                        <p className="text-[9px] text-muted-foreground">Rating</p>
                      </div>
                    )}
                  </div>

                  {(extra.studio || extra.release_year || extra.mal_url || extra.anilist_url) && (
                    <div className="rounded-xl border border-border p-3 space-y-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Info Donghua</p>
                      <div className="grid grid-cols-2 gap-2">
                        {extra.release_year && (<div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50"><CalendarClock className="w-3 h-3 text-muted-foreground shrink-0" /><div><p className="text-[9px] text-muted-foreground">Tahun Rilis</p><p className="text-xs font-semibold">{extra.release_year}</p></div></div>)}
                        {extra.studio && (<div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50"><Building2 className="w-3 h-3 text-muted-foreground shrink-0" /><div className="min-w-0"><p className="text-[9px] text-muted-foreground">Studio</p><p className="text-xs font-semibold truncate">{extra.studio}</p></div></div>)}
                        {freshItem.is_movie && freshItem.duration_minutes ? (
                          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50"><Clock className="w-3 h-3 text-violet-500 shrink-0" /><div><p className="text-[9px] text-muted-foreground">Durasi</p><p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{formatDurationLong(freshItem.duration_minutes)}</p></div></div>
                        ) : freshItem.episodes > 0 ? (
                          <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50"><Eye className="w-3 h-3 text-muted-foreground shrink-0" /><div><p className="text-[9px] text-muted-foreground">Episode</p><p className="text-xs font-semibold">{freshItem.episodes_watched || 0} / {freshItem.episodes}</p></div></div>
                        ) : null}
                      </div>
                      {!freshItem.is_movie && freshItem.episodes > 0 && (
                        <div><div className="flex justify-between text-[9px] text-muted-foreground mb-1"><span>Progress menonton</span><span>{Math.round(progress)}%</span></div><div className="h-1.5 bg-muted rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: GENRE_PALETTE[genres[0]] || 'hsl(var(--primary))' }} /></div></div>
                      )}
                      <div className="flex gap-1.5 flex-wrap">
                        {extra.mal_url && (<a href={extra.mal_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-colors" onClick={e => e.stopPropagation()}><ExternalLink className="w-2.5 h-2.5" />MAL{extra.mal_id ? ` #${extra.mal_id}` : ''}</a>)}
                        {extra.anilist_url && (<a href={extra.anilist_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-[10px] font-bold hover:bg-violet-500/20 transition-colors" onClick={e => e.stopPropagation()}><ExternalLink className="w-2.5 h-2.5" />AniList{extra.anilist_id ? ` #${extra.anilist_id}` : ''}</a>)}
                        {freshItem.streaming_url && (<button onClick={() => window.open(freshItem.streaming_url, '_blank')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-info/10 text-info text-[10px] font-bold hover:bg-info/20 transition-colors"><ExternalLink className="w-2.5 h-2.5" />Tonton</button>)}
                      </div>
                    </div>
                  )}

                  {genres.length > 0 && (<div className="rounded-xl border border-border p-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p><div className="flex flex-wrap gap-1.5">{genres.map(g => (<span key={g} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold" style={{ background: (GENRE_PALETTE[g] || '#64748b') + '22', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>{g}</span>))}</div></div>)}
                  {freshItem.synopsis && (<div className="rounded-xl border border-border p-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sinopsis</p><p className="text-sm text-foreground leading-relaxed">{freshItem.synopsis}</p></div>)}
                  {freshItem.notes && (<div className="rounded-xl border border-border p-3"><p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Catatan Pribadi</p><p className="text-sm text-foreground leading-relaxed">{freshItem.notes}</p></div>)}

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => openEdit(freshItem), 200); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]"><Edit2 className="w-4 h-4" />Edit</button>
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => { setDeleteItem(freshItem); setDeleteOpen(true); }, 200); }} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Modal ── */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              {editItem ? '✏️ Edit Donghua' : '✨ Tambah Donghua / Film'}
              {form.is_movie && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20"><Film className="w-2.5 h-2.5" />FILM</span>}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editItem ? 'Perbarui informasi.' : 'Gunakan pencarian MAL/AniList untuk auto-fill. Status rilis dan status tonton diisi terpisah.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* AnimeExtraFields — sama, bekerja untuk Donghua juga (database MAL/AniList universal) */}
            <AnimeExtraFields
              value={extraData}
              onChange={setExtraData}
              mediaType="donghua"
              titleHint={form.title}
              hasCoverOverride={!!coverFile}
              onTitleChange={v => setForm(prev => ({ ...prev, title: v }))}
              onCoverUrlChange={url => {
                if (!coverFile) { setCoverPreview(url); setForm(prev => ({ ...prev, cover_url: url })); }
              }}
              onGenresChange={setSelectedGenres}
              onEpisodesChange={eps => setForm(prev => ({ ...prev, episodes: eps }))}
              onSynopsisChange={synopsis => setForm(prev => ({ ...prev, synopsis }))}
              onStatusChange={status => setForm(prev => ({ ...prev, status }))}
              onSeasonChange={season => setForm(prev => ({ ...prev, season }))}
              onCourChange={cour => setForm(prev => ({ ...prev, cour }))}
              onParentTitleChange={parentTitle => { setForm(prev => ({ ...prev, parent_title: parentTitle })); setParentSearch(parentTitle); }}
              onRatingChange={rating => setForm(prev => ({ ...prev, rating }))}
              onIsMovieChange={isMovie => {
                setForm(prev => ({
                  ...prev, is_movie: isMovie,
                  season: isMovie ? 0 : (prev.season || 1),
                  duration_minutes: isMovie ? prev.duration_minutes : null,
                }));
              }}
              onDurationMinutesChange={mins => setForm(prev => ({ ...prev, duration_minutes: mins }))}
            />

            {/* Cover */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Cover Image
                {coverPreview && !coverFile && <span className="ml-2 text-[10px] text-info font-normal">(dari MAL/AniList — upload untuk mengganti)</span>}
              </label>
              <div className="flex items-center gap-4">
                <div onClick={() => coverInputRef.current?.click()}
                  className="w-20 h-[120px] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all shrink-0 relative group">
                  {coverPreview
                    ? <><img src={coverPreview} alt="Cover" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-[9px] font-bold">Ganti</span></div></>
                    : <div className="flex flex-col items-center gap-1.5 text-center px-2"><ImageIcon className="w-6 h-6 text-muted-foreground/40" /><span className="text-[9px] text-muted-foreground">Upload</span></div>
                  }
                </div>
                <div className="space-y-1.5">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Upload Cover Manual</button>
                  <p className="text-[10px] text-muted-foreground">{coverFile ? '✓ File dipilih' : coverPreview ? '📥 Cover dari MAL/AniList' : 'Atau gunakan auto-fill di atas'}</p>
                  {coverPreview && <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setForm(prev => ({ ...prev, cover_url: '' })); }} className="text-[11px] text-destructive hover:text-destructive/80">Hapus cover</button>}
                </div>
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); } }} />
            </div>

            {/* Judul */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Judul {form.is_movie ? 'Film' : 'Donghua'} *
              </label>
              <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={form.is_movie ? 'cth: Ne Zha 2' : 'cth: Battle Through the Heavens Season 6'}
                className={ic} required />
            </div>

            {/* Movie toggle */}
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${form.is_movie ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20' : 'border-border bg-muted/20'}`}>
              <div className="flex items-center gap-2">
                <Film className={`w-4 h-4 ${form.is_movie ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-semibold ${form.is_movie ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'}`}>
                    {form.is_movie ? '🎬 Ini adalah Film Donghua' : 'Tandai sebagai Film'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {form.is_movie ? 'Matikan untuk beralih ke mode serial' : 'Aktifkan jika ini film, bukan serial'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => handleMovieToggle(!form.is_movie)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${form.is_movie ? 'bg-violet-500' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_movie ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Season / Cour — hanya untuk serial */}
            {!form.is_movie && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Season</label>
                  <input type="number" value={form.season || ''} onChange={e => setForm(prev => ({ ...prev, season: Number(e.target.value) }))} placeholder="1" className={ic} min={1} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Cour / Part</label>
                  <input type="text" value={form.cour} onChange={e => setForm(prev => ({ ...prev, cour: e.target.value }))} placeholder="Part 2" className={ic} />
                </div>
              </div>
            )}

            {/* Group / Parent title — hanya untuk serial */}
            {!form.is_movie && (
              <div className="relative">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Kelompokkan Dengan</label>
                <input type="text" value={parentSearch}
                  onChange={e => { setParentSearch(e.target.value); setForm(prev => ({ ...prev, parent_title: e.target.value })); setShowParentDD(true); }}
                  onFocus={() => setShowParentDD(true)}
                  placeholder="Ketik atau pilih judul induk..." className={ic} />
                {showParentDD && filteredParentTitles.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowParentDD(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto">
                      <button type="button" onClick={() => { setForm(prev => ({ ...prev, parent_title: '' })); setParentSearch(''); setShowParentDD(false); }} className="w-full text-left px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted">— Tidak dikelompokkan —</button>
                      {filteredParentTitles.map(t => (
                        <button key={t} type="button" onClick={() => { setForm(prev => ({ ...prev, parent_title: t })); setParentSearch(t); setShowParentDD(false); }}
                          className={`w-full text-left px-3.5 py-2.5 text-sm truncate hover:bg-muted ${form.parent_title === t ? 'text-primary font-semibold' : 'text-foreground'}`}>{t}</button>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Tumpuk beberapa season menjadi satu card.</p>
              </div>
            )}

            {/* Status Rilis */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Status Rilis
                  <span className="ml-1 text-[9px] text-muted-foreground font-normal normal-case">(dari auto-fill / manual)</span>
                </label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))} className={ic}>
                  <option value="on-going">{form.is_movie ? 'Sedang Tayang' : 'On-Going'}</option>
                  <option value="completed">{form.is_movie ? 'Sudah Rilis' : 'Selesai Rilis'}</option>
                  <option value="planned">{form.is_movie ? 'Belum Rilis' : 'Akan Rilis'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Rating (0-10)</label>
                <input type="number" value={form.rating || ''} onChange={e => setForm(prev => ({ ...prev, rating: Number(e.target.value) }))} placeholder="9.5" className={ic} min={0} max={10} step={0.1} />
              </div>
            </div>

            {/* Status Tonton */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Status Tonton Saya
                <span className="ml-1 text-[9px] text-muted-foreground font-normal normal-case">(tidak mempengaruhi status rilis)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { value: 'none' as WatchStatus, label: 'Belum Ditandai', icon: BookmarkAlt, cls: 'border-border text-muted-foreground' },
                  { value: 'want_to_watch' as WatchStatus, label: 'Mau Nonton', icon: BookmarkPlus, cls: 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' },
                  { value: 'watching' as WatchStatus, label: 'Sedang Nonton', icon: PlayCircle, cls: 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' },
                  { value: 'watched' as WatchStatus, label: 'Sudah Ditonton', icon: CheckCircle, cls: 'border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' },
                ]).map(opt => {
                  const OptIcon = opt.icon;
                  const isActive = formWatchStatus === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setFormWatchStatus(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center transition-all ${isActive ? `${opt.cls} shadow-sm ring-2 ring-primary/20` : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-muted/20'}`}>
                      <OptIcon className={`w-4 h-4 ${isActive ? '' : 'text-muted-foreground'}`} />
                      <span className="text-[9px] font-semibold leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration (film) or Episodes (serial) */}
            {form.is_movie ? (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
                  <Clock className="w-3.5 h-3.5 text-violet-500" />Durasi Film (menit)
                </label>
                <input type="number" value={form.duration_minutes || ''} onChange={e => setForm(prev => ({ ...prev, duration_minutes: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="cth: 90, 120" className={ic} min={1} max={600} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Total Episode</label>
                  <input type="number" value={form.episodes || ''} onChange={e => setForm(prev => ({ ...prev, episodes: Number(e.target.value) }))} placeholder="cth: 156" className={ic} min={0} />
                </div>
                {(form.status === 'on-going' || form.status === 'completed') && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ditonton</label>
                    <input type="number" value={form.episodes_watched || ''} onChange={e => setForm(prev => ({ ...prev, episodes_watched: Number(e.target.value) }))} placeholder="cth: 80" className={ic} min={0} />
                  </div>
                )}
              </div>
            )}

            {/* Genre */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Genre</label>
              <GenreSelect genres={DONGHUA_GENRES} selected={selectedGenres} onChange={setSelectedGenres} />
            </div>

            {/* Jadwal — hanya serial on-going */}
            {form.status === 'on-going' && !form.is_movie && (
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

            {/* Streaming URL */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                {form.is_movie ? 'Link Tonton Film' : 'Link Streaming'}
              </label>
              <input type="url" value={form.streaming_url} onChange={e => setForm(prev => ({ ...prev, streaming_url: e.target.value }))} placeholder="https://..." className={ic} />
            </div>

            {/* Synopsis */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Sinopsis</label>
              <textarea value={form.synopsis} onChange={e => setForm(prev => ({ ...prev, synopsis: e.target.value }))} placeholder="Ringkasan cerita..." rows={3} className={`${ic} resize-none`} />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Catatan</label>
              <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className={`${ic} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending || uploading}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all ${form.is_movie ? 'bg-violet-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                {uploading ? 'Mengupload...' : createMut.isPending || updateMut.isPending ? 'Menyimpan...' : editItem ? 'Simpan' : (form.is_movie ? '🎬 Tambah Film' : 'Tambah')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Modal ── */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-destructive">Hapus {deleteItem?.is_movie ? 'Film' : 'Donghua'}</DialogTitle>
            <DialogDescription>Yakin hapus "{deleteItem?.title}"?</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setDeleteOpen(false)} className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
            <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} disabled={deleteMut.isPending}
              className="px-4 py-2.5 rounded-xl text-sm font-bold bg-destructive text-destructive-foreground hover:opacity-90 disabled:opacity-50 transition-all">
              {deleteMut.isPending ? 'Menghapus...' : 'Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Donghua;