import {
  Search, Database, AlertCircle, CheckCircle2, Film, Clock, Brain, BookOpen,
} from 'lucide-react';
import type { AnimeSearchResult } from '@/hooks/useAnimeSearch';
export function mapStatus(status?: string): 'on-going' | 'completed' | 'planned' | null {
  if (!status) return null;
  const s = status.toLowerCase().replace(/_/g, ' ').trim();
  if (s === 'releasing' || s === 'currently airing' || (s.includes('airing') && !s.includes('finished'))) return 'on-going';
  if (s === 'finished' || s === 'finished airing' || s === 'completed' || s === 'cancelled' || s.includes('finished')) return 'completed';
  if (s === 'not yet released' || s === 'not yet aired' || s === 'upcoming' || s === 'hiatus' || s.includes('not yet')) return 'planned';
  return null;
}

export function extractSeasonFromTitle(title: string): number | null {
  const patterns = [/season\s+(\d+)/i, /(\d+)(?:st|nd|rd|th)\s+season/i, /\s+(\d+)$/, /\s+II$/i, /\s+III$/i, /\s+IV$/i];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) {
      if (p.source.includes('II') && !p.source.includes('III')) return 2;
      if (p.source.includes('III')) return 3;
      if (p.source.includes('IV')) return 4;
      const n = parseInt(m[1] || m[0], 10);
      if (!isNaN(n) && n > 1 && n <= 20) return n;
    }
  }
  return null;
}

export function extractCourFromTitle(title: string): string | null {
  const patterns = [/\b(part\s*\d+)\b/i, /\b(cour\s*\d+)\b/i, /\b(cours\s*\d+)\b/i, /\b(\d+st|\d+nd|\d+rd|\d+th)\s+cour/i];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1];
  }
  return null;
}

export function extractBaseTitle(title: string): string {
  return title
    .replace(/\s+season\s+\d+/gi, '').replace(/\s+\d+(?:st|nd|rd|th)\s+season/gi, '')
    .replace(/\s+part\s*\d+/gi, '').replace(/\s+cour\s*\d+/gi, '')
    .replace(/\s+II$|III$|IV$/i, '').replace(/\s+\d+$/, '').trim();
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

// ─── Layer badge ──────────────────────────────────────────────────────────────
export function SearchLayerBadge({ layer }: { layer: 'alias' | 'fuzzy' | 'ai' | null }) {
  if (!layer) return null;
  const configs = {
    alias: { icon: BookOpen, label: 'Alias tersimpan', color: 'bg-success/15 text-success border-success/20' },
    fuzzy: { icon: Search, label: 'Pencarian fuzzy', color: 'bg-info/15 text-info border-info/20' },
    ai: { icon: Brain, label: 'AI expanded', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  };
  const cfg = configs[layer];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────
export function SourceBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ok ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground/50'}`}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

// ─── Result card ─────────────────────────────────────────────────────────────
export function ResultCard({ result, onSelect }: { result: AnimeSearchResult; onSelect: (r: AnimeSearchResult) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors"
    >
      {result.cover_url ? (
        <img src={result.cover_url} alt={result.title} className="w-10 h-14 object-cover rounded-lg shrink-0 border border-border/50" loading="lazy" />
      ) : (
        <div className="w-10 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
          <Database className="w-4 h-4 text-muted-foreground/30" />
        </div>
      )}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight break-words">{result.title}</p>
          {result.is_movie && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[9px] font-bold border border-violet-500/20 shrink-0">
              <Film className="w-2 h-2" />FILM
            </span>
          )}
        </div>
        {result.title_japanese && (
          <p className="text-[10px] text-muted-foreground truncate">{result.title_japanese}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {result.year && <span className="text-[10px] text-muted-foreground shrink-0">{result.year}</span>}
          {result.studios && <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">· {result.studios}</span>}
          {result.is_movie && result.duration_minutes ? (
            <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
              · <Clock className="w-2.5 h-2.5" />{formatDuration(result.duration_minutes)}
            </span>
          ) : result.episodes ? (
            <span className="text-[10px] text-muted-foreground shrink-0">· {result.episodes} ep</span>
          ) : null}
          {result.score && <span className="text-[10px] text-warning font-medium shrink-0">★ {result.score.toFixed(1)}</span>}
        </div>
        {result.genres && result.genres.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {result.genres.slice(0, 3).map(g => (
              <span key={g} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium">{g}</span>
            ))}
          </div>
        )}
        <div className="flex gap-1 mt-1 flex-wrap">
          {result.mal_id && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-semibold shrink-0">MAL#{result.mal_id}</span>}
          {result.anilist_id && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-semibold shrink-0">AL#{result.anilist_id}</span>}
        </div>
      </div>
    </button>
  );
}