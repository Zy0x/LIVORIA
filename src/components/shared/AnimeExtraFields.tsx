/**
 * AnimeExtraFields.tsx
 *
 * Section collapsible "Cari Otomatis dari MAL & AniList".
 * Auto-fill meliputi: Judul, Cover, Genre, Episode, Status, Sinopsis,
 * Studio, Tahun Rilis, Season, Rating, MAL URL, AniList URL.
 *
 * FIX:
 * 1. Terjemahan langsung via Groq API (tanpa Edge Function → tidak 401).
 * 2. Auto-fill Season, Cour, Pengelompokkan (parent_title), Status, Rating.
 * 3. Tampilkan MAL ID & AniList ID untuk penelusuran manual.
 * 4. Gunakan sinopsis asli sebagai fallback jika terjemahan gagal.
 * 5. [FIX] Selected state tidak overflow horizontal di dalam modal.
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, Search, Loader2, ExternalLink,
  Database, AlertCircle, CheckCircle2, X, Sparkles,
  Building2, CalendarClock, Link2, Hash, Tag, FileText,
  Languages, RefreshCw, Star, Layers, Hash as HashIcon
} from 'lucide-react';
import {
  useAnimeSearch,
  translateToIndonesian,
  type AnimeSearchResult,
} from '@/hooks/useAnimeSearch';

export interface AnimeExtraData {
  release_year?: number | null;
  studio?: string;
  mal_url?: string;
  anilist_url?: string;
  episodes?: number | null;
  genres_from_search?: string;
  synopsis_id?: string;
  // IDs untuk penelusuran manual
  mal_id?: number | null;
  anilist_id?: number | null;
}

interface Props {
  value: AnimeExtraData;
  onChange: (data: AnimeExtraData) => void;
  /** Judul anime saat ini */
  titleHint?: string;
  /** Apakah sudah ada cover upload manual */
  hasCoverOverride?: boolean;
  // ─── Callbacks auto-fill ke form utama ───
  onTitleChange?: (title: string) => void;
  onCoverUrlChange?: (url: string) => void;
  onGenresChange?: (genres: string[]) => void;
  onEpisodesChange?: (eps: number) => void;
  onSynopsisChange?: (synopsis: string) => void;
  onStatusChange?: (status: 'on-going' | 'completed' | 'planned') => void;
  /** Auto-fill season number */
  onSeasonChange?: (season: number) => void;
  /** Auto-fill cour/part string */
  onCourChange?: (cour: string) => void;
  /** Auto-fill parent_title untuk pengelompokkan */
  onParentTitleChange?: (parentTitle: string) => void;
  /** Auto-fill rating */
  onRatingChange?: (rating: number) => void;
}

// ─── Helper: map status AniList/Jikan → form status ──────────────────────────
function mapStatus(status?: string): 'on-going' | 'completed' | 'planned' | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('airing') || s.includes('releasing') || s.includes('currently')) return 'on-going';
  if (
    s.includes('finished') ||
    s.includes('completed') ||
    s.includes('finished_airing')
  )
    return 'completed';
  if (s.includes('not_yet') || s.includes('upcoming') || s.includes('not yet'))
    return 'planned';
  return null;
}

// ─── Helper: derive season number dari judul ──────────────────────────────────
// Coba parse angka season dari judul: "Season 2", "2nd Season", "III", dll.
function extractSeasonFromTitle(title: string): number | null {
  // "Season 2", "Season II", "2nd Season"
  const patterns = [
    /season\s+(\d+)/i,
    /(\d+)(?:st|nd|rd|th)\s+season/i,
    /\s+(\d+)$/,          // trailing number
    /\s+II$/i,            // Roman II
    /\s+III$/i,
    /\s+IV$/i,
  ];
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

// ─── Helper: derive cour/part dari judul ──────────────────────────────────────
function extractCourFromTitle(title: string): string | null {
  const patterns = [
    /\b(part\s*\d+)\b/i,
    /\b(cour\s*\d+)\b/i,
    /\b(cours\s*\d+)\b/i,
    /\b(\d+st|\d+nd|\d+rd|\d+th)\s+cour/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1];
  }
  return null;
}

// ─── Helper: get "base title" untuk parent_title (hapus season/cour suffix) ───
function extractBaseTitle(title: string): string {
  return title
    .replace(/\s+season\s+\d+/gi, '')
    .replace(/\s+\d+(?:st|nd|rd|th)\s+season/gi, '')
    .replace(/\s+part\s*\d+/gi, '')
    .replace(/\s+cour\s*\d+/gi, '')
    .replace(/\s+II$|III$|IV$/i, '')
    .replace(/\s+\d+$/, '')
    .trim();
}

