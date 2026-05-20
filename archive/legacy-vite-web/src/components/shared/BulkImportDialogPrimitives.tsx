import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Check, X, Search, Loader2, Film, AlertTriangle,
  CheckCircle2, HelpCircle, Languages, Zap,
} from 'lucide-react';
import {
  deserializeAlternativeTitles,
  buildTitleDisplayList,
} from '@/hooks/useAlternativeTitles';
import type { BulkItem, SearchCandidate } from '@/features/media/services/bulk-import.types';
import { scoreToConfidence } from '@/features/media/services/bulk-import-normalization';
import { searchWithAccuracy } from '@/features/media/services/bulk-import-enrichment';
export function ConfidenceBadge({ confidence, score, reviewed }: {
  confidence?: BulkItem['matchConfidence']; score?: number; reviewed?: boolean;
}) {
  if (!confidence || confidence === 'none') return null;
  const cfg = {
    high:   { Icon: CheckCircle2, label: 'Akurat',      cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25' },
    medium: { Icon: AlertTriangle, label: 'Perlu Cek',  cls: 'bg-amber-500/10  text-amber-500  border-amber-500/25' },
    low:    { Icon: HelpCircle,    label: 'Tidak Yakin', cls: 'bg-red-500/10    text-red-500    border-red-500/25' },
  }[confidence];
  const { Icon, label, cls } = cfg;
  return (
    <div className="flex items-center gap-1">
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${cls}`}>
        <Icon className="w-2.5 h-2.5" />
        {label}{score !== undefined ? ` ${Math.round(score*100)}%` : ''}
      </span>
      {reviewed && (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold border bg-blue-500/10 text-blue-500 border-blue-500/25">
          <Check className="w-2.5 h-2.5" /> Reviewed
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AltTitlesInline
// ─────────────────────────────────────────────────────────────────────────────
export function AltTitlesInline({ altJson, mediaType }: { altJson?: string | null; mediaType: 'anime' | 'donghua' }) {
  const alt = deserializeAlternativeTitles(altJson);
  if (!alt) return null;

  const displayItems = buildTitleDisplayList({ ...alt, stored_title: '' }, mediaType);
  const synonyms = (alt.synonyms || []).filter(s => s?.trim()).slice(0, 5);

  if (displayItems.length === 0 && synonyms.length === 0) return null;

  return (
    <div className="mt-1.5 pt-1.5 border-t border-border/40">
      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
        <Languages className="w-2.5 h-2.5" /> Nama Alternatif
      </p>
      <div className="flex flex-wrap gap-1">
        {displayItems.map((di, idx) => (
          <span key={idx} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border ${di.badgeColor}`}>
            <span className="font-bold text-[8px] opacity-70">{di.badge}</span>
            <span className="break-all whitespace-normal">{di.value}</span>
          </span>
        ))}
        {synonyms.map((s, idx) => (
          <span key={`syn-${idx}`} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] bg-muted text-muted-foreground border border-border/50 break-all whitespace-normal">
            {s}
          </span>
        ))}
        {(alt.synonyms || []).length > 5 && (
          <span className="text-[9px] text-muted-foreground px-1">+{(alt.synonyms || []).length - 5} lagi</span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InlineTitleEditor
// ─────────────────────────────────────────────────────────────────────────────

interface InlineTitleEditorProps {
  item: BulkItem;
  onApply: (candidate: SearchCandidate) => void;
  onTitleChange: (title: string) => void;
  onClose: () => void;
}

export function InlineTitleEditor({ item, onApply, onTitleChange, onClose }: InlineTitleEditorProps) {
  const [query, setQuery] = useState(item.title);
  const [results, setResults] = useState<SearchCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults([]); setSearched(false); return; }
    setLoading(true);
    setSearched(false);
    try {
      const candidates = await searchWithAccuracy(q.trim(), item.season);
      setResults(candidates.slice(0, 8));
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [item.season]);

  const handleChange = (val: string) => {
    setQuery(val);
    onTitleChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 400);
  };

  return (
    <div className="mt-1 space-y-1.5">
      <div className="flex gap-1.5 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') runSearch(query);
              if (e.key === 'Escape') onClose();
            }}
            placeholder="Ketik judul untuk cari MAL/AniList…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring/25 focus:border-primary/60"
          />
        </div>
        <button
          onClick={() => runSearch(query)}
          disabled={loading || query.trim().length < 2}
          className="shrink-0 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-[11px] font-bold disabled:opacity-40 flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
          Cari
        </button>
        <button onClick={onClose} className="shrink-0 p-2 rounded-xl hover:bg-muted transition-colors">
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </div>

      {(loading || results.length > 0 || searched) && (
        <div className="rounded-xl border border-border bg-card shadow-xl overflow-hidden max-h-[220px] overflow-y-auto">
          {loading && (
            <div className="py-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" /> Mencari di MAL & AniList…
            </div>
          )}
          {!loading && searched && results.length === 0 && (
            <div className="py-5 text-center text-xs text-muted-foreground">
              Tidak ada hasil. Coba judul yang berbeda.
            </div>
          )}
          {!loading && results.map((c, i) => (
            <button
              key={i}
              onClick={() => onApply(c)}
              className="w-full flex items-start gap-2 sm:gap-3 px-2 sm:px-3 py-2 hover:bg-muted/70 transition-colors text-left border-b border-border/40 last:border-0 group"
            >
              <div className="w-8 h-11 sm:w-9 sm:h-[52px] rounded-lg overflow-hidden bg-muted shrink-0 border border-border/30">
                {c.cover_url
                  ? <img src={c.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  : <div className="w-full h-full flex items-center justify-center"><Film className="w-3.5 h-3.5 text-muted-foreground/30" /></div>
                }
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-[10px] sm:text-[11px] font-semibold text-foreground leading-snug break-words whitespace-normal">
                  {c.title_english && c.title_english !== c.title ? c.title_english : c.title}
                </p>
                {c.title_native && (
                  <p className="text-[9px] text-muted-foreground/70 break-words whitespace-normal">{c.title_native}</p>
                )}
                <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 mt-1">
                  {c.year && <span className="text-[9px] text-muted-foreground">{c.year}</span>}
                  {c.episodes && <span className="text-[9px] text-muted-foreground">· {c.episodes} ep</span>}
                  {c.score && <span className="text-[9px] text-amber-500">★ {c.score.toFixed(1)}</span>}
                  {c.is_movie && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-violet-500/15 text-violet-500 font-bold">FILM</span>
                  )}
                  {c.detectedSeason && c.detectedSeason > 1 && (
                    <span className="text-[8px] px-1 py-0.5 rounded bg-blue-500/10 text-blue-500 font-bold">S{c.detectedSeason}</span>
                  )}
                  <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
                    c.source === 'anilist' ? 'bg-violet-500/10 text-violet-500' : 'bg-blue-500/10 text-blue-500'
                  }`}>
                    {c.source === 'anilist' ? `AL#${c.anilist_id}` : `MAL#${c.mal_id}`}
                  </span>
                  <ConfidenceBadge confidence={scoreToConfidence(c.similarity)} score={c.similarity} />
                </div>
              </div>
              <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Check className="w-4 h-4 text-primary" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ParentTitleField
// ─────────────────────────────────────────────────────────────────────────────
interface ParentTitleFieldProps {
  value: string;
  onChange: (v: string) => void;
  allItems: BulkItem[];
  currentIndex: number;
}

export function ParentTitleField({ value, onChange, allItems, currentIndex }: ParentTitleFieldProps) {
  const [showDD, setShowDD] = useState(false);
  const [inputVal, setInputVal] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value); }, [value]);

  const suggestions = Array.from(new Set(
    allItems
      .filter((it, idx) => idx !== currentIndex && it.title.trim())
      .map(it => it.parent_title?.trim() || it.title.trim())
      .filter(Boolean)
  )).sort();

  const filtered = suggestions.filter(s =>
    !inputVal || s.toLowerCase().includes(inputVal.toLowerCase())
  );

  useEffect(() => {
    if (!showDD) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowDD(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDD]);

  const handleChange = (v: string) => { setInputVal(v); onChange(v); setShowDD(true); };
  const handleSelect = (v: string) => { setInputVal(v); onChange(v); setShowDD(false); };
  const handleClear = () => { setInputVal(''); onChange(''); setShowDD(false); };

  return (
    <div ref={ref} className="relative">
      <label className="text-[8px] font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
        📁 Kelompokkan dengan (parent title)
      </label>
      <div className="relative">
        <input
          value={inputVal}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setShowDD(true)}
          placeholder="Kosongkan jika tidak dikelompokkan"
          className="w-full px-2 py-1.5 pr-7 rounded-lg border border-input bg-background text-[10px] focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        {inputVal && (
          <button type="button" onClick={handleClear} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {showDD && filtered.length > 0 && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDD(false)} />
          <div className="absolute left-0 right-0 top-full mt-0.5 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-36 overflow-y-auto">
            <button type="button" onClick={handleClear} className="w-full text-left px-3 py-2 text-[10px] text-muted-foreground hover:bg-muted transition-colors">
              — Tidak dikelompokkan —
            </button>
            {filtered.map(s => (
              <button key={s} type="button" onClick={() => handleSelect(s)}
                className={`w-full text-left px-3 py-2 text-[10px] truncate hover:bg-muted transition-colors ${inputVal === s ? 'text-primary font-semibold' : 'text-foreground'}`}>
                {s}
              </button>
            ))}
          </div>
        </>
      )}
      <p className="text-[8px] text-muted-foreground mt-0.5">Isi untuk menumpuk season ke dalam satu card.</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

