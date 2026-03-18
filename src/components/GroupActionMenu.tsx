/**
 * GroupActionMenu.tsx
 * Portal-based action menu for stacked anime/donghua cards.
 * Renders via createPortal → escapes overflow:hidden, never clipped.
 * Auto-positions above/below trigger and clamps to viewport edges.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Edit2, Trash2, ChevronLeft, X } from 'lucide-react';

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
  onViewStack: () => void;
}

const MENU_WIDTH = 232;
const GAP = 8;

export function GroupActionMenu<T extends GroupMenuItem>({
  items,
  trigger,
  onEdit,
  onDelete,
  onViewStack,
}: GroupActionMenuProps<T>) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'main' | 'edit' | 'delete'>('main');
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return;

    // Cari elemen nyata pertama (bukan span display:contents/inline-flex kosong)
    const el = triggerRef.current.querySelector('button') ?? triggerRef.current;
    const rect = el.getBoundingClientRect();

    // Guard: jika rect tidak valid (0,0 berarti belum ter-layout), batalkan
    if (rect.width === 0 && rect.height === 0) return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Hitung estimasi tinggi menu
    const estimatedHeight = mode === 'main' ? 190 : Math.min(48 + items.length * 60, 380);

    // Horizontal: preferensi rata kanan tombol, tapi clamp ke viewport
    let left = rect.right - MENU_WIDTH;
    left = Math.max(GAP, Math.min(left, vw - MENU_WIDTH - GAP));

    // Vertical: tampilkan di bawah jika ada ruang, jika tidak tampilkan di atas
    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    const showAbove = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    const newStyle: React.CSSProperties = {
      position: 'fixed',
      left: `${left}px`,
      width: `${MENU_WIDTH}px`,
      zIndex: 99999,
      maxHeight: showAbove
        ? Math.min(420, spaceAbove)
        : Math.min(420, Math.max(spaceBelow, 200)),
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
      setMode('main');
      setOpen(true);
    },
    [],
  );

  // Hitung posisi setelah open = true (agar estimatedHeight mode sudah benar)
  useEffect(() => {
    if (open) {
      // requestAnimationFrame memastikan DOM sudah render sebelum getBoundingClientRect
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
    const onScroll = () => closeMenu();
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

  // Recompute saat mode berubah (tinggi menu berubah)
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

  // Clone trigger dengan onClick — span wrapper pakai inline-flex agar memiliki dimensi
  const clonedTrigger = {
    ...trigger,
    props: { ...trigger.props, onClick: openMenu },
  } as React.ReactElement;

  const menuContent = open ? (
    <div
      ref={menuRef}
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
      className="bg-card border border-border/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
            {items.length} entri
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
      <div className="overflow-y-auto">
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
            <div className="flex-1 min-w-0">
                <div className="font-semibold whitespace-nowrap">
                Lihat Semua ({items.length})
                </div>
            </div>
            </button>

            <div className="mx-3 my-1 border-t border-border/50" />

            <button
              onClick={() => setMode('edit')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/60 active:bg-muted transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted shrink-0">
                <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
              </span>
              <span className="font-medium">Edit...</span>
            </button>

            <button
              onClick={() => setMode('delete')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/[0.08] active:bg-destructive/[0.15] transition-colors"
            >
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-destructive/10 shrink-0">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </span>
              <span className="font-medium">Hapus...</span>
            </button>
          </div>
        )}

        {/* ── Item picker (edit / delete) ── */}
        {(mode === 'edit' || mode === 'delete') && (
          <div className="py-1">
            <p className="px-4 pt-2 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {mode === 'edit' ? 'Pilih yang diedit:' : 'Pilih yang dihapus:'}
            </p>
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => {
                  closeMenu();
                  setTimeout(() => {
                    if (mode === 'edit') onEdit(it);
                    else onDelete(it);
                  }, 50);
                }}
                className={`
                  flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors
                  ${mode === 'delete'
                    ? 'hover:bg-destructive/[0.08] active:bg-destructive/[0.15]'
                    : 'hover:bg-muted/60 active:bg-muted'}
                `}
              >
                <span
                  className={`
                    flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold shrink-0
                    ${mode === 'delete'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-primary/10 text-primary'}
                  `}
                >
                  {it.is_movie ? '🎬' : `S${it.season || 1}`}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-xs font-semibold text-foreground truncate leading-tight">
                    {it.title}
                  </span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">
                    {itemLabel(it)} · {statusLabel(it.status)}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Gunakan inline-flex bukan display:contents agar getBoundingClientRect() valid */}
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