// ─── Source icon badge ────────────────────────────────────────────────────────
function SourceBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
        ok
          ? 'bg-success/15 text-success'
          : 'bg-muted text-muted-foreground/50'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-2.5 h-2.5" />
      ) : (
        <AlertCircle className="w-2.5 h-2.5" />
      )}
      {label}
    </span>
  );
}

// ─── Search result card ───────────────────────────────────────────────────────
function ResultCard({
  result,
  onSelect,
}: {
  result: AnimeSearchResult;
  onSelect: (r: AnimeSearchResult) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="w-full text-left flex items-start gap-3 px-3 py-2.5 hover:bg-muted/60 transition-colors"
    >
      {result.cover_url ? (
        <img
          src={result.cover_url}
          alt={result.title}
          className="w-10 h-14 object-cover rounded-lg shrink-0 border border-border/50"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center">
          <Database className="w-4 h-4 text-muted-foreground/30" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{result.title}</p>
        {result.title_japanese && (
          <p className="text-[10px] text-muted-foreground truncate">{result.title_japanese}</p>
        )}
        <div className="flex flex-wrap items-center gap-1.5 mt-1">
          {result.year && (
            <span className="text-[10px] text-muted-foreground">{result.year}</span>
          )}
          {result.studios && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              · {result.studios}
            </span>
          )}
          {result.episodes && (
            <span className="text-[10px] text-muted-foreground">· {result.episodes} ep</span>
          )}
          {result.score && (
            <span className="text-[10px] text-warning font-medium">
              ★ {result.score.toFixed(1)}
            </span>
          )}
        </div>
        {result.genres && result.genres.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {result.genres.slice(0, 3).map((g) => (
              <span
                key={g}
                className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium"
              >
                {g}
              </span>
            ))}
            {result.genres.length > 3 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                +{result.genres.length - 3}
              </span>
            )}
          </div>
        )}
        {/* ID badges */}
        <div className="flex gap-1 mt-1 flex-wrap">
          {result.mal_id && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-semibold">
              MAL#{result.mal_id}
            </span>
          )}
          {result.anilist_id && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-semibold">
              AL#{result.anilist_id}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AnimeExtraFields({
  value,
  onChange,
  titleHint,
  hasCoverOverride = false,
  onTitleChange,
  onCoverUrlChange,
  onGenresChange,
  onEpisodesChange,
  onSynopsisChange,
  onStatusChange,
  onSeasonChange,
  onCourChange,
  onParentTitleChange,
  onRatingChange,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AnimeSearchResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const {
    results,
    isSearching,
    error,
    jikanOk,
    anilistOk,
    search,
    clearResults,
  } = useAnimeSearch({ debounceMs: 600, minChars: 3 });

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    if (!showResults) return;
    const handler = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showResults]);

  // Auto-populate search field dengan titleHint saat section di-expand
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

  // Terjemahkan sinopsis
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

  // ─── Handler saat user memilih hasil pencarian ────────────────────────────
  const handleSelect = async (result: AnimeSearchResult) => {
    setSelectedResult(result);
    setShowResults(false);

    const next: AnimeExtraData = { ...value };

    // Field tambahan
    if (result.year) next.release_year = result.year;
    if (result.studios) next.studio = result.studios;
    if (result.mal_url) next.mal_url = result.mal_url;
    if (result.anilist_url) next.anilist_url = result.anilist_url;
    if (result.episodes) next.episodes = result.episodes;
    if (result.mal_id) next.mal_id = result.mal_id;
    if (result.anilist_id) next.anilist_id = result.anilist_id;

    // Genres
    if (result.genres && result.genres.length > 0) {
      next.genres_from_search = result.genres.join(', ');
      onGenresChange?.(result.genres);
    }

    onChange(next);

    // ── Auto-fill field UTAMA form ──────────────────────────────────────────

    // 1. Judul — gunakan judul English jika ada
    const bestTitle = result.title_english || result.title;
    if (bestTitle) onTitleChange?.(bestTitle);

    // 2. Cover URL
    if (!hasCoverOverride && result.cover_url) onCoverUrlChange?.(result.cover_url);

    // 3. Total episode
    if (result.episodes && result.episodes > 0) onEpisodesChange?.(result.episodes);

    // 4. Status
    const mappedStatus = mapStatus(result.status);
    if (mappedStatus) onStatusChange?.(mappedStatus);

    // 5. Rating (score dari MAL/AniList, skala 0-10)
    if (result.score && result.score > 0) {
      const rating = Math.round(result.score * 10) / 10; // 1 desimal
      onRatingChange?.(Math.min(10, rating));
    }

    // 6. Season number — coba dari judul
    const titleForSeason = bestTitle;
    const seasonNum = extractSeasonFromTitle(titleForSeason);
    if (seasonNum && seasonNum > 0) {
      onSeasonChange?.(seasonNum);
    }

    // 7. Cour/Part — coba dari judul
    const courStr = extractCourFromTitle(titleForSeason);
    if (courStr) onCourChange?.(courStr);

    // 8. Parent title untuk pengelompokkan
    // Hanya set jika season > 1 (ada season sebelumnya)
    if (seasonNum && seasonNum > 1) {
      const baseTitle = extractBaseTitle(titleForSeason);
      if (baseTitle && baseTitle !== titleForSeason) {
        onParentTitleChange?.(baseTitle);
      }
    }

    // 9. Sinopsis — terjemahkan ke Bahasa Indonesia
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
        // Fallback: gunakan sinopsis original
        onChange({ ...next, synopsis_id: synopsisSource });
        onSynopsisChange?.(synopsisSource);
      } finally {
        setIsTranslating(false);
      }
    }
  };

  const clearSelected = () => {
    setSelectedResult(null);
    setSearchQuery('');
    clearResults();
    onChange({
      ...value,
      release_year: null,
      studio: '',
      mal_url: '',
      anilist_url: '',
      episodes: null,
      genres_from_search: '',
      synopsis_id: '',
      mal_id: null,
      anilist_id: null,
    });
    onGenresChange?.([]);
    onSynopsisChange?.('');
  };

  const hasData = !!(
    value.release_year ||
    value.studio ||
    value.mal_url ||
    value.anilist_url ||
    value.episodes ||
    value.genres_from_search ||
    value.synopsis_id
  );

  const ic =
    'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* ── Toggle header ── */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-info" />
          <span className="text-sm font-medium text-foreground">
            Cari Otomatis dari MAL & AniList
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            Auto-fill semua field
          </span>
          {hasData && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
              Terisi
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-border overflow-hidden">
          {/* Info banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info/5 border border-info/20 overflow-hidden">
            <Database className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <div className="space-y-1 min-w-0 overflow-hidden">
              <p className="text-xs font-semibold text-info break-words">
                Auto-fill Semua Field dari MAL & AniList
              </p>
              <p className="text-[11px] text-muted-foreground leading-relaxed break-words">
                Pilih hasil untuk <strong>otomatis mengisi</strong>: Judul, Cover, Genre, Episode,
                Status, Rating, Season, Pengelompokkan, Sinopsis (terjemahan Bahasa Indonesia),
                Studio, Tahun, dan URL referensi.
              </p>
              {!hasCoverOverride && (
                <p className="text-[11px] text-warning/80 leading-relaxed">
                  💡 Cover dari MAL/AniList akan digunakan karena belum ada upload manual.
                </p>
              )}
              {hasCoverOverride && (
                <p className="text-[11px] text-success/80 leading-relaxed">
                  ✓ Cover manual sudah di-upload — cover dari MAL/AniList tidak akan menimpa.
                </p>
              )}
              <div className="flex items-center gap-2 pt-0.5">
                <SourceBadge label="MyAnimeList" ok={jikanOk} />
                <SourceBadge label="AniList" ok={anilistOk} />
              </div>
            </div>
          </div>

          {/* ── Search box ── */}
          <div ref={searchContainerRef} className="relative min-w-0">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Cari di Database Eksternal
            </label>

            {selectedResult ? (
              /* ── Selected state — FIX: overflow-hidden + min-w-0 mencegah horizontal scroll ── */
              <div className="flex items-start gap-2 p-3 rounded-xl border border-success/30 bg-success/5 overflow-hidden">
                {selectedResult.cover_url && (
                  <img
                    src={selectedResult.cover_url}
                    alt={selectedResult.title}
                    className="w-9 h-[52px] object-cover rounded-lg shrink-0 border border-border/50"
                  />
                )}
                <div className="flex-1 min-w-0 overflow-hidden">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">
                    {selectedResult.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-0.5">
                    {selectedResult.year && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {selectedResult.year}
                      </span>
                    )}
                    {selectedResult.studios && (
                      <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                        · {selectedResult.studios}
                      </span>
                    )}
                    {selectedResult.episodes && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        · {selectedResult.episodes} ep
                      </span>
                    )}
                    {selectedResult.score && (
                      <span className="text-[10px] text-warning font-medium shrink-0">
                        ★ {selectedResult.score.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-success font-medium mt-1 leading-tight">
                    ✓ Semua field sudah diisi otomatis
                  </p>
                  {/* IDs for manual lookup */}
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {selectedResult.mal_id && (
                      <a
                        href={`https://myanimelist.net/anime/${selectedResult.mal_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-semibold hover:bg-blue-500/25 transition-colors whitespace-nowrap"
                        title="Buka di MyAnimeList"
                        onClick={(e) => e.stopPropagation()}
                      >
                        MAL#{selectedResult.mal_id} ↗
                      </a>
                    )}
                    {selectedResult.anilist_id && (
                      <a
                        href={`https://anilist.co/anime/${selectedResult.anilist_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-semibold hover:bg-violet-500/25 transition-colors whitespace-nowrap"
                        title="Buka di AniList"
                        onClick={(e) => e.stopPropagation()}
                      >
                        AL#{selectedResult.anilist_id} ↗
                      </a>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelected}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5"
                  title="Hapus pilihan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Search input */
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
                )}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => {
                    if (results.length > 0) setShowResults(true);
                  }}
                  placeholder="Ketik judul anime untuk mengisi semua field otomatis..."
                  className={`pl-10 pr-10 ${ic}`}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      clearResults();
                      setShowResults(false);
                    }}
                    className="absolute right-9 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
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
                    Mencari di MAL & AniList...
                  </div>
                )}

                {!isSearching && error && (
                  <div className="flex items-start gap-2 px-4 py-4 text-xs text-muted-foreground">
                    <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {!isSearching && results.length > 0 && (
                  <>
                    <div className="px-3 py-2 border-b border-border/50 bg-muted/20">
                      <p className="text-[10px] text-muted-foreground font-medium">
                        {results.length} hasil — klik untuk auto-fill{' '}
                        <strong>semua field</strong> termasuk season, rating & sinopsis
                      </p>
                    </div>
                    <div className="divide-y divide-border/40">
                      {results.map((r, i) => (
                        <ResultCard
                          key={`${r.mal_id}-${r.anilist_id}-${i}`}
                          result={r}
                          onSelect={handleSelect}
                        />
                      ))}
                    </div>
                  </>
                )}

                {!isSearching &&
                  !error &&
                  results.length === 0 &&
                  searchQuery.length >= 3 && (
                    <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                      Tidak ada hasil untuk &quot;{searchQuery}&quot;
                    </div>
                  )}

                {searchQuery.length > 0 && searchQuery.length < 3 && (
                  <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                    Ketik minimal 3 karakter untuk mencari
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Info ID untuk penelusuran manual ── */}
          {(value.mal_id || value.anilist_id) && (
            <div className="rounded-xl bg-muted/40 border border-border p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <HashIcon className="w-3 h-3" /> ID Database (untuk penelusuran manual)
              </p>
              <div className="flex flex-wrap gap-2">
                {value.mal_id && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <a
                      href={`https://myanimelist.net/anime/${value.mal_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-500 hover:bg-blue-500/20 transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      MAL ID: {value.mal_id}
                    </a>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline truncate">
                      myanimelist.net/anime/{value.mal_id}
                    </span>
                  </div>
                )}
                {value.anilist_id && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <a
                      href={`https://anilist.co/anime/${value.anilist_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-500 hover:bg-violet-500/20 transition-colors whitespace-nowrap"
                    >
                      <ExternalLink className="w-3 h-3" />
                      AniList ID: {value.anilist_id}
                    </a>
                    <span className="text-[10px] text-muted-foreground hidden sm:inline truncate">
                      anilist.co/anime/{value.anilist_id}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Gunakan ID di atas untuk menelusuri atau memverifikasi data secara manual di website MAL/AniList.
              </p>
            </div>
          )}

          {/* ── Manual fields ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tahun Rilis */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5" /> Tahun Rilis
              </label>
              <input
                type="number"
                value={value.release_year || ''}
                onChange={(e) =>
                  onChange({
                    ...value,
                    release_year: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder={`cth: ${new Date().getFullYear()}`}
                className={ic}
                min={1960}
                max={new Date().getFullYear() + 2}
              />
            </div>

            {/* Studio */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Studio
              </label>
              <input
                type="text"
                value={value.studio || ''}
                onChange={(e) => onChange({ ...value, studio: e.target.value })}
                placeholder="cth: MAPPA, Ufotable"
                className={ic}
                maxLength={100}
              />
            </div>

            {/* Episodes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" /> Total Episode
              </label>
              <input
                type="number"
                value={value.episodes || ''}
                onChange={(e) => {
                  const eps = e.target.value ? Number(e.target.value) : null;
                  onChange({ ...value, episodes: eps });
                  if (eps && eps > 0) onEpisodesChange?.(eps);
                }}
                placeholder="cth: 12, 24"
                className={ic}
                min={1}
              />
            </div>
          </div>

          {/* Genres dari pencarian */}
          {value.genres_from_search && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-info" /> Genre (terisi otomatis)
              </label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-xl bg-muted/30 border border-border/50">
                {value.genres_from_search
                  .split(', ')
                  .filter(Boolean)
                  .map((g) => (
                    <span
                      key={g}
                      className="text-[11px] px-2 py-1 rounded-lg bg-card border border-border text-foreground font-medium"
                    >
                      {g}
                    </span>
                  ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Genre di atas sudah diterapkan ke selector genre utama.
              </p>
            </div>
          )}

          {/* Sinopsis Bahasa Indonesia */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-success" />
              <span className="text-success">Sinopsis</span>
              <span className="text-muted-foreground">(Bahasa Indonesia)</span>
              {isTranslating && (
                <span className="inline-flex items-center gap-1 text-[10px] text-info font-medium ml-1">
                  <Languages className="w-3 h-3 animate-pulse" /> Menerjemahkan via Groq AI...
                </span>
              )}
              {translationError && (
                <span className="text-[10px] text-warning ml-1">
                  Terjemahan gagal — sinopsis asli digunakan
                </span>
              )}
            </label>
            <div className="relative">
              <textarea
                value={value.synopsis_id || ''}
                onChange={(e) => {
                  onChange({ ...value, synopsis_id: e.target.value });
                  onSynopsisChange?.(e.target.value);
                }}
                placeholder="Sinopsis akan diisi otomatis dalam Bahasa Indonesia (diterjemahkan via Groq AI)..."
                rows={4}
                className={`${ic} resize-none pr-10`}
                maxLength={2000}
              />
              {selectedResult?.synopsis && (
                <button
                  type="button"
                  onClick={() =>
                    doTranslate(selectedResult.synopsis_en || selectedResult.synopsis || '')
                  }
                  disabled={isTranslating}
                  title="Terjemahkan ulang via Groq AI"
                  className="absolute top-2 right-2 p-1.5 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
            {value.synopsis_id && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {value.synopsis_id.length}/2000 karakter · Bisa diedit manual
              </p>
            )}
          </div>

          {/* MAL URL */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-blue-500">MyAnimeList</span> URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={value.mal_url || ''}
                onChange={(e) => onChange({ ...value, mal_url: e.target.value })}
                placeholder="https://myanimelist.net/anime/..."
                className={`${ic} pr-10`}
              />
              {value.mal_url && (
                <a
                  href={value.mal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* AniList URL */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-violet-500" />
              <span className="text-violet-500">AniList</span> URL
            </label>
            <div className="relative">
              <input
                type="url"
                value={value.anilist_url || ''}
                onChange={(e) => onChange({ ...value, anilist_url: e.target.value })}
                placeholder="https://anilist.co/anime/..."
                className={`${ic} pr-10`}
              />
              {value.anilist_url && (
                <a
                  href={value.anilist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-400 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Preview summary */}
          {(value.mal_url ||
            value.anilist_url ||
            value.release_year ||
            value.studio ||
            value.episodes ||
            value.genres_from_search) && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                Ringkasan Data Terisi
              </p>
              <div className="flex flex-wrap gap-2">
                {value.release_year && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-medium">
                    <CalendarClock className="w-3 h-3 text-muted-foreground" />
                    {value.release_year}
                  </span>
                )}
                {value.studio && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-medium max-w-[180px] truncate">
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{value.studio}</span>
                  </span>
                )}
                {value.episodes && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border text-xs font-medium">
                    <Hash className="w-3 h-3 text-muted-foreground" />
                    {value.episodes} ep
                  </span>
                )}
                {value.mal_url && (
                  <a
                    href={value.mal_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-500 hover:bg-blue-500/20 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> MAL
                  </a>
                )}
                {value.anilist_url && (
                  <a
                    href={value.anilist_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20 text-xs font-semibold text-violet-500 hover:bg-violet-500/20 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" /> AniList
                  </a>
                )}
                {value.synopsis_id && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 border border-success/20 text-xs font-semibold text-success">
                    <FileText className="w-3 h-3" /> Sinopsis ID ✓
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}