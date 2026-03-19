/**
 * Donghua.tsx — LIVORIA
 *
 * PERBAIKAN:
 * - [FIX 1] Responsivitas modal: overflow-x-hidden pada DialogContent dan form element
 *   agar konten AnimeExtraFields tidak terpotong/dapat di-scroll horizontal
 * - [FIX 2] Card bookmark/favorit colors: getCardBgClasses identik dengan Anime.tsx,
 *   mutations toggleFavoriteMut & toggleBookmarkMut sudah ada dan benar
 * - [FIX 3] GroupActionMenu toggle: diperbaiki di GroupActionMenu.tsx (toggle open/close)
 * - Episode Quick-Action di WatchlistCard: tombol +/- episode, edit manual inline
 * - Status utama (on-going/completed/planned) = STATUS RILIS, tidak berubah oleh aksi tonton
 * - watch_status terpisah: 'none' | 'want_to_watch' | 'watching' | 'watched'
 * - Auto-remove 'watched' setelah 1 jam via useWatchedAutoRemove
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
  Bookmark as BookmarkAlt, Minus, Check,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── FIX 2: getCardBgClasses — identik dengan Anime.tsx ──────────────────────
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

function FilmBadge({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-600/85 backdrop-blur-sm text-[8px] font-bold text-white leading-none shrink-0">
        <Film className="w-1.5 h-1.5" />FILM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20 shrink-0">
      <Film className="w-2.5 h-2.5" />FILM
    </span>
  );
}

// ─── EpisodeInlineEditor ──────────────────────────────────────────────────────
interface EpisodeInlineEditorProps {
  watched: number;
  total: number;
  onSave: (watched: number, total?: number) => void;
}

function EpisodeInlineEditor({ watched, total, onSave }: EpisodeInlineEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(watched));
  const [totalVal, setTotalVal] = useState(String(total || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      setInputVal(String(watched));
      setTotalVal(String(total || ''));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [editing, watched, total]);

  const handleSave = () => {
    const w = Math.max(0, parseInt(inputVal) || 0);
    const t = totalVal ? Math.max(w, parseInt(totalVal) || 0) : undefined;
    onSave(w, t);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-10 text-center text-xs border border-primary rounded-md px-1 py-0.5 bg-background focus:outline-none"
          min={0}
        />
        <span className="text-[10px] text-muted-foreground">/</span>
        <input
          type="number"
          value={totalVal}
          onChange={e => setTotalVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="?"
          className="w-10 text-center text-xs border border-border rounded-md px-1 py-0.5 bg-background focus:outline-none"
          min={0}
        />
        <button
          onClick={handleSave}
          className="p-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onClick={() => setEditing(false)}
          className="p-1 rounded-md bg-muted hover:bg-accent transition-colors"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true); }}
      className="flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-muted/70 transition-colors group"
      title="Klik untuk edit episode"
    >
      <Eye className="w-3 h-3 text-muted-foreground" />
      <span className="text-[11px] font-bold text-foreground">
        {watched}{total > 0 ? `/${total}` : ''}
      </span>
      <span className="text-[9px] text-muted-foreground">ep</span>
      <Edit2 className="w-2.5 h-2.5 text-muted-foreground/40 group-hover:text-muted-foreground ml-0.5 transition-colors" />
    </button>
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
    { status: 'want_to_watch', label: 'Mau Nonton',    icon: BookmarkPlus, color: 'text-amber-600 dark:text-amber-400'    },
    { status: 'watching',      label: 'Sedang Nonton', icon: PlayCircle,   color: 'text-emerald-600 dark:text-emerald-400' },
    { status: 'watched',       label: 'Sudah Ditonton', icon: CheckCircle, color: 'text-sky-600 dark:text-sky-400'         },
    { status: 'none',          label: 'Hapus Penanda',  icon: X,           color: 'text-muted-foreground'                 },
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
          ${ws === 'none'
            ? 'bg-muted/60 border-border text-muted-foreground hover:bg-muted'
            : `${cfg.bg} ${cfg.color} border-current/20`
          }`}
        title="Status Tonton">
        <Icon className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />
        {!compact && <span className="truncate max-w-[90px]">{cfg.label}</span>}
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
      setRemaining(minutes > 0
        ? `Dihapus dari watchlist dalam ${minutes}m ${seconds}s`
        : `Dihapus dari watchlist dalam ${seconds}s`
      );
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

// ─── WatchlistCard ─────────────────────────────────────────────────────────────
interface WatchlistCardProps {
  item: DonghuaItem;
  onUpdateWatchStatus: (item: DonghuaItem, newStatus: WatchStatus) => void;
  onUpdateEpisode: (item: DonghuaItem, watched: number, total?: number) => void;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onView: () => void;
}

function WatchlistCard({ item, onUpdateWatchStatus, onUpdateEpisode, onEdit, onDelete, onView }: WatchlistCardProps) {
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const extra = extractExtra(item);
  const ws = getWatchStatus(item);
  const wsCfg = WATCH_STATUS_CONFIG[ws];
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const watched = item.episodes_watched || 0;
  const totalEp = item.episodes || 0;
  const progress = totalEp > 0 ? Math.min(100, (watched / totalEp) * 100) : 0;

  return (
    <div
      className={`group relative rounded-2xl border overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${wsCfg.bg}`}
      onClick={onView}
    >
      <div className={`h-1 w-full ${ws === 'want_to_watch' ? 'bg-amber-400' : ws === 'watching' ? 'bg-emerald-400' : 'bg-sky-400'}`} />
      <div className="flex gap-3 p-3">
        <div className="w-14 sm:w-16 h-[84px] sm:h-[90px] rounded-xl overflow-hidden shrink-0 bg-muted border border-border/30">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground/30" /></div>
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-1.5 mb-1 flex-wrap">
            <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight line-clamp-2 flex-1 min-w-0">{item.title}</h3>
            {item.is_movie && <FilmBadge size="xs" />}
          </div>
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
            </span>
            {(extra.studio || extra.release_year) && (
              <span className="text-[9px] text-muted-foreground truncate">
                {extra.studio}{extra.studio && extra.release_year ? ' · ' : ''}{extra.release_year}
              </span>
            )}
          </div>
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mb-1">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[8px] px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                  {g}
                </span>
              ))}
            </div>
          )}
          {item.is_movie && item.duration_minutes && (
            <p className="text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-0.5 mb-1">
              <Clock className="w-2.5 h-2.5 shrink-0" />{formatDurationLong(item.duration_minutes)}
            </p>
          )}
          {ws === 'watched' && (item as any).watched_at && (
            <WatchedCountdown watchedAt={(item as any).watched_at} />
          )}
          {!item.is_movie && (
            <div className="flex items-center gap-1.5 pt-1.5 mt-1 border-t border-border/30" onClick={e => e.stopPropagation()}>
              <button
                disabled={watched <= 0}
                onClick={() => onUpdateEpisode(item, Math.max(0, watched - 1))}
                className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted hover:bg-accent disabled:opacity-30 transition-colors text-muted-foreground hover:text-foreground"
                title="Kurangi 1 episode"
              >
                <Minus className="w-3 h-3" />
              </button>
              <div className="flex-1 flex items-center justify-center">
                <EpisodeInlineEditor watched={watched} total={totalEp} onSave={(w, t) => onUpdateEpisode(item, w, t)} />
              </div>
              <button
                disabled={totalEp > 0 && watched >= totalEp}
                onClick={() => onUpdateEpisode(item, watched + 1)}
                className="flex items-center justify-center gap-0.5 px-2 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors text-[10px] font-bold"
                title="Tambah 1 episode"
              >
                <Plus className="w-3 h-3" /><span>Ep</span>
              </button>
            </div>
          )}
          {!item.is_movie && totalEp > 0 && (
            <div className="mt-1.5">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${progress}%`, background: progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))' }} />
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5 text-right">{Math.round(progress)}%</p>
            </div>
          )}
          <div className="flex gap-1.5 pt-1.5 border-t border-border/30 mt-1" onClick={e => e.stopPropagation()}>
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
  // FIX 3: menuOpen sebagai toggle yang benar untuk non-stacked card
  const [menuOpen, setMenuOpen] = useState(false);

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
  const schedules    = item.schedule ? item.schedule.split(',').map(s => s.trim().filter(Boolean)) : [];
  const progress     = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;
  const isFavorite   = item.is_favorite;
  const isBookmarked = item.is_bookmarked;
  const isMovie      = item.is_movie;
  const ws           = getWatchStatus(item);
  const wsCfg        = WATCH_STATUS_CONFIG[ws];
  const WsIcon       = wsCfg.icon;
  const extra        = extractExtra(item);
  const hasStack     = stackCount > 0;
  // FIX 2: gunakan getCardBgClasses yang sudah lengkap
  const cardBgClasses = getCardBgClasses(!!isFavorite, !!isBookmarked, !!isMovie, ws);

  const schedArr = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];

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

  // ── LIST mode ──────────────────────────────────────────────────────────────
  if (viewMode === 'list') {
    return (
      <div
        className={`donghua-card group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border cursor-pointer hover:border-primary/30 hover:bg-accent/30 transition-all ${cardBgClasses}`}
        onClick={onView}
      >
        <div className="relative w-12 sm:w-14 h-[72px] sm:h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5 text-muted-foreground/40" /></div>
          }
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
            {isMovie && <FilmBadge />}
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
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={e => e.stopPropagation()}>
          {item.rating > 0 && (
            <div className="hidden sm:flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{item.rating}</span>
            </div>
          )}
          <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} compact />
          <button
            onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
            className={`flex items-center justify-center p-2 rounded-xl transition-all min-w-[36px] min-h-[36px] ${isFavorite ? 'text-amber-500 bg-amber-100 dark:bg-amber-500/20' : 'text-muted-foreground bg-muted hover:text-amber-500'}`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-amber-500' : ''}`} />
          </button>
          <button
            onClick={e => { e.stopPropagation(); onToggleBookmark(); }}
            className={`flex items-center justify-center p-2 rounded-xl transition-all min-w-[36px] min-h-[36px] ${isBookmarked ? 'text-sky-500 bg-sky-100 dark:bg-sky-500/20' : 'text-muted-foreground bg-muted hover:text-sky-500'}`}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-sky-500' : ''}`} />
          </button>
          {hasStack ? (
            <GroupActionMenu
              items={groupItems}
              trigger={
                <button className="flex items-center justify-center p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground transition-all min-w-[36px] min-h-[36px]">
                  <MoreVertical className="w-4 h-4" />
                </button>
              }
              onEdit={onEdit}
              onDelete={onDelete}
              onViewStack={() => onViewStack?.()}
            />
          ) : (
            <div ref={menuRef} className="relative">
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
                className="flex items-center justify-center p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground transition-all min-w-[36px] min-h-[36px]"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[140px]" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { onEdit(item); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />Edit
                  </button>
                  <button onClick={() => { onDelete(item); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors text-destructive">
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
  const showScheduleBottom = !isMovie && item.status === 'on-going' && schedArr.length > 0;
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
        className={`donghua-card group relative rounded-2xl overflow-hidden cursor-pointer shadow-sm z-10 border transition-colors ${cardBgClasses}`}
        onClick={hasStack ? onViewStack : onView}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center flex-col gap-2"><Film className="w-10 h-10 text-muted-foreground/20" /></div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          <div className="absolute top-2 left-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />{statusCfg.label}
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
                {schedArr.slice(0, 3).map(d => (
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
              <button
                onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
                className={`flex items-center justify-center rounded-lg transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px] ${isFavorite ? 'text-amber-500 bg-amber-100 dark:bg-amber-500/25' : 'text-muted-foreground hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10'}`}
              >
                <Heart className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isFavorite ? 'fill-amber-500' : ''}`} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onToggleBookmark(); }}
                className={`flex items-center justify-center rounded-lg transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px] ${isBookmarked ? 'text-sky-500 bg-sky-100 dark:bg-sky-500/25' : 'text-muted-foreground hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-500/10'}`}
              >
                <Bookmark className={`w-4 h-4 sm:w-3.5 sm:h-3.5 ${isBookmarked ? 'fill-sky-500' : ''}`} />
              </button>

              {/* FIX 3: GroupActionMenu untuk stacked card — toggle handled di GroupActionMenu.tsx */}
              {hasStack ? (
                <GroupActionMenu
                  items={groupItems}
                  trigger={
                    <button className="flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px]">
                      <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  }
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewStack={() => onViewStack?.()}
                />
              ) : (
                <div ref={menuRef} className="relative">
                  <button
                    onClick={e => { e.stopPropagation(); setMenuOpen(prev => !prev); }}
                    className="flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all min-w-[30px] min-h-[30px] sm:min-w-[26px] sm:min-h-[26px]"
                  >
                    <MoreVertical className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { onEdit(item); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors min-w-[130px]">
                        <Edit2 className="w-3.5 h-3.5" /> Edit
                      </button>
                      <button onClick={() => { onDelete(item); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors">
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
function AddCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="donghua-card group relative rounded-2xl border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all duration-300 flex flex-col items-center justify-center gap-2 aspect-[2/3] cursor-pointer"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
        <Plus className="w-5 h-5 text-primary" />
      </div>
      <span className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">Tambah</span>
    </button>
  );
}

// ─── StackDetailModal ─────────────────────────────────────────────────────────
interface StackDetailModalProps {
  items: DonghuaItem[];
  groupTitle: string;
  open: boolean;
  onClose: () => void;
  onEdit: (item: DonghuaItem) => void;
  onDelete: (item: DonghuaItem) => void;
  onView: (item: DonghuaItem) => void;
  onToggleFavorite: (item: DonghuaItem) => void;
  onToggleBookmark: (item: DonghuaItem) => void;
  onUpdateWatchStatus: (item: DonghuaItem, newStatus: WatchStatus) => void;
}

function StackDetailModal({
  items, groupTitle, open, onClose, onEdit, onDelete, onView,
  onToggleFavorite, onToggleBookmark, onUpdateWatchStatus,
}: StackDetailModalProps) {
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg max-h-[85dvh] overflow-y-auto overflow-x-hidden rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Layers className="w-4 h-4 text-primary" />
            {groupTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {items.length} season / entri dalam grup ini
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {items.sort((a, b) => (a.season || 0) - (b.season || 0)).map(item => {
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
            const ws = getWatchStatus(item);
            const wsCfg = WATCH_STATUS_CONFIG[ws];
            const WsIcon = wsCfg.icon;
            return (
              <div key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${getCardBgClasses(!!item.is_favorite, !!item.is_bookmarked, !!item.is_movie, ws)}`}
                onClick={() => { onView(item); onClose(); }}
              >
                <div className="w-10 h-14 rounded-lg overflow-hidden shrink-0 bg-muted">
                  {item.cover_url
                    ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    : <div className="w-full h-full flex items-center justify-center"><Film className="w-4 h-4 text-muted-foreground/30" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
                      <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                    </span>
                    {item.is_movie && <FilmBadge size="xs" />}
                    {!item.is_movie && item.season > 1 && (
                      <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1 py-0.5 rounded">S{item.season}</span>
                    )}
                    {ws !== 'none' && (
                      <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold ${wsCfg.color}`}>
                        <WsIcon className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-tight truncate">{item.title}</p>
                  {item.rating > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{item.rating}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} compact />
                  <button onClick={() => onToggleFavorite(item)}
                    className={`p-1.5 rounded-lg transition-all ${item.is_favorite ? 'text-amber-500 bg-amber-100 dark:bg-amber-500/20' : 'text-muted-foreground bg-muted hover:text-amber-500'}`}>
                    <Heart className={`w-3.5 h-3.5 ${item.is_favorite ? 'fill-amber-500' : ''}`} />
                  </button>
                  <button onClick={() => onToggleBookmark(item)}
                    className={`p-1.5 rounded-lg transition-all ${item.is_bookmarked ? 'text-sky-500 bg-sky-100 dark:bg-sky-500/20' : 'text-muted-foreground bg-muted hover:text-sky-500'}`}>
                    <Bookmark className={`w-3.5 h-3.5 ${item.is_bookmarked ? 'fill-sky-500' : ''}`} />
                  </button>
                  <button onClick={() => { onEdit(item); onClose(); }}
                    className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => { onDelete(item); onClose(); }}
                    className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── DetailModal (View) ───────────────────────────────────────────────────────
interface DetailModalProps {
  item: DonghuaItem | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
  onUpdateWatchStatus: (item: DonghuaItem, newStatus: WatchStatus) => void;
}

function DetailModal({ item, open, onClose, onEdit, onUpdateWatchStatus }: DetailModalProps) {
  if (!item) return null;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const extra = extractExtra(item);
  const ws = getWatchStatus(item);
  const wsCfg = WATCH_STATUS_CONFIG[ws];
  const progress = item.episodes > 0 ? Math.min(100, ((item.episodes_watched || 0) / item.episodes) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-2xl p-0">
        <div className="relative">
          {item.cover_url ? (
            <div className="relative h-48 sm:h-56 overflow-hidden rounded-t-2xl">
              <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3 left-3 right-12">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusCfg.bg} ${statusCfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                  </span>
                  {item.is_movie && <FilmBadge size="xs" />}
                </div>
                <h2 className="text-white font-bold text-base sm:text-lg leading-tight">{item.title}</h2>
              </div>
              <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-black/60 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-start justify-between p-4 pb-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />{statusCfg.label}
                  </span>
                  {item.is_movie && <FilmBadge />}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight">{item.title}</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors ml-2 shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Watch Status */}
          <div className={`flex items-center gap-2 p-3 rounded-xl border ${ws !== 'none' ? wsCfg.bg : 'bg-muted/30 border-border'}`}>
            <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} />
            {ws === 'watched' && (item as any).watched_at && (
              <WatchedCountdown watchedAt={(item as any).watched_at} />
            )}
          </div>

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {(extra.studio || extra.release_year) && (
              <div className="col-span-2 flex items-center gap-3 flex-wrap">
                {extra.studio && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Building2 className="w-3 h-3 shrink-0" />
                    <span className="font-medium text-foreground">{extra.studio}</span>
                  </span>
                )}
                {extra.release_year && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <CalendarClock className="w-3 h-3 shrink-0" />
                    <span className="font-medium text-foreground">{extra.release_year}</span>
                  </span>
                )}
              </div>
            )}
            {item.rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">{item.rating}</span>
                <span className="text-muted-foreground">/ 10</span>
              </div>
            )}
            {!item.is_movie && item.season > 0 && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">S{item.season}{item.cour ? ` · ${item.cour}` : ''}</span>
              </div>
            )}
            {item.is_movie && item.duration_minutes && (
              <div className="flex items-center gap-1 text-violet-600 dark:text-violet-400">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold">{formatDurationLong(item.duration_minutes)}</span>
              </div>
            )}
          </div>

          {/* Episodes */}
          {!item.is_movie && item.episodes > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  <Eye className="w-3 h-3" />Progress Tonton
                </span>
                <span className="text-xs font-bold text-foreground">{item.episodes_watched || 0}/{item.episodes} ep</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))' }} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 text-right">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Schedule */}
          {!item.is_movie && item.status === 'on-going' && item.schedule && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" />Jadwal:</span>
              {item.schedule.split(',').map(d => d.trim()).filter(Boolean).map(d => (
                <span key={d} className="px-2 py-0.5 rounded-full bg-info/10 text-info text-xs font-semibold border border-info/20">{d}</span>
              ))}
            </div>
          )}

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {genres.map(g => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full font-semibold border"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '15', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))', borderColor: (GENRE_PALETTE[g] || '#64748b') + '40' }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {/* Synopsis */}
          {item.synopsis && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">Sinopsis</p>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{item.synopsis}</p>
            </div>
          )}

          {/* Notes */}
          {item.notes && (
            <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-500/20">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Catatan Pribadi</p>
              <p className="text-xs text-foreground/80 whitespace-pre-wrap">{item.notes}</p>
            </div>
          )}

          {/* External links */}
          {(extra.mal_url || extra.anilist_url || item.streaming_url) && (
            <div className="flex flex-wrap gap-2">
              {extra.mal_url && (
                <a href={extra.mal_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-xs font-semibold border border-blue-200 dark:border-blue-500/30 hover:bg-blue-100 transition-colors">
                  <ExternalLink className="w-3 h-3" />MyAnimeList
                </a>
              )}
              {extra.anilist_url && (
                <a href={extra.anilist_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30 text-teal-600 dark:text-teal-400 text-xs font-semibold border border-teal-200 dark:border-teal-500/30 hover:bg-teal-100 transition-colors">
                  <ExternalLink className="w-3 h-3" />AniList
                </a>
              )}
              {item.streaming_url && (
                <a href={item.streaming_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 transition-colors">
                  <ExternalLink className="w-3 h-3" />Streaming
                </a>
              )}
            </div>
          )}

          <button onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-semibold border border-primary/20">
            <Edit2 className="w-3.5 h-3.5" />Edit Donghua Ini
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Donghua Page ────────────────────────────────────────────────────────
export default function Donghua() {
  const qc = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortMode, setSortMode]       = useState<SortMode>('terbaru');
  const [viewMode, setViewMode]       = useState<ViewMode>('grid');
  const [pageTab, setPageTab]         = useState<PageTab>('semua');

  const [modalOpen, setModalOpen]     = useState(false);
  const [editItem, setEditItem]       = useState<DonghuaItem | null>(null);
  const [viewItem, setViewItem]       = useState<DonghuaItem | null>(null);
  const [deleteItem, setDeleteItem]   = useState<DonghuaItem | null>(null);
  const [stackGroup, setStackGroup]   = useState<{ title: string; items: DonghuaItem[] } | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterGenre, setFilterGenre] = useState('');
  const [filterFav, setFilterFav]     = useState(false);
  const [filterBookmark, setFilterBookmark] = useState(false);
  const [filterWatchStatus, setFilterWatchStatus] = useState<WatchStatus | 'all'>('all');

  const [form, setForm]               = useState({ ...emptyForm });
  const [extra, setExtra]             = useState<AnimeExtraData>({ ...emptyExtra });
  const [coverFile, setCoverFile]     = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [imageUploadMode, setImageUploadMode] = useState<'url' | 'upload'>('url');

  const headerRef = useRef<HTMLDivElement>(null);
  const gridRef   = useRef<HTMLDivElement>(null);

  // ── Auto-remove watched after 1h ─────────────────────────────────────────
  useWatchedAutoRemove('donghua', () => qc.invalidateQueries({ queryKey: ['donghua'] }));
  useBackGesture();

  // ── Query ────────────────────────────────────────────────────────────────
  const { data: allItems = [], isLoading } = useQuery({
    queryKey: ['donghua'],
    queryFn:  () => donghuaService.getAll(),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const addMut = useMutation({
    mutationFn: (data: Partial<DonghuaItem>) => donghuaService.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donghua'] }); toast({ title: '✨ Donghua ditambahkan!' }); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DonghuaItem> }) => donghuaService.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donghua'] }); toast({ title: '✅ Donghua diperbarui!' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => donghuaService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['donghua'] }); toast({ title: '🗑️ Donghua dihapus.' }); },
  });

  // FIX 2: mutations favorit & bookmark tersedia di Donghua sama seperti Anime
  const toggleFavoriteMut = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => donghuaService.update(id, { is_favorite: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donghua'] }),
  });

  const toggleBookmarkMut = useMutation({
    mutationFn: ({ id, val }: { id: string; val: boolean }) => donghuaService.update(id, { is_bookmarked: val }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donghua'] }),
  });

  const watchStatusMut = useMutation({
    mutationFn: ({ id, status, watchedAt }: { id: string; status: WatchStatus; watchedAt?: string }) =>
      donghuaService.update(id, { watch_status: status, ...(watchedAt ? { watched_at: watchedAt } : { watched_at: null }) } as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donghua'] }),
  });

  const episodeMut = useMutation({
    mutationFn: ({ id, watched, total }: { id: string; watched: number; total?: number }) =>
      donghuaService.update(id, { episodes_watched: watched, ...(total !== undefined ? { episodes: total } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['donghua'] }),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleUpdateWatchStatus = useCallback((item: DonghuaItem, newStatus: WatchStatus) => {
    const watchedAt = newStatus === 'watched' ? new Date().toISOString() : undefined;
    watchStatusMut.mutate({ id: item.id, status: newStatus, watchedAt });
    toast({
      title: newStatus === 'none' ? '🗑️ Penanda dihapus' : `${WATCH_STATUS_CONFIG[newStatus].label}`,
      description: item.title,
    });
  }, [watchStatusMut]);

  const handleUpdateEpisode = useCallback((item: DonghuaItem, watched: number, total?: number) => {
    episodeMut.mutate({ id: item.id, watched, total });
    if (total !== undefined && watched >= total && total > 0) {
      toast({ title: '🎉 Semua episode ditonton!', description: item.title });
    }
  }, [episodeMut]);

  const handleToggleFavorite = useCallback((item: DonghuaItem) => {
    toggleFavoriteMut.mutate({ id: item.id, val: !item.is_favorite });
    toast({ title: item.is_favorite ? '💔 Dihapus dari favorit' : '❤️ Ditambah ke favorit', description: item.title });
  }, [toggleFavoriteMut]);

  const handleToggleBookmark = useCallback((item: DonghuaItem) => {
    toggleBookmarkMut.mutate({ id: item.id, val: !item.is_bookmarked });
    toast({ title: item.is_bookmarked ? '🔖 Bookmark dihapus' : '🔖 Di-bookmark!', description: item.title });
  }, [toggleBookmarkMut]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm });
    setExtra({ ...emptyExtra });
    setCoverFile(null);
    setCoverPreview('');
    setModalOpen(true);
  };

  const openEdit = (item: DonghuaItem) => {
    setEditItem(item);
    setForm({
      title: item.title || '',
      status: item.status,
      genre: item.genre || '',
      rating: item.rating || 0,
      episodes: item.episodes || 0,
      episodes_watched: item.episodes_watched || 0,
      cover_url: item.cover_url || '',
      synopsis: item.synopsis || '',
      notes: item.notes || '',
      season: item.season || 1,
      cour: (item as any).cour || '',
      streaming_url: item.streaming_url || '',
      schedule: item.schedule || '',
      parent_title: (item as any).parent_title || '',
      is_movie: item.is_movie || false,
      duration_minutes: (item as any).duration_minutes ?? null,
    });
    setExtra(extractExtra(item));
    setCoverFile(null);
    setCoverPreview(item.cover_url || '');
    setModalOpen(true);
  };

  const handleExtraFill = (data: AnimeExtraData) => {
    setExtra(prev => ({ ...prev, ...data }));
    if (data.episodes && !form.episodes) setForm(prev => ({ ...prev, episodes: data.episodes! }));
    if (data.synopsis_id && !form.synopsis) setForm(prev => ({ ...prev, synopsis: data.synopsis_id! }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast({ title: 'Judul wajib diisi', variant: 'destructive' }); return; }
    setFormLoading(true);
    try {
      let coverUrl = form.cover_url;
      if (coverFile) coverUrl = await uploadImage(coverFile, 'donghua-covers');

      const payload: Partial<DonghuaItem> = {
        title: form.title.trim(),
        status: form.status,
        genre: form.genre,
        rating: form.rating,
        episodes: form.is_movie ? 1 : form.episodes,
        episodes_watched: form.is_movie ? 0 : form.episodes_watched,
        cover_url: coverUrl,
        synopsis: form.synopsis,
        notes: form.notes,
        season: form.is_movie ? 0 : (form.season || 1),
        streaming_url: form.streaming_url,
        schedule: form.is_movie ? '' : form.schedule,
        is_movie: form.is_movie,
        ...(extra.release_year !== null && { release_year: extra.release_year }),
        ...(extra.studio  && { studio:      extra.studio  }),
        ...(extra.mal_url && { mal_url:     extra.mal_url }),
        ...(extra.anilist_url && { anilist_url: extra.anilist_url }),
        ...(extra.mal_id  !== undefined && { mal_id:      extra.mal_id  }),
        ...(extra.anilist_id !== undefined && { anilist_id:  extra.anilist_id }),
        ...((form as any).cour !== undefined && { cour: (form as any).cour }),
        ...((form as any).parent_title !== undefined && { parent_title: (form as any).parent_title }),
        ...(form.is_movie && form.duration_minutes && { duration_minutes: form.duration_minutes }),
      };

      if (editItem) {
        await updateMut.mutateAsync({ id: editItem.id, data: payload });
      } else {
        await addMut.mutateAsync(payload);
      }
      setModalOpen(false);
    } catch (err) {
      toast({ title: 'Gagal menyimpan', description: String(err), variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    await deleteMut.mutateAsync(deleteItem.id);
    setDeleteItem(null);
  };

  // ── Grouping & filtering ──────────────────────────────────────────────────
  const groupMap = useMemo(() => buildGroupMap(allItems), [allItems]);

  const filtered = useMemo(() => {
    let arr = allItems.filter(item => {
      if (pageTab === 'watchlist' && getWatchStatus(item) === 'none') return false;
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterGenre && !item.genre?.toLowerCase().includes(filterGenre.toLowerCase())) return false;
      if (filterFav && !item.is_favorite) return false;
      if (filterBookmark && !item.is_bookmarked) return false;
      if (filterWatchStatus !== 'all' && getWatchStatus(item) !== filterWatchStatus) return false;
      if (search) {
        const s = search.toLowerCase();
        const hit = item.title?.toLowerCase().includes(s)
          || item.genre?.toLowerCase().includes(s)
          || (item as any).studio?.toLowerCase().includes(s)
          || item.synopsis?.toLowerCase().includes(s);
        if (!hit) return false;
      }
      return true;
    });

    const key = (item: DonghuaItem) => (item as any).parent_title || item.title || '';
    const seen = new Set<string>();
    const result: DonghuaItem[] = [];

    if (sortMode === 'terbaru') arr = [...arr].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    else if (sortMode === 'rating') arr = [...arr].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    else if (sortMode === 'judul_az') arr = [...arr].sort((a, b) => (a.title || '').localeCompare(b.title || '', 'id'));
    else if (sortMode === 'episode') arr = [...arr].sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
    else if (sortMode === 'jadwal_terdekat') arr = [...arr].sort((a, b) => getNearestDay(a.schedule || '') - getNearestDay(b.schedule || ''));
    else if (sortMode === 'tahun_terbaru') arr = [...arr].sort((a, b) => ((b as any).release_year || 0) - ((a as any).release_year || 0));

    for (const item of arr) {
      const k = key(item);
      if (!seen.has(k)) {
        seen.add(k);
        result.push(item);
      } else {
        const existing = result.find(r => key(r) === k);
        if (existing && (item.season || 0) > (existing.season || 0)) {
          const idx = result.indexOf(existing);
          result[idx] = item;
        }
      }
    }
    return result;
  }, [allItems, search, filterStatus, filterGenre, filterFav, filterBookmark, filterWatchStatus, sortMode, pageTab]);

  const watchlistItems = useMemo(() => allItems.filter(item => getWatchStatus(item) !== 'none'), [allItems]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     allItems.length,
    ongoing:   allItems.filter(i => i.status === 'on-going').length,
    completed: allItems.filter(i => i.status === 'completed').length,
    films:     allItems.filter(i => i.is_movie).length,
    favorites: allItems.filter(i => i.is_favorite).length,
  }), [allItems]);

  // ── GSAP header entrance ──────────────────────────────────────────────────
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' });
    }
  }, []);

  useEffect(() => {
    if (!isLoading && gridRef.current) {
      const cards = gridRef.current.querySelectorAll('.donghua-card');
      gsap.fromTo(cards, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: 'power2.out', delay: 0.1 });
    }
  }, [isLoading, filtered, viewMode]);

  // ── Keyboard shortcut ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); openAdd(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ── Header ── */}
      <div ref={headerRef} className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-md">
                <Film className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-black text-foreground leading-tight">Donghua</h1>
                <p className="text-[10px] sm:text-xs text-muted-foreground">{stats.total} entri · {stats.films} film</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <ExportMenu data={allItems} filename="donghua" />
              <button
                onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
                className="flex items-center justify-center p-2 rounded-xl bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
              </button>
              <button onClick={openAdd}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
            {[
              { label: 'Total', val: stats.total, color: 'text-foreground', bg: 'bg-muted/60' },
              { label: 'Tayang', val: stats.ongoing, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
              { label: 'Selesai', val: stats.completed, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30' },
              { label: 'Favorit', val: stats.favorites, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            ].map(s => (
              <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl ${s.bg} shrink-0`}>
                <span className={`text-base font-black ${s.color}`}>{s.val}</span>
                <span className="text-[10px] text-muted-foreground font-medium">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 p-1 bg-muted/60 rounded-xl w-fit">
            {(['semua', 'watchlist'] as PageTab[]).map(tab => (
              <button key={tab} onClick={() => setPageTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${pageTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {tab === 'semua' ? 'Semua' : `Watchlist (${watchlistItems.length})`}
              </button>
            ))}
          </div>

          {/* Search & filter row */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari judul, genre, studio…"
                className="w-full pl-8 pr-3 py-2 bg-muted/60 rounded-xl text-xs border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(prev => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${showFilters ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>

          {/* Filter panel */}
          {showFilters && (
            <div className="mt-2.5 p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2.5">
              <div className="flex flex-wrap gap-2">
                {/* Status filter */}
                <div className="flex flex-wrap gap-1">
                  {(['all', 'on-going', 'completed', 'planned'] as FilterStatus[]).map(s => (
                    <button key={s} onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${filterStatus === s ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground border border-border hover:bg-accent'}`}>
                      {s === 'all' ? 'Semua' : STATUS_CONFIG[s as keyof typeof STATUS_CONFIG]?.label}
                    </button>
                  ))}
                </div>

                {/* Watch status filter */}
                <div className="flex flex-wrap gap-1">
                  {(['all', 'want_to_watch', 'watching', 'watched'] as const).map(ws => (
                    <button key={ws} onClick={() => setFilterWatchStatus(ws)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${filterWatchStatus === ws ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground border border-border hover:bg-accent'}`}>
                      {ws === 'all' ? 'Semua Status' : WATCH_STATUS_CONFIG[ws].label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <GenreSelect
                  genres={DONGHUA_GENRES}
                  value={filterGenre}
                  onChange={setFilterGenre}
                  placeholder="Filter genre…"
                  className="text-xs"
                />
                <button onClick={() => setFilterFav(p => !p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${filterFav ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-600/40' : 'bg-background text-muted-foreground border-border'}`}>
                  <Heart className={`w-3 h-3 ${filterFav ? 'fill-amber-500 text-amber-500' : ''}`} />Favorit
                </button>
                <button onClick={() => setFilterBookmark(p => !p)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${filterBookmark ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-300 dark:border-sky-600/40' : 'bg-background text-muted-foreground border-border'}`}>
                  <Bookmark className={`w-3 h-3 ${filterBookmark ? 'fill-sky-500 text-sky-500' : ''}`} />Bookmark
                </button>
              </div>

              {/* Sort */}
              <div className="flex flex-wrap gap-1">
                {([
                  { val: 'terbaru',        label: 'Terbaru'    },
                  { val: 'rating',         label: 'Rating'     },
                  { val: 'judul_az',       label: 'A→Z'        },
                  { val: 'episode',        label: 'Episode'    },
                  { val: 'jadwal_terdekat',label: 'Jadwal'     },
                  { val: 'tahun_terbaru',  label: 'Tahun'      },
                ] as { val: SortMode; label: string }[]).map(s => (
                  <button key={s.val} onClick={() => setSortMode(s.val)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${sortMode === s.val ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground border border-border hover:bg-accent'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-[2/3] rounded-2xl bg-muted/60 animate-pulse" />
            ))}
          </div>
        ) : pageTab === 'watchlist' ? (
          watchlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <BookmarkAlt className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="text-muted-foreground font-semibold">Watchlist kosong</p>
              <p className="text-xs text-muted-foreground/60 text-center max-w-xs">
                Tandai donghua dengan status tonton untuk menambahkannya ke watchlist.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {watchlistItems.map(item => (
                <WatchlistCard
                  key={item.id}
                  item={item}
                  onUpdateWatchStatus={handleUpdateWatchStatus}
                  onUpdateEpisode={handleUpdateEpisode}
                  onEdit={openEdit}
                  onDelete={setDeleteItem}
                  onView={() => setViewItem(item)}
                />
              ))}
            </div>
          )
        ) : filtered.length === 0 && !search ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
              <Film className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-semibold">Koleksi masih kosong</p>
            <button onClick={openAdd}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all shadow-sm">
              <Plus className="w-4 h-4" />Tambah Donghua Pertama
            </button>
          </div>
        ) : (
          <div ref={gridRef}
            className={viewMode === 'grid'
              ? 'grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 sm:gap-4'
              : 'flex flex-col gap-2'
            }
          >
            {viewMode === 'grid' && <AddCard onClick={openAdd} />}
            {filtered.map((item, idx) => {
              const k = (item as any).parent_title || item.title;
              const siblings = groupMap[k] || [];
              const others = siblings.filter(s => s.id !== item.id);
              const stackCount = others.length;
              const fanCoverUrls = others.slice(0, 2).map(o => o.cover_url || '').filter(Boolean);
              return (
                <DonghuaCard
                  key={item.id}
                  item={item}
                  stackCount={stackCount}
                  groupItems={siblings}
                  viewMode={viewMode}
                  onEdit={openEdit}
                  onDelete={setDeleteItem}
                  onView={() => setViewItem(item)}
                  onViewStack={stackCount > 0 ? () => setStackGroup({ title: k, items: siblings }) : undefined}
                  onToggleFavorite={() => handleToggleFavorite(item)}
                  onToggleBookmark={() => handleToggleBookmark(item)}
                  onUpdateWatchStatus={handleUpdateWatchStatus}
                  fanCoverUrls={fanCoverUrls}
                  index={idx}
                />
              );
            })}
          </div>
        )}

        {filtered.length > 0 && !isLoading && (
          <p className="text-center text-xs text-muted-foreground mt-6">
            {filtered.length} judul ditampilkan · {allItems.length} total
          </p>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
       * MODAL ADD / EDIT
       * FIX 1: overflow-x-hidden pada DialogContent dan form element
       * ───────────────────────────────────────────────────────────────────── */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) setModalOpen(false); }}>
        <DialogContent
          className="w-[calc(100vw-2rem)] sm:w-full sm:max-w-lg max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-2xl"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Film className="w-4 h-4 text-primary" />
              {editItem ? 'Edit Donghua' : 'Tambah Donghua'}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editItem ? 'Perbarui informasi donghua.' : 'Isi informasi donghua baru.'}
            </DialogDescription>
          </DialogHeader>

          {/* FIX 1: form juga overflow-x-hidden w-full */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-2 overflow-x-hidden w-full">
            {/* Movie toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-500/20">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                <span className="text-sm font-semibold text-violet-700 dark:text-violet-300">Ini adalah Film</span>
              </div>
              <button type="button" onClick={() => setForm(p => ({ ...p, is_movie: !p.is_movie, season: p.is_movie ? 1 : 0 }))}
                className={`relative w-10 h-5.5 rounded-full transition-colors ${form.is_movie ? 'bg-violet-500' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_movie ? 'translate-x-4.5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* AnimeExtraFields — auto-fill MAL/AniList */}
            <AnimeExtraFields
              value={extra}
              onChange={setExtra}
              onFill={handleExtraFill}
              titleHint={form.title}
              mediaType="donghua"
            />

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Judul <span className="text-destructive">*</span></label>
              <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Masukkan judul donghua…"
                className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm"
                required />
            </div>

            {/* Parent title (series grouping) */}
            {!form.is_movie && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Judul Induk (Series)</label>
                <input value={(form as any).parent_title || ''} onChange={e => setForm(p => ({ ...p, parent_title: e.target.value }))}
                  placeholder="Kosongkan jika ini season pertama"
                  className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                <p className="text-[10px] text-muted-foreground mt-1">Isi sama untuk mengelompokkan season dalam satu kartu.</p>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Status Rilis</label>
              <div className="flex gap-2 flex-wrap">
                {(['on-going', 'completed', 'planned'] as const).map(s => {
                  const c = STATUS_CONFIG[s];
                  return (
                    <button key={s} type="button" onClick={() => setForm(p => ({ ...p, status: s }))}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${form.status === s ? `${c.bg} ${c.color}` : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />{c.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Season & Cour */}
            {!form.is_movie && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Season</label>
                  <input type="number" min={1} value={form.season}
                    onChange={e => setForm(p => ({ ...p, season: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cour</label>
                  <input value={(form as any).cour || ''} onChange={e => setForm(p => ({ ...p, cour: e.target.value }))}
                    placeholder="mis. Cour 1"
                    className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                </div>
              </div>
            )}

            {/* Duration (movie only) */}
            {form.is_movie && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Durasi (menit)</label>
                <input type="number" min={1}
                  value={form.duration_minutes ?? ''}
                  onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value ? parseInt(e.target.value) : null }))}
                  placeholder="mis. 90"
                  className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
              </div>
            )}

            {/* Rating */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Rating (0–10)</label>
              <div className="flex items-center gap-3">
                <input type="range" min={0} max={10} step={0.5}
                  value={form.rating}
                  onChange={e => setForm(p => ({ ...p, rating: parseFloat(e.target.value) }))}
                  className="flex-1 accent-primary" />
                <span className="text-sm font-bold text-amber-500 w-8 text-center">{form.rating}</span>
              </div>
            </div>

            {/* Episodes */}
            {!form.is_movie && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Total Episode</label>
                  <input type="number" min={0} value={form.episodes}
                    onChange={e => setForm(p => ({ ...p, episodes: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Sudah Ditonton</label>
                  <input type="number" min={0} max={form.episodes || 99999} value={form.episodes_watched}
                    onChange={e => setForm(p => ({ ...p, episodes_watched: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
                </div>
              </div>
            )}

            {/* Genre */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Genre</label>
              <GenreSelect genres={DONGHUA_GENRES} value={form.genre} onChange={v => setForm(p => ({ ...p, genre: v }))} />
            </div>

            {/* Schedule */}
            {!form.is_movie && form.status === 'on-going' && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Jadwal Tayang</label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map(d => {
                    const isSelected = form.schedule.split(',').map(s => s.trim()).includes(d.value);
                    return (
                      <button key={d.value} type="button"
                        onClick={() => {
                          const arr = form.schedule.split(',').map(s => s.trim()).filter(Boolean);
                          const newArr = isSelected ? arr.filter(x => x !== d.value) : [...arr, d.value];
                          setForm(p => ({ ...p, schedule: newArr.join(', ') }));
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${isSelected ? 'bg-info text-white border-info' : 'bg-muted text-muted-foreground border-border hover:bg-accent'}`}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Streaming URL */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Link Streaming</label>
              <input value={form.streaming_url} onChange={e => setForm(p => ({ ...p, streaming_url: e.target.value }))}
                placeholder="https://…"
                type="url"
                className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
            </div>

            {/* Cover */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Cover</label>
              <div className="flex gap-2 mb-2">
                {(['url', 'upload'] as const).map(m => (
                  <button key={m} type="button" onClick={() => setImageUploadMode(m)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${imageUploadMode === m ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border'}`}>
                    {m === 'url' ? 'URL' : 'Upload'}
                  </button>
                ))}
              </div>
              {imageUploadMode === 'url' ? (
                <input value={form.cover_url} onChange={e => { setForm(p => ({ ...p, cover_url: e.target.value })); setCoverPreview(e.target.value); }}
                  placeholder="https://…"
                  type="url"
                  className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm" />
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 w-full h-24 border-2 border-dashed border-border rounded-xl bg-muted/30 cursor-pointer hover:bg-muted/60 transition-colors">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Klik untuk upload gambar</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const f = e.target.files?.[0];
                      if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); }
                    }} />
                </label>
              )}
              {coverPreview && (
                <div className="relative mt-2 w-20 h-28 rounded-xl overflow-hidden border border-border/50">
                  <img src={coverPreview} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setCoverPreview(''); setCoverFile(null); setForm(p => ({ ...p, cover_url: '' })); }}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Synopsis */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Sinopsis</label>
              <textarea value={form.synopsis} onChange={e => setForm(p => ({ ...p, synopsis: e.target.value }))}
                placeholder="Cerita singkat…"
                rows={3}
                className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none" />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Catatan Pribadi</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Catatan, kesan, dll…"
                rows={2}
                className="w-full px-3 py-2.5 bg-muted/60 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-sm resize-none" />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-1">
              <button type="button" onClick={() => setModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-all">
                Batal
              </button>
              <button type="submit" disabled={formLoading}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {formLoading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan…</>
                ) : (
                  <><Check className="w-4 h-4" />{editItem ? 'Simpan Perubahan' : 'Tambahkan'}</>
                )}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Detail Modal ── */}
      <DetailModal
        item={viewItem}
        open={!!viewItem}
        onClose={() => setViewItem(null)}
        onEdit={() => { if (viewItem) { openEdit(viewItem); setViewItem(null); } }}
        onUpdateWatchStatus={handleUpdateWatchStatus}
      />

      {/* ── Stack Detail Modal ── */}
      {stackGroup && (
        <StackDetailModal
          items={stackGroup.items}
          groupTitle={stackGroup.title}
          open={!!stackGroup}
          onClose={() => setStackGroup(null)}
          onEdit={item => { openEdit(item); setStackGroup(null); }}
          onDelete={item => { setDeleteItem(item); setStackGroup(null); }}
          onView={item => { setViewItem(item); setStackGroup(null); }}
          onToggleFavorite={handleToggleFavorite}
          onToggleBookmark={handleToggleBookmark}
          onUpdateWatchStatus={handleUpdateWatchStatus}
        />
      )}

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleteItem} onOpenChange={v => { if (!v) setDeleteItem(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="w-4 h-4" />Hapus Donghua?
            </DialogTitle>
            <DialogDescription>
              <span className="font-semibold text-foreground">"{deleteItem?.title}"</span> akan dihapus permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-2">
            <button onClick={() => setDeleteItem(null)}
              className="flex-1 py-2.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all">
              Batal
            </button>
            <button onClick={handleDelete} disabled={deleteMut.isPending}
              className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-all disabled:opacity-50">
              {deleteMut.isPending ? 'Menghapus…' : 'Ya, Hapus'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}