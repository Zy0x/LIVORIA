/**
 * AnimeExtraFields.tsx — UPDATED untuk Donghua multi-language search
 *
 * PERUBAHAN:
 * - Tambahkan prop `mediaType?: 'anime' | 'donghua'`
 * - Jika mediaType === 'donghua', gunakan useDonghuaSearch (multi-layer)
 * - Jika mediaType === 'anime', tetap pakai useAnimeSearch (seperti sebelumnya)
 * - Tambahkan UI indicator "Layer pencarian" (alias/fuzzy/AI)
 * - Tampilkan hint pencarian multi-bahasa untuk Donghua
 *
 * Semua prop lain tidak berubah → backward compatible.
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, Search, Loader2, ExternalLink,
  Database, AlertCircle, CheckCircle2, X, Sparkles,
  Building2, CalendarClock, Link2, Hash, Tag, FileText,
  Languages, RefreshCw, Star, Hash as HashIcon, Film, Clock,
  AlertTriangle, Zap, Brain, BookOpen,
} from 'lucide-react';
import {
  useAnimeSearch,
  translateToIndonesian,
  type AnimeSearchResult,
} from '@/hooks/useAnimeSearch';
import { useDonghuaSearch } from '@/hooks/useDonghuaSearch';

export interface AnimeExtraData {
  release_year?: number | null;
  studio?: string;
  mal_url?: string;
  anilist_url?: string;
  episodes?: number | null;
  genres_from_search?: string;
  synopsis_id?: string;
  mal_id?: number | null;
  anilist_id?: number | null;
}

interface Props {
  value: AnimeExtraData;
  onChange: (data: AnimeExtraData) => void;
  titleHint?: string;
  hasCoverOverride?: boolean;
  onTitleChange?: (title: string) => void;
  onCoverUrlChange?: (url: string) => void;
  onGenresChange?: (genres: string[]) => void;
  onEpisodesChange?: (eps: number) => void;
  onSynopsisChange?: (synopsis: string) => void;
  onStatusChange?: (status: 'on-going' | 'completed' | 'planned') => void;
  onSeasonChange?: (season: number) => void;
  onCourChange?: (cour: string) => void;
  onParentTitleChange?: (parentTitle: string) => void;
  onRatingChange?: (rating: number) => void;
  onIsMovieChange?: (isMovie: boolean) => void;
  onDurationMinutesChange?: (minutes: number | null) => void;
  /** NEW: Tentukan mode pencarian. Default 'anime'. Untuk Donghua gunakan 'donghua'. */
  mediaType?: 'anime' | 'donghua';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapStatus(status?: string): 'on-going' | 'completed' | 'planned' | null {
  if (!status) return null;
  const s = status.toLowerCase().replace(/_/g, ' ').trim();
  if (s === 'releasing' || s === 'currently airing' || (s.includes('airing') && !s.includes('finished'))) return 'on-going';
  if (s === 'finished' || s === 'finished airing' || s === 'completed' || s === 'cancelled' || s.includes('finished')) return 'completed';
  if (s === 'not yet released' || s === 'not yet aired' || s === 'upcoming' || s === 'hiatus' || s.includes('not yet')) return 'planned';
  return null;
}

function extractSeasonFromTitle(title: string): number | null {
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

function extractCourFromTitle(title: string): string | null {
  const patterns = [/\b(part\s*\d+)\b/i, /\b(cour\s*\d+)\b/i, /\b(cours\s*\d+)\b/i, /\b(\d+st|\d+nd|\d+rd|\d+th)\s+cour/i];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1];
  }
  return null;
}

function extractBaseTitle(title: string): string {
  return title
    .replace(/\s+season\s+\d+/gi, '').replace(/\s+\d+(?:st|nd|rd|th)\s+season/gi, '')
    .replace(/\s+part\s*\d+/gi, '').replace(/\s+cour\s*\d+/gi, '')
    .replace(/\s+II$|III$|IV$/i, '').replace(/\s+\d+$/, '').trim();
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

// ─── Layer badge ──────────────────────────────────────────────────────────────
function SearchLayerBadge({ layer }: { layer: 'alias' | 'fuzzy' | 'ai' | null }) {
  if (!layer) return null;

  const configs = {
    alias: { icon: BookOpen, label: 'Database alias', color: 'bg-success/15 text-success border-success/20' },
    fuzzy: { icon: Search, label: 'Pencarian fuzzy', color: 'bg-info/15 text-info border-info/20' },
    ai: { icon: Brain, label: 'AI expanded', color: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20' },
  };

  const cfg = configs[layer];
  const Icon = cfg.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.color}`}>
      <Icon className="w-2.5 h-2.5" />
      {cfg.label}
    </span>
  );
}

// ─── Source badge ─────────────────────────────────────────────────────────────
function SourceBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${ok ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground/50'}`}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
      {label}
    </span>
  );
}

