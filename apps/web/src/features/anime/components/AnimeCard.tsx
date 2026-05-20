/* eslint-disable react-refresh/only-export-components */
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import {
  Bookmark, BookmarkPlus, Building2, CalendarClock, Check, CheckCircle, ChevronDown,
  Clock, Copy, Edit2, ExternalLink, Eye, Film, Heart, Layers, Minus, MoreVertical,
  PlayCircle, Plus, Star, Trash2, Tv, X, Bookmark as BookmarkIcon,
} from 'lucide-react';
import { openExternalUrl } from '@/lib/external';
import { cardHoverConfig, isMobile } from '@/lib/motion';
import type { AnimeItem } from '@/lib/types';
import { GroupActionMenu } from '@/components/GroupActionMenu';
import type { AnimeExtraData } from '@/components/shared/AnimeExtraFields';
import { toast } from '@/hooks/use-toast';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';
import { resolveTitle, type TitleLang } from '@/hooks/useTitleLanguage';
import { getAnimeWatchStatus } from '@/features/anime/domain/watch-status';
import {
  DAY_LABELS,
  GENRE_PALETTE,
  STATUS_CONFIG,
  formatDuration,
  formatDurationLong,
} from '@/features/media/domain/media-display';

export {
  DAY_LABELS,
  GENRE_PALETTE,
  STATUS_CONFIG,
  formatDuration,
  formatDurationLong,
} from '@/features/media/domain/media-display';

export type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';
export type ViewMode = 'grid' | 'list';

export const emptyForm: {
  title: string; status: 'on-going' | 'completed' | 'planned'; genre: string; rating: number;
  episodes: number; episodes_watched: number; cover_url: string; synopsis: string; notes: string;
  season: number; cour: string; streaming_url: string; schedule: string; parent_title: string;
  is_movie: boolean; duration_minutes: number | null; is_hentai: boolean;
} = {
  title: '', status: 'planned', genre: '', rating: 0, episodes: 0,
  episodes_watched: 0, cover_url: '', synopsis: '', notes: '',
  season: 1, cour: '', streaming_url: '', schedule: '', parent_title: '',
  is_movie: false,
  duration_minutes: null,
  is_hentai: false,
};

export const emptyExtra: AnimeExtraData = {
  release_year: null,
  studio: '',
  mal_url: '',
  anilist_url: '',
};

export const WATCH_STATUS_CONFIG: Record<WatchStatus, { label: string; icon: any; color: string; bg: string }> = {
  none: {
    label: 'Belum Ditandai',
    icon: BookmarkIcon,
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

// Pagination imported from shared component
// ─── PortalDropdown ───────────────────────────────────────────────────────────
interface PortalDropdownProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  children: React.ReactNode;
  minWidth?: number;
  align?: 'left' | 'right';
}

function PortalDropdown({ open, onClose, triggerRef, children, minWidth = 180, align = 'left' }: PortalDropdownProps) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const estimatedH = 320;
    const w = Math.min(minWidth, vw - 16);

    let left = align === 'right' ? rect.right - w : rect.left;
    left = Math.max(8, Math.min(left, vw - w - 8));

    const spaceBelow = vh - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const showAbove = spaceBelow < estimatedH && spaceAbove > spaceBelow;

    setStyle({
      position: 'fixed',
      zIndex: 99999,
      width: w,
      ...(showAbove
        ? { bottom: vh - rect.top + 8, top: 'auto' }
        : { top: rect.bottom + 8, bottom: 'auto' }
      ),
      left,
      maxHeight: Math.min(280, showAbove ? spaceAbove : Math.max(spaceBelow, 120)),
    });
  }, [open, triggerRef, minWidth, align]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      if (dropRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onScroll = (e: Event) => {
      if (dropRef.current && dropRef.current.contains(e.target as Node)) return;
      onClose();
    };
    const onResize = () => onClose();
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
  }, [open, onClose, triggerRef]);

  if (!open) return null;
  return createPortal(
    <div ref={dropRef} style={style} className="bg-card border border-border rounded-2xl shadow-xl py-2 overflow-y-auto">
      {children}
    </div>,
    document.body
  );
}

