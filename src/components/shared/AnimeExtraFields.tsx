/**
 * AnimeExtraFields.tsx
 *
 * Section collapsible "Informasi Tambahan Opsional" untuk form Anime & Donghua.
 *
 * Ketika user memilih anime dari hasil pencarian MAL/AniList, SEMUA field yang
 * tersedia akan di-auto-fill ke form utama:
 * - Judul (title)
 * - Cover (cover_url) — jika belum ada upload manual
 * - Genre
 * - Episode
 * - Status
 * - Sinopsis (diterjemahkan ke Bahasa Indonesia via Groq API)
 * - Studio, Tahun Rilis, MAL URL, AniList URL (field tambahan)
 */

import { useState, useRef, useEffect } from 'react';
import {
  ChevronDown, ChevronUp, Search, Loader2, ExternalLink,
  Database, AlertCircle, CheckCircle2, X, Sparkles,
  Building2, CalendarClock, Link2, Hash, Tag, FileText,
  Languages, RefreshCw
} from 'lucide-react';
import { useAnimeSearch, translateToIndonesian, type AnimeSearchResult } from '@/hooks/useAnimeSearch';

export interface AnimeExtraData {
  release_year?: number | null;
  studio?: string;
  mal_url?: string;
  anilist_url?: string;
  episodes?: number | null;
  genres_from_search?: string;
  synopsis_id?: string;
}

interface Props {
  value: AnimeExtraData;
  onChange: (data: AnimeExtraData) => void;
  /** Judul anime saat ini — dipakai untuk auto-trigger pencarian awal */
  titleHint?: string;
  /** Apakah sudah ada cover yang diupload manual */
  hasCoverOverride?: boolean;
  // ─── Callbacks untuk auto-fill field utama form ───────────────────────────
  /** Set judul anime */
  onTitleChange?: (title: string) => void;
  /** Set URL cover (dari MAL/AniList jika tidak ada upload manual) */
  onCoverUrlChange?: (url: string) => void;
  /** Set genre ke selectedGenres */
  onGenresChange?: (genres: string[]) => void;
  /** Set total episode */
  onEpisodesChange?: (eps: number) => void;
  /** Set sinopsis ke form.synopsis */
  onSynopsisChange?: (synopsis: string) => void;
  /** Set status anime */
  onStatusChange?: (status: 'on-going' | 'completed' | 'planned') => void;
}

// ─── Helper: map AniList/Jikan status → form status ──────────────────────────
function mapStatus(status?: string): 'on-going' | 'completed' | 'planned' | null {
  if (!status) return null;
  const s = status.toLowerCase();
  if (s.includes('airing') || s.includes('releasing') || s.includes('currently')) return 'on-going';
  if (s.includes('finished') || s.includes('completed') || s.includes('finished_airing')) return 'completed';
  if (s.includes('not_yet') || s.includes('upcoming') || s.includes('not yet')) return 'planned';
  return null;
}