// ─── Result card ─────────────────────────────────────────────────────────────
function ResultCard({ result, onSelect }: { result: AnimeSearchResult; onSelect: (r: AnimeSearchResult) => void }) {
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnimeExtraFields({
  value, onChange, titleHint, hasCoverOverride = false,
  onTitleChange, onCoverUrlChange, onGenresChange, onEpisodesChange,
  onSynopsisChange, onStatusChange, onSeasonChange, onCourChange,
  onParentTitleChange, onRatingChange, onIsMovieChange, onDurationMinutesChange,
  mediaType = 'anime',
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AnimeSearchResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const [lastRawResult, setLastRawResult] = useState<AnimeSearchResult | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isDonghua = mediaType === 'donghua';

  // ── Gunakan hook yang sesuai ──────────────────────────────────────────────
  const animeHook = useAnimeSearch({ debounceMs: 600, minChars: 3 });
  const donghuaHook = useDonghuaSearch({ debounceMs: 700, minChars: 2 });

  const activeHook = isDonghua ? donghuaHook : animeHook;
  const { results, isSearching, error, jikanOk, anilistOk, search, clearResults } = activeHook;
  const searchLayer = isDonghua ? (donghuaHook as any).searchLayer : null;

  useEffect(() => {
    if (!showResults) return;
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showResults]);

  const prevExpanded = useRef(false);
  useEffect(() => {
    if (expanded && !prevExpanded.current && titleHint && !searchQuery) {
      setSearchQuery(titleHint);
      search(titleHint);
      setShowResults(true);
    }
    prevExpanded.current = expanded;
  }, [expanded, titleHint]);

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setShowResults(true);
    search(q);
  };

  const doTranslate = async (synopsisEn: string) => {
    if (!synopsisEn) return;
    setIsTranslating(true);
    setTranslationError(false);
    try {
      const translated = await translateToIndonesian(synopsisEn);
      onChange({ ...value, synopsis_id: translated });
      onSynopsisChange?.(translated);
    } catch {
      setTranslationError(true);
    } finally {
      setIsTranslating(false);
    }
  };

  const buildBaseNext = (result: AnimeSearchResult): AnimeExtraData => {
    const next: AnimeExtraData = { ...value };
    if (result.year != null) next.release_year = result.year;
    if (result.studios) next.studio = result.studios;
    if (result.mal_url) next.mal_url = result.mal_url;
    if (result.anilist_url) next.anilist_url = result.anilist_url;
    if (result.mal_id != null) next.mal_id = result.mal_id;
    if (result.anilist_id != null) next.anilist_id = result.anilist_id;
    if (result.genres && result.genres.length > 0) {
      next.genres_from_search = result.genres.join(', ');
      onGenresChange?.(result.genres);
    }
    if (result.score && result.score > 0) {
      onRatingChange?.(Math.min(10, Math.round(result.score * 10) / 10));
    }
    return next;
  };

  const applyAsNonMovie = async (result: AnimeSearchResult) => {
    const next = buildBaseNext(result);
    if (result.episodes && result.episodes > 0) { next.episodes = result.episodes; onEpisodesChange?.(result.episodes); }
    const mappedStatus = mapStatus(result.status);
    if (mappedStatus) onStatusChange?.(mappedStatus);
    const bestTitle = result.title_english || result.title;
    if (bestTitle) onTitleChange?.(bestTitle);
    const seasonNum = extractSeasonFromTitle(bestTitle);
    if (seasonNum && seasonNum > 0) onSeasonChange?.(seasonNum);
    const courStr = extractCourFromTitle(bestTitle);
    if (courStr) onCourChange?.(courStr);
    if (seasonNum && seasonNum > 1) {
      const baseTitle = extractBaseTitle(bestTitle);
      if (baseTitle && baseTitle !== bestTitle) onParentTitleChange?.(baseTitle);
    }
    if (!hasCoverOverride && result.cover_url) onCoverUrlChange?.(result.cover_url);
    onIsMovieChange?.(false);
    onDurationMinutesChange?.(null);
    onChange(next);
    const synopsisSource = result.synopsis_en || result.synopsis;
    if (synopsisSource) {
      setIsTranslating(true);
      setTranslationError(false);
      try {
        const translated = await translateToIndonesian(synopsisSource);
        onChange({ ...next, synopsis_id: translated });
        onSynopsisChange?.(translated);
      } catch {
        setTranslationError(true);
        onChange({ ...next, synopsis_id: synopsisSource });
        onSynopsisChange?.(synopsisSource);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const applyAsMovie = async (result: AnimeSearchResult) => {
    const next = buildBaseNext(result);
    const bestTitle = result.title_english || result.title;
    if (bestTitle) onTitleChange?.(bestTitle);
    if (!hasCoverOverride && result.cover_url) onCoverUrlChange?.(result.cover_url);
    const mappedStatus = mapStatus(result.status);
    onStatusChange?.(mappedStatus === 'on-going' ? 'completed' : (mappedStatus || 'completed'));
    onIsMovieChange?.(true);
    if (result.duration_minutes) onDurationMinutesChange?.(result.duration_minutes);
    onChange(next);
    const synopsisSource = result.synopsis_en || result.synopsis;
    if (synopsisSource) {
      setIsTranslating(true);
      setTranslationError(false);
      try {
        const translated = await translateToIndonesian(synopsisSource);
        onChange({ ...next, synopsis_id: translated });
        onSynopsisChange?.(translated);
      } catch {
        setTranslationError(true);
        onChange({ ...next, synopsis_id: synopsisSource });
        onSynopsisChange?.(synopsisSource);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const handleSelect = async (result: AnimeSearchResult) => {
    setSelectedResult(result);
    setLastRawResult(result);
    setShowResults(false);
    if (result.is_movie) await applyAsMovie(result);
    else await applyAsNonMovie(result);
  };

  const handleMovieOverride = async (userWantsMovie: boolean) => {
    if (!lastRawResult) { onIsMovieChange?.(userWantsMovie); if (!userWantsMovie) onDurationMinutesChange?.(null); return; }
    const correctedResult: AnimeSearchResult = { ...lastRawResult, is_movie: userWantsMovie };
    if (userWantsMovie) await applyAsMovie(correctedResult);
    else await applyAsNonMovie(correctedResult);
    setSelectedResult(correctedResult);
  };

  const clearSelected = () => {
    setSelectedResult(null);
    setLastRawResult(null);
    setSearchQuery('');
    clearResults();
    onChange({
      ...value,
      release_year: null, studio: '', mal_url: '', anilist_url: '',
      episodes: null, genres_from_search: '', synopsis_id: '', mal_id: null, anilist_id: null,
    });
    onGenresChange?.([]);
    onSynopsisChange?.('');
    onIsMovieChange?.(false);
    onDurationMinutesChange?.(null);
  };

  const hasData = !!(value.release_year || value.studio || value.mal_url || value.anilist_url || value.episodes || value.genres_from_search || value.synopsis_id);

  const ic = 'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';

  // Placeholder dan label berbeda untuk Donghua
  const searchPlaceholder = isDonghua
    ? 'Cari dengan nama China, Inggris, atau singkatan... (mis: BTTH, Dou Po Cangqiong)'
    : 'Ketik judul untuk auto-fill... (status, studio, dll terisi otomatis)';

  const bannerTitle = isDonghua
    ? `Auto-fill Donghua — China/Inggris/Singkatan`
    : `Auto-fill Semua Field dari MAL & AniList`;

  const bannerDesc = isDonghua
    ? `Mendukung nama China (pinyin), nama Inggris, dan singkatan seperti BTTH, SL, MDZS. Sistem akan otomatis mencari padanan yang tepat di database MAL & AniList menggunakan 4 layer pencarian.`
    : `Pilih hasil untuk otomatis mengisi semua field — termasuk status rilis, studio, tahun, genre, sinopsis, dan deteksi Movie.`;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <Sparkles className="w-4 h-4 text-info shrink-0" />
          <span className="text-sm font-medium text-foreground truncate">
            {isDonghua ? 'Cari Donghua (Multi-Bahasa + Singkatan)' : 'Cari Otomatis dari MAL & AniList'}
          </span>
          {isDonghua && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 font-medium shrink-0 hidden sm:inline border border-violet-500/20">
              4 Layer
            </span>
          )}
          {!isDonghua && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0 hidden sm:inline">Auto-fill</span>
          )}
          {hasData && <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold shrink-0">Terisi</span>}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0 ml-2" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-2" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4 border-t border-border overflow-hidden w-full min-w-0">
          {/* Info banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info/5 border border-info/20 overflow-hidden w-full min-w-0">
            <Database className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 overflow-hidden flex-1">
              <p className="text-xs font-semibold text-info">{bannerTitle}</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed break-words">{bannerDesc}</p>
              {isDonghua && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">中文: 斗破苍穹</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">英文: BTTH</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Pinyin: Dou Po Cangqiong</span>
                </div>
              )}
              <div className="flex items-center gap-2 pt-0.5">
                <SourceBadge label="MyAnimeList" ok={jikanOk} />
                <SourceBadge label="AniList" ok={anilistOk} />
                {searchLayer && <SearchLayerBadge layer={searchLayer} />}
              </div>
            </div>
          </div>

          {/* Contoh singkatan untuk Donghua */}
          {isDonghua && !selectedResult && (
            <div className="rounded-xl bg-violet-500/5 border border-violet-500/15 p-3">
              <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 mb-2">
                Contoh singkatan yang didukung:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { abbr: 'BTTH', full: 'Battle Through The Heavens' },
                  { abbr: 'SL', full: 'Soul Land / Douluo Dalu' },
                  { abbr: 'TKA', full: "The King's Avatar" },
                  { abbr: 'MDZS', full: 'Mo Dao Zu Shi' },
                  { abbr: 'TGCF', full: "Heaven Official's Blessing" },
                  { abbr: 'LC', full: 'Link Click' },
                  { abbr: 'TDG', full: 'Tales of Demons and Gods' },
                  { abbr: 'MU', full: 'Martial Universe' },
                ].map(({ abbr, full }) => (
                  <button
                    key={abbr}
                    type="button"
                    onClick={() => { handleSearchChange(abbr); }}
                    className="group text-[9px] px-2 py-1 rounded-lg bg-muted hover:bg-violet-500/15 text-muted-foreground hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-medium border border-transparent hover:border-violet-500/20"
                    title={full}
                  >
                    {abbr}
                    <span className="hidden group-hover:inline ml-1 text-[8px] opacity-70">→ {full.substring(0, 20)}{full.length > 20 ? '...' : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search box */}
          <div ref={searchContainerRef} className="relative min-w-0 w-full">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              {isDonghua ? 'Cari Donghua (nama apapun)' : 'Cari di Database Eksternal'}
            </label>

            {selectedResult ? (
              <div className="space-y-2">
                <div className="flex items-start gap-2 p-3 rounded-xl border border-success/30 bg-success/5 overflow-hidden w-full min-w-0">
                  {selectedResult.cover_url && (
                    <img src={selectedResult.cover_url} alt={selectedResult.title} className="w-9 h-[52px] object-cover rounded-lg shrink-0 border border-border/50" />
                  )}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 break-words">{selectedResult.title}</p>
                      {selectedResult.is_movie && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[9px] font-bold border border-violet-500/20 shrink-0">
                          <Film className="w-2 h-2" />FILM
                        </span>
                      )}
                    </div>
                    {selectedResult.title_japanese && (
                      <p className="text-[10px] text-muted-foreground truncate">{selectedResult.title_japanese}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5 min-w-0">
                      {selectedResult.year && <span className="text-[10px] text-muted-foreground shrink-0">{selectedResult.year}</span>}
                      {selectedResult.studios && <span className="text-[10px] text-muted-foreground shrink-0">· {selectedResult.studios}</span>}
                    </div>
                    <p className="text-[10px] text-success font-medium mt-1 leading-tight">✓ Semua field sudah diisi otomatis</p>
                    {searchLayer && (
                      <div className="flex items-center gap-1 mt-1">
                        <SearchLayerBadge layer={searchLayer} />
                      </div>
                    )}
                    <div className="flex gap-1 mt-1 flex-wrap min-w-0">
                      {selectedResult.mal_id && (
                        <a href={`https://myanimelist.net/anime/${selectedResult.mal_id}`} target="_blank" rel="noopener noreferrer"
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-semibold hover:bg-blue-500/25 transition-colors"
                          onClick={e => e.stopPropagation()}>MAL#{selectedResult.mal_id} ↗</a>
                      )}
                      {selectedResult.anilist_id && (
                        <a href={`https://anilist.co/anime/${selectedResult.anilist_id}`} target="_blank" rel="noopener noreferrer"
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-semibold hover:bg-violet-500/25 transition-colors"
                          onClick={e => e.stopPropagation()}>AL#{selectedResult.anilist_id} ↗</a>
                      )}
                    </div>
                  </div>
                  <button type="button" onClick={clearSelected}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                    title="Hapus pilihan">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Movie correction hints */}
                {lastRawResult?.is_movie && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/8 border border-amber-500/20">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">
                      Terdeteksi sebagai <strong>Film</strong>. Jika ini sebenarnya serial, matikan toggle "Tandai sebagai Movie" — data episode akan diisi ulang.
                    </p>
                  </div>
                )}
                {lastRawResult && !lastRawResult.is_movie && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-violet-500/8 border border-violet-500/20">
                    <Film className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-violet-700 dark:text-violet-300 leading-relaxed">
                      Terdeteksi sebagai <strong>Serial</strong>. Jika sebenarnya film, aktifkan toggle "Tandai sebagai {isDonghua ? 'Film' : 'Movie'}".
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => { if (results.length > 0) setShowResults(true); }}
                  placeholder={searchPlaceholder}
                  className={`pl-10 pr-10 ${ic}`}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button type="button" onClick={() => { setSearchQuery(''); clearResults(); setShowResults(false); }}
                    className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {/* Results dropdown */}
            {showResults && !selectedResult && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-2xl shadow-2xl z-50 overflow-hidden max-h-[360px] overflow-y-auto">
                {isSearching && results.length === 0 && (
                  <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    {isDonghua ? 'Mencari di semua layer (alias → fuzzy → AI)...' : 'Mencari di MAL & AniList...'}
                  </div>
                )}
                {!isSearching && error && (
                  <div className="px-4 py-4 space-y-2">
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                    {isDonghua && (
                      <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2 leading-relaxed">
                        <strong>Tips:</strong> Coba nama bahasa Inggris, nama pinyin tanpa spasi, atau singkatan (BTTH, SL, dll).
                        Atau ketik nama lengkap seperti "Battle Through the Heavens".
                      </div>
                    )}
                  </div>
                )}
                {!isSearching && results.length > 0 && (
                  <>
                    <div className="px-3 py-2 border-b border-border/50 bg-muted/20 flex items-center gap-2">
                      <p className="text-[10px] text-muted-foreground font-medium flex-1">
                        {results.length} hasil{results.filter(r => r.is_movie).length > 0 && ` · ${results.filter(r => r.is_movie).length} film`}
                      </p>
                      {searchLayer && <SearchLayerBadge layer={searchLayer} />}
                    </div>
                    <div className="divide-y divide-border/40">
                      {results.map((r, i) => (
                        <ResultCard key={`${r.mal_id}-${r.anilist_id}-${i}`} result={r} onSelect={handleSelect} />
                      ))}
                    </div>
                  </>
                )}
                {!isSearching && !error && results.length === 0 && searchQuery.length >= 2 && (
                  <div className="px-4 py-4 space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Tidak ada hasil untuk "{searchQuery}"</p>
                    {isDonghua && (
                      <p className="text-[11px] text-muted-foreground text-center">
                        Coba singkatan (BTTH), nama pinyin (Dou Po Cangqiong), atau nama Inggris (Battle Through the Heavens)
                      </p>
                    )}
                  </div>
                )}
                {searchQuery.length > 0 && searchQuery.length < 2 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground text-center">Ketik minimal 2 karakter</div>
                )}
              </div>
            )}
          </div>

          {/* ID badges */}
          {(value.mal_id || value.anilist_id) && (
            <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HashIcon className="w-3 h-3" /> ID Database
              </p>
              <div className="flex flex-wrap gap-2">
                {value.mal_id && (
                  <a href={`https://myanimelist.net/anime/${value.mal_id}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-500 hover:bg-blue-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" />MAL ID: {value.mal_id}
                  </a>
                )}
                {value.anilist_id && (
                  <a href={`https://anilist.co/anime/${value.anilist_id}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-500 hover:bg-violet-500/20 transition-colors">
                    <ExternalLink className="w-3 h-3" />AniList ID: {value.anilist_id}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Manual fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Tahun Rilis
              </label>
              <input type="number" value={value.release_year || ''} onChange={e => onChange({ ...value, release_year: e.target.value ? Number(e.target.value) : null })}
                placeholder={`${new Date().getFullYear()}`} className={ic} min={1960} max={new Date().getFullYear() + 2} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Studio
              </label>
              <input type="text" value={value.studio || ''} onChange={e => onChange({ ...value, studio: e.target.value })}
                placeholder="cth: MAPPA, Ufotable" className={ic} maxLength={100} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Total Episode
              </label>
              <input type="number" value={value.episodes || ''} onChange={e => { const eps = e.target.value ? Number(e.target.value) : null; onChange({ ...value, episodes: eps }); if (eps && eps > 0) onEpisodesChange?.(eps); }}
                placeholder="cth: 12, 24" className={ic} min={1} />
            </div>
          </div>

          {value.genres_from_search && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-info" /> Genre (terisi otomatis)
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/30 border border-border/50">
                {value.genres_from_search.split(', ').filter(Boolean).map(g => (
                  <span key={g} className="text-[11px] px-2 py-1 rounded-lg bg-card border border-border text-foreground font-medium">{g}</span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-success" />
              <span className="text-success">Sinopsis</span>
              <span className="text-muted-foreground">(Bahasa Indonesia)</span>
              {isTranslating && <span className="inline-flex items-center gap-1 text-[10px] text-info font-medium ml-1"><Languages className="w-3 h-3 animate-pulse" />Menerjemahkan...</span>}
              {translationError && <span className="text-[10px] text-warning ml-1">Terjemahan gagal</span>}
            </label>
            <div className="relative">
              <textarea value={value.synopsis_id || ''} onChange={e => { onChange({ ...value, synopsis_id: e.target.value }); onSynopsisChange?.(e.target.value); }}
                placeholder="Sinopsis dalam Bahasa Indonesia (auto-fill via terjemahan AI)..." rows={4} className={`${ic} resize-none pr-10`} maxLength={2000} />
              {selectedResult?.synopsis && (
                <button type="button" onClick={() => doTranslate(selectedResult.synopsis_en || selectedResult.synopsis || '')} disabled={isTranslating}
                  title="Terjemahkan ulang" className="absolute top-2 right-2 p-1.5 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors disabled:opacity-50">
                  <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            {value.synopsis_id && <p className="text-[10px] text-muted-foreground mt-1">{value.synopsis_id.length}/2000 karakter</p>}
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-500" /><span className="text-blue-500">MyAnimeList</span> URL
            </label>
            <div className="relative">
              <input type="url" value={value.mal_url || ''} onChange={e => onChange({ ...value, mal_url: e.target.value })}
                placeholder="https://myanimelist.net/anime/..." className={`${ic} pr-10`} />
              {value.mal_url && (
                <a href={value.mal_url} target="_blank" rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors" onClick={e => e.stopPropagation()}>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-violet-500" /><span className="text-violet-500">AniList</span> URL
            </label>
            <div className="relative">
              <input type="url" value={value.anilist_url || ''} onChange={e => onChange({ ...value, anilist_url: e.target.value })}
                placeholder="https://anilist.co/anime/..." className={`${ic} pr-10`} />
              {value.anilist_url && (
                <a href={value.anilist_url} target="_blank" rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-400 transition-colors" onClick={e => e.stopPropagation()}>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}