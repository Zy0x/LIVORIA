/**
 * TitleLanguageSwitch.tsx — LIVORIA
 *
 * Komponen dropdown untuk memilih bahasa tampilan judul.
 */

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown, Sparkles } from 'lucide-react';
import { createPortal } from 'react-dom';
import { type TitleLang, type TitleLanguageFlagCode, getTitleLanguageOptions } from '@/hooks/useTitleLanguage';

interface Props {
  currentLang: TitleLang;
  onLangChange: (lang: TitleLang) => void;
  isUpdating?: boolean;
  mediaType?: 'anime' | 'donghua';
}

function LanguageFlag({ code }: { code?: TitleLanguageFlagCode }) {
  if (code === 'jp') {
    return (
      <span className="relative block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] border border-border bg-white shadow-sm" aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-600" />
      </span>
    );
  }

  if (code === 'cn') {
    return (
      <span className="relative block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] border border-red-900/20 bg-red-600 shadow-sm" aria-hidden="true">
        <span className="absolute left-1 top-1 h-1.5 w-1.5 rotate-45 bg-yellow-300 [clip-path:polygon(50%_0,61%_35%,98%_35%,68%_57%,79%_91%,50%_70%,21%_91%,32%_57%,2%_35%,39%_35%)]" />
      </span>
    );
  }

  if (code === 'id') {
    return (
      <span className="block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] border border-border shadow-sm" aria-hidden="true">
        <span className="block h-1/2 bg-red-600" />
        <span className="block h-1/2 bg-white" />
      </span>
    );
  }

  if (code === 'gb') {
    return (
      <span className="relative block h-3.5 w-5 shrink-0 overflow-hidden rounded-[3px] border border-border bg-blue-700 shadow-sm" aria-hidden="true">
        <span className="absolute left-1/2 top-0 h-full w-1.5 -translate-x-1/2 bg-white" />
        <span className="absolute left-0 top-1/2 h-1.5 w-full -translate-y-1/2 bg-white" />
        <span className="absolute left-1/2 top-0 h-full w-0.5 -translate-x-1/2 bg-red-600" />
        <span className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-red-600" />
      </span>
    );
  }

  return (
    <span className="flex h-3.5 w-5 shrink-0 items-center justify-center rounded-[3px] border border-primary/25 bg-primary/10 text-primary shadow-sm" aria-hidden="true">
      <Sparkles className="h-2.5 w-2.5" />
    </span>
  );
}

export default function TitleLanguageSwitch({ currentLang, onLangChange, isUpdating, mediaType = 'anime' }: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});

  const options = getTitleLanguageOptions(mediaType);
  const current = options.find(o => o.value === currentLang) || options[0];

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
        className="inline-flex min-w-0 max-w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground disabled:opacity-50 min-h-[36px] shrink-0"
        title="Bahasa Tampilan Judul"
      >
        <Globe className="w-3.5 h-3.5 shrink-0" />
        <LanguageFlag code={current.flagCode} />
        <span className="hidden min-[360px]:inline lg:hidden min-w-0 truncate">{current.shortLabel}</span>
        <span className="hidden lg:inline min-w-0 truncate max-w-[132px]">{current.label}</span>
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
          {options.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onLangChange(opt.value); setOpen(false); }}
              className={`flex items-center gap-2.5 w-full px-3 py-2.5 text-xs transition-colors ${
                currentLang === opt.value ? 'bg-primary/10 font-semibold' : 'hover:bg-muted'
              }`}
            >
              <LanguageFlag code={opt.flagCode} />
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