// ─── Source icon badge ────────────────────────────────────────────────────────
function SourceBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
      ok ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground/50'
    }`}>
      {ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
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
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">· {result.studios}</span>
          )}
          {result.episodes && (
            <span className="text-[10px] text-muted-foreground">· {result.episodes} ep</span>
          )}
          {result.score && (
            <span className="text-[10px] text-warning font-medium">★ {result.score.toFixed(1)}</span>
          )}
        </div>
        {result.genres && result.genres.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {result.genres.slice(0, 3).map(g => (
              <span key={g} className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium">{g}</span>
            ))}
            {result.genres.length > 3 && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground">+{result.genres.length - 3}</span>
            )}
          </div>
        )}
        <div className="flex gap-1 mt-1">
          {result.mal_url && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-semibold">MAL</span>
          )}
          {result.anilist_url && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-semibold">AniList</span>
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
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedResult, setSelectedResult] = useState<AnimeSearchResult | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { results, isSearching, error, jikanOk, anilistOk, search, clearResults } = useAnimeSearch({
    debounceMs: 600,
    minChars: 3,
  });

  // Tutup dropdown saat klik di luar
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

  // Auto-populate search field dengan titleHint jika section di-expand
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

  // Terjemahkan sinopsis dan update ke semua tempat
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

    // Genres — simpan sebagai comma-separated
    if (result.genres && result.genres.length > 0) {
      next.genres_from_search = result.genres.join(', ');
      onGenresChange?.(result.genres);
    }

    onChange(next);

    // ── Auto-fill field UTAMA form ────────────────────────────────────────

    // 1. Judul — gunakan judul English jika ada
    const bestTitle = result.title_english || result.title;
    if (bestTitle) {
      onTitleChange?.(bestTitle);
    }

    // 2. Cover URL — hanya jika tidak ada upload manual
    if (!hasCoverOverride && result.cover_url) {
      onCoverUrlChange?.(result.cover_url);
    }

    // 3. Total episode
    if (result.episodes && result.episodes > 0) {
      onEpisodesChange?.(result.episodes);
    }

    // 4. Status
    const mappedStatus = mapStatus(result.status);
    if (mappedStatus) {
      onStatusChange?.(mappedStatus);
    }

    // 5. Sinopsis — terjemahkan ke Bahasa Indonesia
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
    });
    onGenresChange?.([]);
    onSynopsisChange?.('');
  };

  const hasData = !!(value.release_year || value.studio || value.mal_url || value.anilist_url || value.episodes || value.genres_from_search || value.synopsis_id);

  const ic = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";

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
          <span className="text-sm font-medium text-foreground">Cari Otomatis dari MAL & AniList</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
            Auto-fill semua field
          </span>
          {hasData && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-semibold">
              Terisi
            </span>
          )}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-border">

          {/* Info banner */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-info/5 border border-info/20">
            <Database className="w-4 h-4 text-info shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-info">Auto-fill Semua Field dari MAL & AniList</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Pilih hasil pencarian untuk <strong>otomatis mengisi</strong>: Judul, Cover, Genre, Episode, Status,
                Sinopsis (terjemahan Bahasa Indonesia via Groq AI), Studio, Tahun, dan URL referensi.
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
          <div ref={searchContainerRef} className="relative">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
              Cari di Database Eksternal
            </label>

            {selectedResult ? (
              /* Selected state */
              <div className="flex items-center gap-3 p-3 rounded-xl border border-success/30 bg-success/5">
                {selectedResult.cover_url && (
                  <img
                    src={selectedResult.cover_url}
                    alt={selectedResult.title}
                    className="w-10 h-14 object-cover rounded-lg shrink-0 border border-border/50"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{selectedResult.title}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedResult.year && (
                      <span className="text-[10px] text-muted-foreground">{selectedResult.year}</span>
                    )}
                    {selectedResult.studios && (
                      <span className="text-[10px] text-muted-foreground">· {selectedResult.studios}</span>
                    )}
                    {selectedResult.episodes && (
                      <span className="text-[10px] text-muted-foreground">· {selectedResult.episodes} ep</span>
                    )}
                  </div>
                  <p className="text-[10px] text-success font-medium mt-1">
                    ✓ Judul, Cover, Genre, Episode, Status & Sinopsis sudah diisi otomatis
                  </p>
                  <div className="flex gap-1 mt-1">
                    {selectedResult.mal_url && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 font-semibold">MAL</span>
                    )}
                    {selectedResult.anilist_url && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-500 font-semibold">AniList</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelected}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
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
                  onChange={e => handleSearchChange(e.target.value)}
                  onFocus={() => { if (results.length > 0) setShowResults(true); }}
                  placeholder="Ketik judul anime untuk mengisi semua field otomatis..."
                  className={`pl-10 pr-10 ${ic}`}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); clearResults(); setShowResults(false); }}
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
                        {results.length} hasil — klik untuk auto-fill <strong>semua field</strong> termasuk cover & sinopsis
                      </p>
                    </div>
                    <div className="divide-y divide-border/40">
                      {results.map((r, i) => (
                        <ResultCard key={`${r.mal_id}-${r.anilist_id}-${i}`} result={r} onSelect={handleSelect} />
                      ))}
                    </div>
                  </>
                )}

                {!isSearching && !error && results.length === 0 && searchQuery.length >= 3 && (
                  <div className="px-4 py-4 text-xs text-muted-foreground text-center">
                    Tidak ada hasil untuk "{searchQuery}"
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
                onChange={e => onChange({ ...value, release_year: e.target.value ? Number(e.target.value) : null })}
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
                onChange={e => onChange({ ...value, studio: e.target.value })}
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
                onChange={e => {
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
                {value.genres_from_search.split(', ').filter(Boolean).map(g => (
                  <span key={g} className="text-[11px] px-2 py-1 rounded-lg bg-card border border-border text-foreground font-medium">
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
                <span className="text-[10px] text-destructive ml-1">Terjemahan gagal</span>
              )}
            </label>
            <div className="relative">
              <textarea
                value={value.synopsis_id || ''}
                onChange={e => {
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
                  onClick={() => doTranslate(selectedResult.synopsis_en || selectedResult.synopsis || '')}
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
                onChange={e => onChange({ ...value, mal_url: e.target.value })}
                placeholder="https://myanimelist.net/anime/..."
                className={`${ic} pr-10`}
              />
              {value.mal_url && (
                <a
                  href={value.mal_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 hover:text-blue-400 transition-colors"
                  onClick={e => e.stopPropagation()}
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
                onChange={e => onChange({ ...value, anilist_url: e.target.value })}
                placeholder="https://anilist.co/anime/..."
                className={`${ic} pr-10`}
              />
              {value.anilist_url && (
                <a
                  href={value.anilist_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-violet-500 hover:text-violet-400 transition-colors"
                  onClick={e => e.stopPropagation()}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Preview summary */}
          {(value.mal_url || value.anilist_url || value.release_year || value.studio || value.episodes || value.genres_from_search) && (
            <div className="rounded-xl bg-muted/40 p-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Ringkasan Data Terisi</p>
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