export function extractAltTitles(item: AnimeItem) {
  const raw = (item as any).alternative_titles;
  return deserializeAlternativeTitles(raw);
}

export function extractExtra(item: AnimeItem): AnimeExtraData {
  return {
    release_year: (item as any).release_year ?? null,
    studio: (item as any).studio ?? '',
    mal_url: (item as any).mal_url ?? '',
    anilist_url: (item as any).anilist_url ?? '',
    mal_id: (item as any).mal_id ?? null,
    anilist_id: (item as any).anilist_id ?? null,
    episodes: (item as any).episodes ?? null,
    synopsis_id: (item as any).synopsis ?? '',
    alternative_titles: (item as any).alternative_titles ?? null,
  };
}

export function getWatchStatus(item: AnimeItem): WatchStatus {
  return getAnimeWatchStatus(item);
}

export function getCardBgClasses(isFavorite: boolean, isBookmarked: boolean, isMovie: boolean, watchStatus: WatchStatus): string {
  let base = 'bg-card border-border';
  if (isFavorite && isBookmarked) base = 'bg-purple-50 dark:bg-purple-950/40 border-purple-400 dark:border-purple-500';
  else if (isFavorite) base = 'bg-amber-50 dark:bg-amber-950/40 border-amber-400 dark:border-amber-500';
  else if (isBookmarked) base = 'bg-sky-50 dark:bg-sky-950/40 border-sky-400 dark:border-sky-500';
  else if (isMovie) base = 'bg-card border-violet-300/40 dark:border-violet-500/30';

  if (watchStatus === 'want_to_watch') return base + ' border-l-[3px] border-l-amber-400 dark:border-l-amber-500';
  if (watchStatus === 'watching') return base + ' border-l-[3px] border-l-emerald-400 dark:border-l-emerald-500';
  if (watchStatus === 'watched') return base + ' border-l-[3px] border-l-sky-400 dark:border-l-sky-500';
  return base;
}

export function MovieBadge({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-600/85 backdrop-blur-sm text-[8px] font-bold text-white leading-none">
        <Film className="w-1.5 h-1.5" />MOVIE
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20">
      <Film className="w-2.5 h-2.5" />MOVIE
    </span>
  );
}

export function HentaiBadge({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-pink-600/90 backdrop-blur-sm text-[8px] font-bold text-white leading-none shrink-0 whitespace-nowrap">
        🔞 18+
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400 text-[10px] font-bold border border-pink-500/20 shrink-0 whitespace-nowrap">
      🔞 18+
    </span>
  );
}

export function NoteIndicator() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-sm text-[8px] font-bold text-white leading-none shrink-0" title="Ada catatan pribadi">
      📝 Catatan
    </span>
  );
}

// ─── EpisodeInlineEditor ──────────────────────────────────────────────────────
interface EpisodeInlineEditorProps {
  watched: number;
  total: number;
  onSave: (watched: number, total?: number) => void;
}

export const EpisodeInlineEditor = memo(function EpisodeInlineEditor({ watched, total, onSave }: EpisodeInlineEditorProps) {
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
      <div
        className="flex items-center gap-1"
        onClick={e => e.stopPropagation()}
      >
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
});

// ─── WatchStatusButton ────────────────────────────────────────────────────────
const MENU_WIDTH_WS = 192;
const GAP_WS = 8;

interface WatchStatusButtonProps {
  item: AnimeItem;
  onUpdate: (item: AnimeItem, newStatus: WatchStatus) => void;
  compact?: boolean;
}

