import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bookmark as BookmarkIcon,
  BookmarkPlus,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  Edit2,
  Eye,
  Film,
  PlayCircle,
  Plus,
  X,
  type LucideIcon,
} from 'lucide-react';

export type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';

export function MediaAddCard({
  viewMode,
  onClick,
  trigger,
  listLabel,
}: {
  viewMode: 'grid' | 'list';
  onClick: () => void;
  trigger: string;
  listLabel: string;
}) {
  if (viewMode === 'list') {
    return (
      <button data-add-trigger={trigger} onClick={onClick} className="flex items-center gap-4 p-4 rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group w-full">
        <div className="w-14 h-20 rounded-xl border-2 border-dashed border-border group-hover:border-primary/40 flex items-center justify-center shrink-0 transition-colors">
          <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <p className="text-sm font-semibold text-muted-foreground group-hover:text-primary transition-colors">{listLabel}</p>
      </button>
    );
  }

  return (
    <button data-add-trigger={trigger} onClick={onClick} className="h-full rounded-2xl border-2 border-dashed border-border bg-muted/20 hover:border-primary/50 hover:bg-primary/5 transition-all group flex flex-col items-center justify-center cursor-pointer" style={{ aspectRatio: '2 / 3.35' }}>
      <div className="w-12 h-12 rounded-2xl bg-muted group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors">
        <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors text-center px-2">Tambah</p>
    </button>
  );
}

export const WATCH_STATUS_CONFIG: Record<WatchStatus, { label: string; icon: LucideIcon; color: string; bg: string }> = {
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

export function MediaTypeBadge({ label, size = 'sm' }: { label: string; size?: 'xs' | 'sm' }) {
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-violet-600/85 backdrop-blur-sm text-[8px] font-bold text-white leading-none">
        <Film className="w-1.5 h-1.5" />{label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20">
      <Film className="w-2.5 h-2.5" />{label}
    </span>
  );
}

export function HentaiBadge({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
  if (size === 'xs') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-pink-600/90 backdrop-blur-sm text-[8px] font-bold text-white leading-none shrink-0 whitespace-nowrap">
        18+
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-600 dark:text-pink-400 text-[10px] font-bold border border-pink-500/20 shrink-0 whitespace-nowrap">
      18+
    </span>
  );
}

export function NoteIndicator() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-amber-500/90 backdrop-blur-sm text-[8px] font-bold text-white leading-none shrink-0" title="Ada catatan pribadi">
      Catatan
    </span>
  );
}

interface PortalDropdownProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
  children: React.ReactNode;
  minWidth?: number;
  align?: 'left' | 'right';
}

export function PortalDropdown({ open, onClose, triggerRef, children, minWidth = 180, align = 'left' }: PortalDropdownProps) {
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
    document.body,
  );
}

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
        <button onClick={handleSave} className="p-1 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-colors">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={() => setEditing(false)} className="p-1 rounded-md bg-muted hover:bg-accent transition-colors">
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

interface MediaWatchStatusButtonProps<T> {
  item: T;
  getWatchStatus: (item: T) => WatchStatus;
  onUpdate: (item: T, newStatus: WatchStatus) => void;
  compact?: boolean;
}

const MENU_WIDTH_WS = 192;
const GAP_WS = 8;

export const MediaWatchStatusButton = memo(function MediaWatchStatusButton<T>({
  item,
  getWatchStatus,
  onUpdate,
  compact = false,
}: MediaWatchStatusButtonProps<T>) {
  const ws = getWatchStatus(item);
  const [showMenu, setShowMenu] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const cfg = WATCH_STATUS_CONFIG[ws];
  const Icon = cfg.icon;

  const options: { status: WatchStatus; label: string; icon: LucideIcon; color: string }[] = [
    { status: 'want_to_watch', label: 'Mau Nonton', icon: BookmarkPlus, color: 'text-amber-600 dark:text-amber-400' },
    { status: 'watching', label: 'Sedang Nonton', icon: PlayCircle, color: 'text-emerald-600 dark:text-emerald-400' },
    { status: 'watched', label: 'Sudah Ditonton', icon: CheckCircle, color: 'text-sky-600 dark:text-sky-400' },
    { status: 'none', label: 'Hapus Penanda', icon: X, color: 'text-muted-foreground' },
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
              className={`flex items-center gap-2 w-full px-3 py-2.5 text-xs transition-colors ${isActive ? 'bg-primary/10 font-semibold' : 'hover:bg-muted'}`}
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
        className={`inline-flex items-center gap-1.5 rounded-lg font-semibold transition-all border ${compact ? 'px-1.5 py-1 text-[9px]' : 'px-2.5 py-1.5 text-[10px]'} ${ws === 'none' ? 'bg-muted/60 border-border text-muted-foreground hover:bg-muted' : `${cfg.bg} ${cfg.color} border-current/20`}`}
        title="Status Tonton"
      >
        <Icon className={compact ? 'w-2.5 h-2.5 shrink-0' : 'w-3 h-3 shrink-0'} />
        {!compact && <span>{cfg.label}</span>}
        {!compact && <ChevronDown className="w-2.5 h-2.5 shrink-0 opacity-60" />}
      </button>
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}) as <T>(props: MediaWatchStatusButtonProps<T>) => React.ReactElement;

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
          : `Dihapus dari watchlist dalam ${seconds}s`,
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
