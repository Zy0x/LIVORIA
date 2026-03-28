/**
 * GroupActionMenu.tsx
 * Portal-based action menu for stacked anime/donghua cards.
 * Renders via createPortal → escapes overflow:hidden, never clipped.
 * Auto-positions above/below trigger and clamps to viewport edges.
 *
 * PERUBAHAN:
 * - Menambahkan checkbox untuk seleksi item (Delete Selected)
 * - Menampilkan judul lengkap di item picker untuk memudahkan pembedaan
 * - Layout yang lebih bersih dan informatif
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Edit2, Trash2, ChevronLeft, X, Check, Square, CheckSquare } from 'lucide-react';

export interface GroupMenuItem {
  id: string;
  title: string;
  season?: number;
  cour?: string;
  status?: string;
  is_movie?: boolean;
  [key: string]: any;
}

interface GroupActionMenuProps<T extends GroupMenuItem> {
  items: T[];
  trigger: React.ReactElement;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  onDeleteBatch?: (ids: string[]) => void;
  onViewStack: () => void;
}

const MENU_WIDTH = 260; // Sedikit lebih lebar untuk judul yang lebih panjang
const GAP = 8;

export function GroupActionMenu<T extends GroupMenuItem>({
  items,
  trigger,
  onEdit,
  onDelete,
  onDeleteBatch,
  onViewStack,
}: GroupActionMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'main' | 'edit' | 'delete'>('main');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const el = triggerRef.current.querySelector('button') ?? triggerRef.current;
    const rect = el.getBoundingClientRect();

    if (rect.width === 0 && rect.height === 0) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const estimatedHeight = mode === 'main' ? 220 : Math.min(60 + items.length * 70, 400);

    let left = rect.right - MENU_WIDTH;
    left = Math.max(GAP, Math.min(left, vw - MENU_WIDTH - GAP));

    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const showAbove = (spaceBelow < estimatedHeight && spaceAbove > spaceBelow) || spaceBelow < 100;

    const availableHeight = showAbove ? Math.min(450, spaceAbove) : Math.min(450, Math.max(spaceBelow, 150));

    const newStyle: React.CSSProperties = {
      position: 'fixed',
      left: `${left}px`,
      width: `${MENU_WIDTH}px`,
      zIndex: 99999,
      maxHeight: availableHeight,
    };

    if (showAbove) {
      newStyle.bottom = `${vh - rect.top + GAP}px`;
      newStyle.top = 'auto';
    } else {
      newStyle.top = `${rect.bottom + GAP}px`;
      newStyle.bottom = 'auto';
    }

    setMenuStyle(newStyle);
  }, [mode, items.length]);

  const openMenu = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (open) {
        setOpen(false);
        setMode('main');
      } else {
        setMode('main');
        setSelectedIds(new Set());
        setOpen(true);
      }
    },
    [open],
  );

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => computePosition());
    }
  }, [open, computePosition]);

  const closeMenu = useCallback(() => {
    setOpen(false);
    setMode('main');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      closeMenu();
    };
    const onScroll = (e: Event) => {
      if (menuRef.current && menuRef.current.contains(e.target as Node)) return;
      closeMenu();
    };
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
  }, [open, closeMenu, computePosition]);

  useEffect(() => {
    if (open) requestAnimationFrame(() => computePosition());
  }, [mode, open, computePosition]);

  const itemLabel = (it: T) => {
    if (it.is_movie) return '🎬 Movie';
    const s = it.season && it.season > 1 ? `S${it.season}` : 'S1';
    const c = it.cour ? ` · ${it.cour}` : '';
    return `${s}${c}`;
  };

  const statusLabel = (s?: string) =>
    s === 'completed' ? 'Selesai' : s === 'on-going' ? 'Tayang' : 'Rencana';

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(it => it.id)));
  };

  const clonedTrigger = {
    ...trigger,
    props: { ...trigger.props, onClick: openMenu },
  } as React.ReactElement;

  const menuContent = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
      className="bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 bg-muted/40 shrink-0">
        {mode !== 'main' ? (
          <button
            onClick={() => setMode('main')}
            className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1 -ml-1 rounded-lg hover:bg-muted"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Kembali
          </button>
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            {items.length} entri berkelompok
          </span>
        )}
        <button
          onClick={closeMenu}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="overflow-y-auto overscroll-contain" onTouchMove={e => e.stopPropagation()}>
        {/* ── Main actions ── */}
        {mode === 'main' && (
          <div className="py-1.5">
            <button
              onClick={() => { closeMenu(); setTimeout(onViewStack, 50); }}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 active:bg-muted transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 shrink-0">
                <Layers className="w-3.5 h-3.5 text-primary" />
              </span>
              <span className="font-semibold">Lihat Semua ({items.length})</span>
            </button>

            <div className="mx-3 my-1 border-t border-border/50" />

            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 active:bg-muted transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted shrink-0">
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
              <span className="font-medium">Edit Item...</span>
            </button>

            <button
              onClick={() => setMode('delete')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/[0.08] active:bg-destructive/[0.15] transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10 shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </span>
              <span className="font-medium">Hapus Item...</span>
            </button>

            {onDeleteBatch && (
              <button
                onClick={() => {
                  closeMenu();
                  setTimeout(() => onDeleteBatch(items.map(it => it.id)), 50);
                }}
                className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive font-bold hover:bg-destructive/[0.08] active:bg-destructive/[0.15] transition-colors"
              >
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/20 shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </span>
                <span>Hapus 1 Kelompok</span>
              </button>
            )}
          </div>
        )}

        {/* ── Item picker (edit / delete) ── */}
        {(mode === 'edit' || mode === 'delete') && (
          <div className="py-1">
            <div className="px-4 pt-2 pb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                {mode === 'edit' ? 'Pilih untuk edit:' : 'Pilih untuk hapus:'}
              </p>
              {mode === 'delete' && (
                <button 
                  onClick={selectAll}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {selectedIds.size === items.length ? 'Batal Semua' : 'Pilih Semua'}
                </button>
              )}
            </div>

            <div className="max-h-[300px] overflow-y-auto px-1">
              {items.map((it) => (
                <div key={it.id} className="relative group">
                  <button
                    onClick={() => {
                      if (mode === 'delete') {
                        toggleSelect(it.id);
                      } else {
                        closeMenu();
                        setTimeout(() => onEdit(it), 50);
                      }
                    }}
                    className={`
                      flex items-start gap-3 w-full px-3 py-3 text-left transition-all rounded-xl mb-0.5
                      ${mode === 'delete'
                        ? selectedIds.has(it.id) 
                          ? 'bg-destructive/10 border-destructive/20' 
                          : 'hover:bg-muted/60 border-transparent'
                        : 'hover:bg-muted/60 border-transparent'}
                      border
                    `}
                  >
                    {mode === 'delete' ? (
                      <div className="mt-0.5 shrink-0">
                        {selectedIds.has(it.id) 
                          ? <CheckSquare className="w-4 h-4 text-destructive" /> 
                          : <Square className="w-4 h-4 text-muted-foreground/40" />
                        }
                      </div>
                    ) : (
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-bold shrink-0 bg-primary/10 text-primary mt-0.5">
                        {it.is_movie ? '🎬' : `S${it.season || 1}`}
                      </span>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <span className="block text-[11px] font-bold text-foreground line-clamp-2 leading-tight">
                        {it.title}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                          {itemLabel(it)}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60">•</span>
                        <span className={`text-[9px] font-medium ${it.status === 'completed' ? 'text-sky-500' : 'text-emerald-500'}`}>
                          {statusLabel(it.status)}
                        </span>
                      </div>
                    </div>
                  </button>
                </div>
              ))}
            </div>

            {mode === 'delete' && (
              <div className="p-2 mt-1 border-t border-border/50">
                <button
                  disabled={selectedIds.size === 0}
                  onClick={() => {
                    const ids = Array.from(selectedIds);
                    closeMenu();
                    setTimeout(() => {
                      if (ids.length === 1) {
                        const item = items.find(it => it.id === ids[0]);
                        if (item) onDelete(item);
                      } else if (onDeleteBatch) {
                        onDeleteBatch(ids);
                      }
                    }, 50);
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold shadow-lg shadow-destructive/20 disabled:opacity-50 disabled:shadow-none transition-all active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus {selectedIds.size > 0 ? `${selectedIds.size} Item` : 'Terpilih'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <span
        ref={triggerRef}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {clonedTrigger}
      </span>
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
}
