/**
 * TitleLanguageSwitch.tsx — LIVORIA
 *
 * Komponen dropdown untuk memilih bahasa tampilan judul.
 */

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { createPortal } from 'react-dom';
import { type TitleLang, TITLE_LANG_OPTIONS } from '@/hooks/useTitleLanguage';

interface Props {
  currentLang: TitleLang;
  onLangChange: (lang: TitleLang) => void;
  isUpdating?: boolean;
}

export default function TitleLanguageSwitch({ currentLang, onLangChange, isUpdating }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const current = TITLE_LANG_OPTIONS.find(o => o.value === currentLang) || TITLE_LANG_OPTIONS[0];

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = 220;

    let left = rect.right - w;
    left = Math.max(8, Math.min(left, vw - w - 8));

    const spaceBelow = vh - rect.bottom - 8;
    const showAbove = spaceBelow < 260 && rect.top > 260;

    setMenuStyle({
      position: 'fixed',
      zIndex: 99999,
      width: w,
      left,
      ...(showAbove
        ? { bottom: vh - rect.top + 4, top: 'auto' }
        : { top: rect.bottom + 4, bottom: 'auto' }
      ),
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current?.contains(e.target as Node) || triggerRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler, true);
    document.addEventListener('touchstart', handler, true);
    return () => {
      document.removeEventListener('mousedown', handler, true);
      document.removeEventListener('touchstart', handler, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(v => !v)}
        disabled={isUpdating}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-all disabled:opacity-50 min-h-[36px] shrink-0"
        title="Bahasa Tampilan Judul"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <span className="hidden sm:inline truncate max-w-[120px]">{current.flag} {current.label}</span>
        <span className="sm:hidden">{current.flag}</span>
        <ChevronDown className="w-3 h-3 shrink-0 opacity-50" />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          style={menuStyle}
          className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <p className="px-3 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/60">
            Bahasa Tampilan Judul
          </p>
          {TITLE_LANG_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onLangChange(opt.value); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-colors ${
                currentLang === opt.value ? 'bg-primary/10 font-semibold' : 'hover:bg-muted'
              }`}
            >
              <span className="text-sm w-5 text-center shrink-0">{opt.flag}</span>
              <span className={`flex-1 text-left ${currentLang === opt.value ? 'text-primary' : 'text-foreground'}`}>
                {opt.label}
              </span>
              {currentLang === opt.value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