export const WatchStatusButton = memo(function WatchStatusButton({ item, onUpdate, compact = false }: WatchStatusButtonProps) {
  const ws = getWatchStatus(item);
  const [showMenu, setShowMenu] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cfg = WATCH_STATUS_CONFIG[ws];
  const Icon = cfg.icon;

  const options: { status: WatchStatus; label: string; icon: any; color: string }[] = [
    { status: 'want_to_watch', label: 'Mau Nonton', icon: BookmarkPlus, color: 'text-amber-600 dark:text-amber-400' },
    { status: 'watching',      label: 'Sedang Nonton', icon: PlayCircle,   color: 'text-emerald-600 dark:text-emerald-400' },
    { status: 'watched',       label: 'Sudah Ditonton', icon: CheckCircle, color: 'text-sky-600 dark:text-sky-400' },
    { status: 'none',          label: 'Hapus Penanda', icon: X,            color: 'text-muted-foreground' },
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
      position: 'fixed',
      left: `${left}px`,
      width: `${MENU_WIDTH_WS}px`,
      zIndex: 99999,
      maxHeight: showAbove
        ? Math.min(320, spaceAbove)
        : Math.min(320, Math.max(spaceBelow, 160)),
    };

    if (showAbove) {
      newStyle.bottom = `${vh - rect.top + GAP_WS}px`;
      newStyle.top = 'auto';
    } else {
      newStyle.top = `${rect.bottom + GAP_WS}px`;
      newStyle.bottom = 'auto';
    }

    setMenuStyle(newStyle);
  }, [options.length]);

  const openMenu = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(prev => !prev);
  }, []);

  useEffect(() => {
    if (showMenu) {
      requestAnimationFrame(() => computePosition());
    }
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
    <div
      ref={menuRef}
      style={menuStyle}
      onClick={e => e.stopPropagation()}
      className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden flex flex-col"
    >
      <p className="px-3 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60 shrink-0">
        Status Tonton
      </p>
      <div className="overflow-y-auto">
        {options.map(opt => {
          const OptIcon = opt.icon;
          const isActive = ws === opt.status;
          return (
            <button
              key={opt.status}
              type="button"
              onClick={e => {
                e.stopPropagation();
                onUpdate(item, opt.status);
                setShowMenu(false);
              }}
              className={`
                flex items-center gap-2 w-full px-3 py-2.5 text-xs transition-colors
                ${isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-muted'}
              `}
            >
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
      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        className={`
          inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all border
          ${compact
            ? 'px-1.5 py-1 text-[9px]'
            : 'px-2.5 py-1.5 text-[10px]'
          }
          ${ws === 'none'
            ? 'bg-muted/60 border-border text-muted-foreground hover:bg-muted'
            : `${cfg.bg} ${cfg.color} border-current/20`
          }
        `}
        title="Status Tonton"
      >
        <Icon className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />
        {!compact && <span>{cfg.label}</span>}
        {!compact && <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-60" />}
      </button>
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
});

// ─── WatchedCountdown ─────────────────────────────────────────────────────────
export function WatchedCountdown({ watchedAt }: { watchedAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const AUTO_REMOVE_MS = 60 * 60 * 1000;

    const update = () => {
      const elapsed = Date.now() - new Date(watchedAt).getTime();
      const left = AUTO_REMOVE_MS - elapsed;

      if (left <= 0) {
        setRemaining('Segera dihapus...');
        return;
      }

      const minutes = Math.floor(left / 60000);
      const seconds = Math.floor((left % 60000) / 1000);

      if (minutes >= 60) {
        setRemaining('');
        return;
      }

      setRemaining(
        minutes > 0
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
      <Clock className="w-2 h-2 shrink-0" />
      {remaining}
    </p>
  );
}

// ─── WatchlistCard ─────────────────────────────────────────────────────────────
interface WatchlistCardProps {
  item: AnimeItem;
  onUpdateWatchStatus: (item: AnimeItem, newStatus: WatchStatus) => void;
  onUpdateEpisode: (item: AnimeItem, watched: number, total?: number) => void;
  onEdit: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
  onView: () => void;
  titleLang?: import('@/hooks/useTitleLanguage').TitleLang;
}

export const WatchlistCard = memo(function WatchlistCard({ item, onUpdateWatchStatus, onUpdateEpisode, onEdit, onDelete, onView, titleLang = 'original' }: WatchlistCardProps) {
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const extra = extractExtra(item);
  const ws = getWatchStatus(item);
  const wsCfg = WATCH_STATUS_CONFIG[ws];
  const WsIcon = wsCfg.icon;
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const watched = item.episodes_watched || 0;
  const totalEp = item.episodes || 0;
  const progress = totalEp > 0 ? Math.min(100, (watched / totalEp) * 100) : 0;

  return (
    <div
      className={`group relative rounded-2xl border overflow-hidden cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${wsCfg.bg}`}
      onClick={onView}
    >
      {/* Watch status ribbon */}
      <div className={`h-1 w-full ${ws === 'want_to_watch' ? 'bg-amber-400' : ws === 'watching' ? 'bg-emerald-400' : 'bg-sky-400'}`} />

      <div className="flex gap-2 sm:gap-3 p-2 sm:p-3">
        {/* Cover - responsive sizing */}
        <div className="w-12 sm:w-16 h-[68px] sm:h-[90px] rounded-lg sm:rounded-xl overflow-hidden shrink-0 bg-muted border border-border/30">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center">
                {item.is_movie ? <Film className="w-5 h-5 text-muted-foreground/30" /> : <Tv className="w-5 h-5 text-muted-foreground/30" />}
              </div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-start gap-1 mb-1">
            <h3 className="text-xs sm:text-sm font-bold text-foreground leading-tight line-clamp-2 break-words min-w-0 flex-1">{resolveTitle(item.title, (item as any).alternative_titles, titleLang)}</h3>
            {item.is_movie && <MovieBadge size="xs" />}
          </div>

          {/* Status rilis */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 rounded-md text-[8px] sm:text-[9px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1 h-1 rounded-full ${statusCfg.dot}`} />
              {statusCfg.label}
            </span>
            {(extra.studio || extra.release_year) && (
              <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate max-w-[120px] sm:max-w-none">
                {extra.studio}{extra.studio && extra.release_year ? ' · ' : ''}{extra.release_year}
              </span>
            )}
          </div>

          {genres.length > 0 && (
            <div className="flex flex-wrap gap-0.5 mb-1">
              {genres.slice(0, 2).map(g => (
                <span key={g} className="text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.5 rounded-md font-semibold"
                  style={{ background: (GENRE_PALETTE[g] || '#64748b') + '20', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                  {g}
                </span>
              ))}
            </div>
          )}

          {item.is_movie && item.duration_minutes && (
            <p className="text-[9px] sm:text-[10px] text-violet-600 dark:text-violet-400 flex items-center gap-0.5 mb-1">
              <Clock className="w-2.5 h-2.5" />{formatDurationLong(item.duration_minutes)}
            </p>
          )}

          {/* Countdown auto-remove untuk status 'watched' */}
          {ws === 'watched' && (item as any).watched_at && (
            <WatchedCountdown watchedAt={(item as any).watched_at} />
          )}

          {/* Episode Quick Action (serial only) */}
          {!item.is_movie && (
            <div
              className="flex items-center gap-1 sm:gap-1.5 pt-1 sm:pt-1.5 mt-1 border-t border-border/30"
              onClick={e => e.stopPropagation()}
            >
              <button
                disabled={watched <= 0}
                onClick={() => onUpdateEpisode(item, Math.max(0, watched - 1))}
                className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-muted hover:bg-accent disabled:opacity-30 transition-colors text-muted-foreground hover:text-foreground"
                title="Kurangi 1 episode"
              >
                <Minus className="w-3 h-3" />
              </button>

              <div className="flex-1 flex items-center justify-center min-w-0">
                <EpisodeInlineEditor
                  watched={watched}
                  total={totalEp}
                  onSave={(w, t) => onUpdateEpisode(item, w, t)}
                />
              </div>

              <button
                disabled={totalEp > 0 && watched >= totalEp}
                onClick={() => onUpdateEpisode(item, watched + 1)}
                className="flex items-center justify-center gap-0.5 px-1.5 sm:px-2 h-6 sm:h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors text-[9px] sm:text-[10px] font-bold"
                title="Tambah 1 episode"
              >
                <Plus className="w-3 h-3" />
                <span className="hidden sm:inline">Ep</span>
              </button>
            </div>
          )}

          {/* Progress bar episode */}
          {!item.is_movie && totalEp > 0 && (
            <div className="mt-1 sm:mt-1.5">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progress}%`,
                    background: progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))',
                  }}
                />
              </div>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground mt-0.5 text-right">{Math.round(progress)}%</p>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-1 sm:gap-1.5 pt-1 sm:pt-1.5 border-t border-border/30 mt-1" onClick={e => e.stopPropagation()}>
            <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} compact />
            <div className="ml-auto flex gap-1">
              <button
                onClick={() => onEdit(item)}
                className="flex items-center justify-center p-1 sm:p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors min-h-[26px] min-w-[26px] sm:min-h-[30px] sm:min-w-[30px]"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDelete(item)}
                className="flex items-center justify-center p-1 sm:p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors min-h-[26px] min-w-[26px] sm:min-h-[30px] sm:min-w-[30px]"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

// ─── AnimeCard (grid/list) ─────────────────────────────────────────────────────
interface AnimeCardProps {
  item: AnimeItem;
  stackCount: number;
  groupItems: AnimeItem[];
  viewMode: ViewMode;
  index: number;
  fanCoverUrls?: string[];
  titleLang?: TitleLang;
  onEdit: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onView: () => void;
  onViewStack?: () => void;
  onToggleFavorite: () => void;
  onToggleBookmark: () => void;
  onUpdateWatchStatus: (item: AnimeItem, s: WatchStatus) => void;
}

export const AnimeCard = memo(function AnimeCard({
  item, stackCount, groupItems, viewMode, onEdit, onDelete, onDeleteBatch, onView,
  onViewStack, onToggleFavorite, onToggleBookmark, onUpdateWatchStatus, fanCoverUrls = [], titleLang = 'original',
}: AnimeCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fan1Ref    = useRef<HTMLDivElement>(null);
  const fan2Ref    = useRef<HTMLDivElement>(null);
  const menuRef    = useRef<HTMLDivElement>(null);
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

  // GSAP-based hover for desktop smoothness
  // CSS-based hover (no GSAP per-card — much lighter)
  const handleMouseEnter = () => {
    if (isMobile() || !wrapperRef.current) return;
    const cfg = cardHoverConfig();
    if (!cfg) return;
    gsap.to(wrapperRef.current, cfg.enter);
    if (fan1Ref.current) gsap.to(fan1Ref.current, cfg.fan1Enter);
    if (fan2Ref.current) gsap.to(fan2Ref.current, cfg.fan2Enter);
  };

  const handleMouseLeave = () => {
    if (isMobile() || !wrapperRef.current) return;
    const cfg = cardHoverConfig();
    if (!cfg) return;
    gsap.to(wrapperRef.current, cfg.leave);
    if (fan1Ref.current) gsap.to(fan1Ref.current, cfg.fan1Leave);
    if (fan2Ref.current) gsap.to(fan2Ref.current, cfg.fan2Leave);
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
        className={`anime-card group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border cursor-pointer hover:border-primary/30 hover:bg-accent/30 transition-all ${cardBgClasses}`}
        onClick={onView}
      >
        <div className="relative w-12 sm:w-14 h-[72px] sm:h-20 rounded-xl overflow-hidden shrink-0 bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center">
                {isMovie ? <Film className="w-5 h-5 text-muted-foreground/40" /> : <Tv className="w-5 h-5 text-muted-foreground/40" />}
              </div>
          }
          {isMovie && (
            <div className="absolute bottom-1 left-0 right-0 flex justify-center">
              <span className="px-1 py-0.5 rounded bg-violet-600/90 text-[7px] font-bold text-white leading-none">MOVIE</span>
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
          <h3 className="text-sm font-bold text-foreground leading-tight truncate mb-1">{resolveTitle(item.title, (item as any).alternative_titles, titleLang)}</h3>
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
            <GroupActionMenu
              items={groupItems}
              trigger={
                <button className="flex items-center justify-center p-2 rounded-xl bg-muted hover:bg-accent text-muted-foreground transition-all min-w-[36px] min-h-[36px]">
                  <MoreVertical className="w-4 h-4" />
                </button>
              }
              onEdit={onEdit}
              onDelete={onDelete}
              onDeleteBatch={onDeleteBatch}
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
                <div
                  className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 min-w-[140px]"
                  onClick={e => e.stopPropagation()}
                >
                  <button onClick={() => { onEdit(item); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-foreground hover:bg-muted transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => { onDelete(item); setMenuOpen(false); }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted transition-colors text-destructive">
                    <Trash2 className="w-3.5 h-3.5" /> Hapus
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
    <div ref={wrapperRef} className="relative h-full" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {stackCount >= 2 && (
        <div
          ref={fan2Ref}
          className="absolute inset-x-3 top-1 bottom-0 rounded-2xl border border-border/50 overflow-hidden bg-card"
          style={{ transform: 'rotate(-3deg) translateY(-2px)', transformOrigin: 'bottom center' }}>
          {fanCoverUrls[1] ? <img src={fanCoverUrls[1]} alt="" className="w-full h-full object-cover opacity-70" loading="lazy" /> : null}
        </div>
      )}
      {stackCount >= 1 && (
        <div
          ref={fan1Ref}
          className="absolute inset-x-1.5 top-0.5 bottom-0 rounded-2xl border border-border/65 overflow-hidden bg-card"
          style={{ transform: 'rotate(-1.5deg) translateY(-1px)', transformOrigin: 'bottom center' }}>
          {fanCoverUrls[0] ? <img src={fanCoverUrls[0]} alt="" className="w-full h-full object-cover opacity-80" loading="lazy" /> : null}
        </div>
      )}
      <div
        className={`anime-card group relative z-10 flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm transition-colors ${cardBgClasses}`}
        onClick={hasStack ? onViewStack : onView}
      >
        <div className="relative aspect-[2/3] overflow-hidden bg-muted">
          {item.cover_url
            ? <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
            : <div className="w-full h-full flex items-center justify-center flex-col gap-2">
                {isMovie ? <Film className="w-10 h-10 text-muted-foreground/20" /> : <Tv className="w-10 h-10 text-muted-foreground/20" />}
              </div>
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Top-left badges: status + watch status */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 items-start max-w-[calc(100%-3.5rem)]">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border backdrop-blur-md ${statusCfg.bg} ${statusCfg.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
              {statusCfg.label}
            </span>
            {ws !== 'none' && (
              <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-sm text-[9px] font-bold border whitespace-nowrap
                ${ws === 'want_to_watch' ? 'bg-amber-500/85 text-white border-amber-400/30' :
                  ws === 'watching' ? 'bg-emerald-500/85 text-white border-emerald-400/30' :
                  'bg-sky-500/85 text-white border-sky-400/30'}`}>
                <WsIcon className="w-2 h-2 shrink-0" />
                {wsCfg.label}
              </span>
            )}
            {isMovie && ws === 'none' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-violet-600/90 backdrop-blur-sm text-[9px] font-bold text-white border border-violet-400/30">
                <Film className="w-2 h-2" />MOVIE
              </span>
            )}
          </div>

          {/* Top-right badges: rating + hentai + notes */}
          <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
            {item.rating > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-black/50 backdrop-blur-md border border-white/10">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[11px] font-bold text-amber-300">{item.rating}</span>
              </div>
            )}
            {item.is_hentai && <HentaiBadge size="xs" />}
            {item.notes && <NoteIndicator />}
          </div>

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

        <div className="flex flex-1 flex-col p-2 sm:p-3">
          <div className="mb-1 min-h-[2rem] sm:min-h-[2.5rem]">
            <h3 className="font-bold text-[11px] sm:text-sm text-foreground leading-tight line-clamp-2">{resolveTitle(item.title, (item as any).alternative_titles, titleLang)}</h3>
          </div>
          {(extra.studio || extra.release_year) ? (
            <div className="mb-1 flex min-h-[1.125rem] items-center gap-1.5 flex-wrap">
              {extra.studio && <span className="text-[8px] sm:text-[9px] text-muted-foreground flex items-center gap-0.5 truncate max-w-[80%]"><Building2 className="w-2 h-2 shrink-0" />{extra.studio}</span>}
              {extra.release_year && <span className="text-[8px] sm:text-[9px] text-muted-foreground flex items-center gap-0.5 shrink-0"><CalendarClock className="w-2 h-2 shrink-0" />{extra.release_year}</span>}
            </div>
          ) : (
            <div className="mb-1 min-h-[1.125rem]" />
          )}
          {genres.length > 0 ? (
            <div className="mb-1.5 flex min-h-[1.375rem] flex-wrap gap-0.5">
              <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-md font-semibold max-w-full truncate"
                style={{ background: (GENRE_PALETTE[genres[0]] || '#64748b') + '20', color: GENRE_PALETTE[genres[0]] || 'hsl(var(--muted-foreground))' }}>
                {genres[0]}
              </span>
              {genres.length > 1 && <span className="text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold flex-shrink-0">+{genres.length - 1}</span>}
            </div>
          ) : (
            <div className="mb-1.5 min-h-[1.375rem]" />
          )}

          {isMovie ? (
            item.duration_minutes ? (
              <div className="mb-1.5 flex min-h-[1rem] items-center gap-1 text-[9px] sm:text-[10px] text-violet-600 dark:text-violet-400">
                <Clock className="w-2 sm:w-2.5 h-2 sm:h-2.5 shrink-0" />
                <span className="font-semibold">{formatDurationLong(item.duration_minutes)}</span>
              </div>
            ) : <div className="mb-1.5 min-h-[1rem]" />
          ) : (
            <div className="mb-1.5 min-h-[2rem] space-y-1">
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

          <div className="mt-auto flex items-center justify-between gap-1 border-t border-border/50 pt-1.5 sm:pt-2" onClick={e => e.stopPropagation()}>
            <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} compact />

            <div className="flex items-center gap-0.5">
              {item.streaming_url && (
                <>
                  <button onClick={e => { e.stopPropagation(); openExternalUrl(item.streaming_url); }}
                    className="flex items-center justify-center p-1.5 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors min-w-[30px] min-h-[30px]">
                    <ExternalLink className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  </button>
                  <button onClick={copyLink}
                    className="flex items-center justify-center p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors min-w-[30px] min-h-[30px]">
                    <Copy className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                  </button>
                </>
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

                    {hasStack ? (
                      <GroupActionMenu
                        items={groupItems}
                        trigger={
                          <button className="p-2 rounded-xl bg-card/90 backdrop-blur-sm hover:bg-accent text-muted-foreground transition-all min-w-[36px] min-h-[36px] shadow-sm">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        }
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onDeleteBatch={onDeleteBatch}
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
                    <div
                      className="absolute right-0 bottom-full mb-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 overflow-hidden"
                      onClick={e => e.stopPropagation()}
                    >
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
});

// ─── AddCard ──────────────────────────────────────────────────────────────────
export function AddCard({ viewMode, onClick }: { viewMode: ViewMode; onClick: () => void }) {
  if (viewMode === 'list') {
    return (
      <button data-add-trigger="anime" onClick={onClick} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group w-full">
        <div className="w-14 h-20 rounded-xl border-2 border-dashed border-border group-hover:border-primary/40 flex items-center justify-center shrink-0 transition-colors">
          <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">Tambah Anime / Movie Baru</p>
      </button>
    );
  }
  return (
    <button data-add-trigger="anime" onClick={onClick} className="h-full rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group flex flex-col items-center justify-center cursor-pointer" style={{ aspectRatio: '2 / 3.35' }}>
      <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center px-2">Tambah</p>
    </button>
  );
}

// ─── StackDetailModal ─────────────────────────────────────────────────────────
