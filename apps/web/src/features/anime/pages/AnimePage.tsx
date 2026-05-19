/**
 * Anime.tsx — LIVORIA
 *
 * PERUBAHAN:
 * - Status utama (on-going/completed/planned) = STATUS RILIS, tidak berubah oleh aksi tonton
 * - watch_status terpisah: 'none' | 'want_to_watch' | 'watching' | 'watched'
 * - Tombol tonton (Mau Nonton / Sedang Nonton / Selesai Nonton) hanya mengubah watch_status
 * - Tab "Watchlist" berdasarkan watch_status, bukan status utama
 * - Auto-fill dari MAL/AniList tetap mengisi status rilis dengan benar
 * - [BARU] Episode Quick-Action di WatchlistCard: tombol +/- episode, edit manual inline
 * - [BARU] Pagination: pilihan 30, 50, 100, 500, 1000, Semua — berlaku di Koleksi & Watchlist
 */

import { useEffect, useRef, useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import { dur } from '@/lib/motion';
import { isMobile } from '@/lib/motion';
import {
  Plus, ImageIcon, Layers, Star,
  ExternalLink, Copy, Eye, Edit2,
  Trash2, Clock,
  Bookmark, Heart, ChevronLeft, ChevronRight,
  CalendarClock, Building2, Film, BookmarkPlus, CheckCircle, PlayCircle,
  Bookmark as BookmarkIcon, Minus,
} from 'lucide-react';
import { openExternalUrl } from '@/lib/external';
import type { AnimeItem } from '@/lib/types';
import { ANIME_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import GenreSelect from '@/components/shared/GenreSelect';
import { useBackGesture } from '@/hooks/useBackGesture';
import type { AnimeExtraData } from '@/components/shared/AnimeExtraFields';
const AnimeExtraFields = lazy(() => import('@/components/shared/AnimeExtraFields'));
const AlternativeTitlesPanel = lazy(() => import('@/components/shared/AlternativeTitlesPanel'));
import Breadcrumb from '@/components/Breadcrumb';
const CoverLightbox = lazy(() => import('@/components/shared/CoverLightbox'));
const DuplicateConfirmationModal = lazy(() => import('@/components/shared/DuplicateConfirmationModal'));
import { useTitleLanguage } from '@/hooks/useTitleLanguage';
import { AnimeGridSkeleton } from '@/components/PageSkeleton';
import LoadingState from '@/shared/components/LoadingState';
import { useScrollToListStart } from '@/shared/hooks/useScrollToListStart';
import { useAnimeFilters } from '@/features/anime/hooks/useAnimeFilters';
import { useAnimeList, ANIME_QUERY_KEY } from '@/features/anime/hooks/useAnimeList';
import { useAnimeMutations } from '@/features/anime/hooks/useAnimeMutations';
import { useAnimePagination } from '@/features/anime/hooks/useAnimePagination';
import { useAnimeWatchlist } from '@/features/anime/hooks/useAnimeWatchlist';
import { getAnimeWatchStatus } from '@/features/anime/domain/watch-status';
import { AnimeBulkImportDialog } from '@/features/anime/components/AnimeBulkImportDialog';
import { AnimeDeleteDialog } from '@/features/anime/components/AnimeDeleteDialog';
import { AnimeDetailDialog } from '@/features/anime/components/AnimeDetailDialog';
import { AnimeFilterBar } from '@/features/anime/components/AnimeFilterBar';
import { AnimeFormDialog } from '@/features/anime/components/AnimeFormDialog';
import { AnimeGrid } from '@/features/anime/components/AnimeGrid';
import { AnimeHeader } from '@/features/anime/components/AnimeHeader';
import { AnimeList } from '@/features/anime/components/AnimeList';
import { AnimeToolbar } from '@/features/anime/components/AnimeToolbar';
import { AnimeWatchlist } from '@/features/anime/components/AnimeWatchlist';
import {
  DAY_LABELS,
  EpisodeInlineEditor,
  GENRE_PALETTE,
  STATUS_CONFIG,
  WATCH_STATUS_CONFIG,
  WatchStatusButton,
  WatchedCountdown,
  emptyExtra,
  emptyForm,
  extractAltTitles,
  extractExtra,
  formatDuration,
  formatDurationLong,
  getWatchStatus,
} from '@/features/anime/components/AnimeCard';

// ─── Types ─────────────────────────────────────────────────────────────────────
type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';
type ViewMode = 'grid' | 'list';
type PageTab = 'semua' | 'watchlist';

// ─── Helpers ─────────────────────────────────────────────────────────────────
interface StackDetailModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  items: AnimeItem[];
  initialIndex: number;
  onEdit: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
  onUpdateWatchStatus: (item: AnimeItem, newStatus: WatchStatus) => void;
  onCoverClick?: (url: string, title: string) => void;
}

function StackDetailModal({ open, onOpenChange, items, initialIndex, onEdit, onDelete, onUpdateWatchStatus, onCoverClick }: StackDetailModalProps) {
  const [idx, setIdx] = useState(initialIndex);
  useEffect(() => { setIdx(initialIndex); }, [open, initialIndex]);
  const item = items[idx];
  if (!item) return null;

  const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.planned;
  const ws = getWatchStatus(item);
  const wsCfg = WATCH_STATUS_CONFIG[ws];
  const isMovie = item.is_movie;
  const extra = extractExtra(item);
  const genres = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
  const schedules = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
  const hasKnownEps = item.episodes > 0;
  const watched = item.episodes_watched || 0;
  const progress = hasKnownEps ? Math.min(100, (watched / item.episodes) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-base sm:text-lg leading-tight flex items-center gap-2 flex-wrap">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            {item.title}
            {isMovie && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20"><Film className="w-2.5 h-2.5" />MOVIE</span>}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {cfg.label}
            {isMovie ? ' · Movie' : (item.season > 1 ? ` · Season ${item.season}` : '')}
            {item.cour ? ` · ${item.cour}` : ''}
            {extra.studio ? ` · ${extra.studio}` : ''}
            {extra.release_year ? ` · ${extra.release_year}` : ''}
          </DialogDescription>
        </DialogHeader>

        {/* Season navigator */}
        {items.length > 1 && (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/40 border border-border">
            <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"><ChevronLeft className="w-4 h-4" /></button>
            <div className="flex-1 flex items-center justify-center gap-1.5 flex-wrap">
              {items.map((it, i) => (
                <button key={it.id} onClick={() => setIdx(i)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${i === idx ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}>
                  {it.is_movie ? '🎬' : `S${it.season || 1}`}{it.cour ? ` ${it.cour}` : ''}
                </button>
              ))}
            </div>
            <button onClick={() => setIdx(i => Math.min(items.length - 1, i + 1))} disabled={idx === items.length - 1} className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-30 transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}

        <div className="space-y-3 mt-1">
          {item.cover_url && (
            <div
              className="w-full max-w-[180px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => onCoverClick?.(item.cover_url, item.title)}
            >
              <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Watch status */}
          <div className="rounded-xl border border-border p-3">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Tonton Saya</p>
            <div className="flex items-center gap-2 flex-wrap">
              <WatchStatusButton item={item} onUpdate={onUpdateWatchStatus} />
              <p className="text-[10px] text-muted-foreground">Terpisah dari status rilis</p>
            </div>
          </div>

          {/* Status rilis + Rating */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-xl border p-3 text-center ${cfg.bg}`}>
              <span className={`w-2 h-2 rounded-full mx-auto block mb-1 ${cfg.dot} ${item.status === 'on-going' ? 'animate-pulse' : ''}`} />
              <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Status Rilis</p>
            </div>
            {item.rating > 0 ? (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
                <p className="text-sm font-bold">{item.rating}/10</p>
                <p className="text-[9px] text-muted-foreground">Rating</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 p-3 text-center">
                {isMovie ? (
                  <>
                    <Film className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400">
                      {item.duration_minutes ? formatDuration(item.duration_minutes) : 'Film'}
                    </p>
                    <p className="text-[9px] text-muted-foreground">Durasi</p>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                    <p className="text-sm font-bold">{hasKnownEps ? `${watched}/${item.episodes}` : watched > 0 ? `${watched} ep` : '—'}</p>
                    <p className="text-[9px] text-muted-foreground">Episode</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Episode progress bar (serial only) */}
          {!isMovie && hasKnownEps && (
            <div className="rounded-xl border border-border bg-muted/20 p-3">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{watched} / {item.episodes} episode ditonton</span>
                <span className="font-mono font-semibold">{Math.round(progress)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${progress}%`, background: progress === 100 ? 'hsl(var(--success))' : (GENRE_PALETTE[genres[0]] || 'hsl(var(--primary))') }} />
              </div>
            </div>
          )}

          {/* Info dari MAL/AniList */}
          {(extra.studio || extra.release_year || extra.mal_url || extra.anilist_url || extra.mal_id || extra.anilist_id) && (
            <div className="rounded-xl border border-border p-3 space-y-2.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Info Anime</p>
              <div className="grid grid-cols-2 gap-2">
                {extra.release_year && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <CalendarClock className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div><p className="text-[9px] text-muted-foreground">Tahun Rilis</p><p className="text-xs font-semibold">{extra.release_year}</p></div>
                  </div>
                )}
                {extra.studio && (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div className="min-w-0"><p className="text-[9px] text-muted-foreground">Studio</p><p className="text-xs font-semibold truncate">{extra.studio}</p></div>
                  </div>
                )}
                {isMovie && item.duration_minutes ? (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Clock className="w-3 h-3 text-violet-500 shrink-0" />
                    <div><p className="text-[9px] text-muted-foreground">Durasi</p><p className="text-xs font-semibold text-violet-600 dark:text-violet-400">{formatDurationLong(item.duration_minutes)}</p></div>
                  </div>
                ) : !isMovie && item.episodes > 0 ? (
                  <div className="flex items-center gap-1.5 p-2 rounded-lg bg-muted/50">
                    <Eye className="w-3 h-3 text-muted-foreground shrink-0" />
                    <div><p className="text-[9px] text-muted-foreground">Episode</p><p className="text-xs font-semibold">{watched}/{item.episodes}</p></div>
                  </div>
                ) : null}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {extra.mal_url && (
                  <a href={extra.mal_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-colors"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-2.5 h-2.5" />MAL{extra.mal_id ? ` #${extra.mal_id}` : ''}
                  </a>
                )}
                {extra.anilist_url && (
                  <a href={extra.anilist_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-[10px] font-bold hover:bg-violet-500/20 transition-colors"
                    onClick={e => e.stopPropagation()}>
                    <ExternalLink className="w-2.5 h-2.5" />AniList{extra.anilist_id ? ` #${extra.anilist_id}` : ''}
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Genre */}
          {genres.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
              <div className="flex flex-wrap gap-1.5">
                {genres.map(g => (
                  <span key={g} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold"
                    style={{ background: (GENRE_PALETTE[g] || '#64748b') + '22', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Jadwal tayang */}
          {schedules.length > 0 && item.status === 'on-going' && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jadwal Tayang</p>
              <div className="flex flex-wrap gap-1.5">
                {schedules.map(d => (
                  <span key={d} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-[10px] font-semibold border border-info/20">
                    {DAY_LABELS[d] || d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Streaming link */}
          {item.streaming_url && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link Streaming</p>
              <div className="flex gap-2">
                <button onClick={() => openExternalUrl(item.streaming_url)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors min-h-[44px]">
                  <ExternalLink className="w-3.5 h-3.5" /> {isMovie ? 'Tonton Film' : 'Tonton'}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(item.streaming_url); toast({ title: 'Link disalin!' }); }}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]">
                  <Copy className="w-3.5 h-3.5" /> Salin
                </button>
              </div>
            </div>
          )}

          {item.synopsis && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sinopsis</p>
              <p className="text-sm text-foreground leading-relaxed">{item.synopsis}</p>
            </div>
          )}
          {item.notes && (
            <div className="rounded-xl border border-border p-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Catatan Pribadi</p>
              <p className="text-sm text-foreground leading-relaxed">{item.notes}</p>
            </div>
          )}

          {/* Nama Alternatif */}
          <AlternativeTitlesPanel
            storedTitle={item.title}
            altTitles={extractAltTitles(item)}
            malId={extractExtra(item).mal_id}
            anilistId={extractExtra(item).anilist_id}
            mediaType="anime"
            itemId={item.id}
            tableName="anime"
            onFetched={() => {/* invalidate dari parent via prop jika diperlukan */}}
          />

          <div className="flex gap-2 pt-2 border-t border-border">
            <button onClick={() => { onOpenChange(false); setTimeout(() => onEdit(item), 200); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]">
              <Edit2 className="w-4 h-4" />Edit
            </button>
            <button onClick={() => { onOpenChange(false); setTimeout(() => onDelete(item), 200); }}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const Anime = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const collectionStartRef = useRef<HTMLDivElement>(null);
  const watchlistStartRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [pageTab, setPageTab] = useState<PageTab>('semua');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showGenreDD, setShowGenreDD] = useState(false);
  // Batch delete mode
  const [batchSelectMode, setBatchSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showSortDD, setShowSortDD] = useState(false);
  const genreTriggerRef = useRef<HTMLButtonElement>(null);
  const sortTriggerRef = useRef<HTMLButtonElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [stackDetailOpen, setStackDetailOpen] = useState(false);
  const [stackDetailItems, setStackDetailItems] = useState<AnimeItem[]>([]);
  const [stackDetailInitIdx, setStackDetailInitIdx] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<AnimeItem | null>(null);
  const [editItem, setEditItem] = useState<AnimeItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<AnimeItem | null>(null);
  const [deleteBatchItems, setDeleteBatchItems] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [formWatchStatus, setFormWatchStatus] = useState<WatchStatus>('none');
  const [extraData, setExtraData] = useState<AnimeExtraData>(emptyExtra);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [selectedSchedule, setSelectedSchedule] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [showParentDD, setShowParentDD] = useState(false);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateConflicts, setDuplicateConflicts] = useState<AnimeItem[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<any>(null);
  const [isTranslatingSync, setIsTranslatingSync] = useState(false);
  const [translationErrorSync, setTranslationErrorSync] = useState<string | null>(null);

  // ── Pagination state ───────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);

  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  const scrollTargets = useMemo(() => ({
    collection: collectionStartRef,
    watchlist: watchlistStartRef,
  }), []);
  const scrollToListStart = useScrollToListStart(scrollTargets);

  const [coverLightbox, setCoverLightbox] = useState<{ url: string; title: string } | null>(null);

  const { currentLang, setLang: setTitleLang } = useTitleLanguage('anime');

  useBackGesture(modalOpen, () => setModalOpen(false), 'anime-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'anime-delete');
  useBackGesture(stackDetailOpen, () => setStackDetailOpen(false), 'anime-stack-detail');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'anime-detail');

  // useWatchedAutoRemove dipasang di App.tsx (GlobalEffects) — tidak perlu di sini lagi

  const { data: animeList = [], isLoading } = useAnimeList();
  const {
    pageSize,
    setPageSize,
    watchlistPageSize,
    setWatchlistPageSize,
    currentPage,
    watchlistCurrentPage,
    setCurrentPage,
    setWatchlistCurrentPage,
    paginate,
    getTotalPages,
  } = useAnimePagination();
  const {
    filter,
    setFilter,
    search,
    setSearch,
    genreFilter,
    setGenreFilter,
    watchStatusFilter,
    setWatchStatusFilter,
    showFavoriteOnly,
    setShowFavoriteOnly,
    showBookmarkOnly,
    setShowBookmarkOnly,
    showHentaiOnly,
    setShowHentaiOnly,
    movieFilter,
    setMovieFilter,
    sortMode,
    setSortMode,
    sortReverse,
    setSortReverse,
    usedGenres,
    stackCounts,
    groupMap,
    filtered,
    activeFilterCount,
  } = useAnimeFilters(animeList, currentLang);
  const {
    watchlistFilter,
    setWatchlistFilter,
    watchlistItems,
    watchlistFiltered,
    stats,
  } = useAnimeWatchlist(animeList);
  const {
    createMut,
    updateMut,
    deleteMut,
    batchDeleteMut,
    toggleFavoriteMut,
    toggleBookmarkMut,
    updateWatchStatusMut,
    updateEpisodeMut,
    findDuplicates,
  } = useAnimeMutations({
    coverFile,
    setUploading,
    onSaved: () => {
      setModalOpen(false);
      setCoverFile(null);
      setCoverPreview('');
    },
    onDeleted: () => {
      setDeleteOpen(false);
    },
    onBatchDeleted: () => {
      setSelectedIds(new Set());
      setBatchSelectMode(false);
      setDeleteOpen(false);
      setDeleteBatchItems([]);
    },
  });

  // GSAP entrance animation — desktop only (mobile uses lightweight CSS animations)
  // Re-trigger saat data atau halaman berubah agar card baru ikut beranimasi.
  useEffect(() => {
    if (isMobile() || !containerRef.current || isLoading) return;
    const ctx = gsap.context(() => {
      const header = containerRef.current?.querySelector('.anime-page-header');
      const pills = containerRef.current?.querySelectorAll('.anime-stat-pill');
      const cards = containerRef.current?.querySelectorAll('.anime-card');

      const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });

      if (header) {
        tl.fromTo(header,
          { opacity: 0, y: 24, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, clearProps: 'all' }
        );
      }
      if (pills && pills.length > 0) {
        tl.fromTo(pills,
          { opacity: 0, y: 14, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.07, ease: 'back.out(1.4)', clearProps: 'all' },
          '-=0.35'
        );
      }
      if (cards && cards.length > 0) {
        tl.fromTo(cards,
          { opacity: 0, y: 20, rotateX: 4, scale: 0.96 },
          { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 0.5, stagger: 0.04, ease: 'back.out(1.2)', clearProps: 'all' },
          '-=0.25'
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, [isLoading, animeList.length, currentPage, pageSize]);

  // Reset page ke 1 saat filter/search/sort berubah (skip initial mount)
  const filterMountRef = useRef(true);
  useEffect(() => {
    if (filterMountRef.current) { filterMountRef.current = false; return; }
    if (currentPage !== 1) setCurrentPage(1, true);
  }, [currentPage, filter, search, genreFilter, sortMode, movieFilter, watchStatusFilter, showFavoriteOnly, showBookmarkOnly, showHentaiOnly, setCurrentPage]);

  const watchlistMountRef = useRef(true);
  useEffect(() => {
    if (watchlistMountRef.current) { watchlistMountRef.current = false; return; }
    if (watchlistCurrentPage !== 1) setWatchlistCurrentPage(1);
  }, [setWatchlistCurrentPage, watchlistCurrentPage, watchlistFilter]);

  const handleDeleteBatch = (ids: string[]) => {
    setDeleteBatchItems(ids);
    setDeleteItem(null);
    setDeleteOpen(true);
  };

  const toggleGroupSelection = useCallback((anime: AnimeItem) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const group = groupMap[anime.id] || [anime];
      const isSelected = next.has(anime.id);
      group.forEach(it => isSelected ? next.delete(it.id) : next.add(it.id));
      return next;
    });
  }, [groupMap]);

  const handleUpdateWatchStatus = useCallback((item: AnimeItem, newStatus: WatchStatus) => {
    updateWatchStatusMut.mutate({ item, newStatus });
  }, [updateWatchStatusMut]);

  const handleUpdateEpisode = useCallback((item: AnimeItem, watched: number, total?: number) => {
    updateEpisodeMut.mutate({
      id: item.id,
      episodes_watched: watched,
      ...(total !== undefined ? { episodes: total } : {}),
    });
  }, [updateEpisodeMut]);

  // ── Derived data ───────────────────────────────────────────────────────────
  // ── Pagination derived ─────────────────────────────────────────────────────
  const totalPages = useMemo(() => {
    return getTotalPages(filtered.length, pageSize);
  }, [filtered.length, getTotalPages, pageSize]);

  const paginatedFiltered = useMemo(() => {
    return paginate(filtered, currentPage, pageSize);
  }, [currentPage, filtered, pageSize, paginate]);

  const watchlistTotalPages = useMemo(() => {
    return getTotalPages(watchlistFiltered.length, watchlistPageSize);
  }, [getTotalPages, watchlistFiltered.length, watchlistPageSize]);

  const paginatedWatchlist = useMemo(() => {
    return paginate(watchlistFiltered, watchlistCurrentPage, watchlistPageSize);
  }, [paginate, watchlistCurrentPage, watchlistFiltered, watchlistPageSize]);

  // Clamp page bila total pages berkurang (skip saat loading agar URL tidak di-reset)
  useEffect(() => {
    if (!isLoading && totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages, true);
  }, [totalPages, currentPage, isLoading, setCurrentPage]);

  useEffect(() => {
    if (watchlistCurrentPage > watchlistTotalPages) setWatchlistCurrentPage(watchlistTotalPages);
  }, [setWatchlistCurrentPage, watchlistTotalPages, watchlistCurrentPage]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openAdd = useCallback(() => {
    setEditItem(null); setForm(emptyForm); setFormWatchStatus('none'); setExtraData(emptyExtra);
    setSelectedGenres([]); setSelectedSchedule([]);
    setCoverFile(null); setCoverPreview(''); setParentSearch(''); setModalOpen(true);
  }, []);

  useEffect(() => {
    const handleOpenAdd = () => openAdd();
    window.addEventListener('livoria-open-add-current-page', handleOpenAdd);
    return () => window.removeEventListener('livoria-open-add-current-page', handleOpenAdd);
  }, [openAdd]);

  useEffect(() => {
    window.dispatchEvent(new Event('livoria-sync-add-visibility'));
  }, [viewMode, pageTab, isLoading, filtered.length, watchlistFiltered.length]);

  const openEdit = (item: AnimeItem) => {
    setEditItem(item);
    setForm({
      title: item.title, status: item.status, genre: item.genre || '', rating: item.rating,
      episodes: item.episodes, episodes_watched: item.episodes_watched || 0,
      cover_url: item.cover_url || '', synopsis: item.synopsis || '', notes: item.notes || '',
      season: item.season || 1, cour: item.cour || '', streaming_url: item.streaming_url || '',
      schedule: item.schedule || '', parent_title: item.parent_title || '',
      is_movie: item.is_movie || false,
      duration_minutes: item.duration_minutes ?? null,
      is_hentai: item.is_hentai || false,
    });
    setFormWatchStatus(getWatchStatus(item));
    setExtraData(extractExtra(item));
    setSelectedGenres(item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : []);
    setSelectedSchedule(item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : []);
    setCoverPreview(item.cover_url || ''); setCoverFile(null);
    setParentSearch(item.parent_title || ''); setModalOpen(true);
  };

  const openDetail = (item: AnimeItem) => { setDetailItem(item); setDetailOpen(true); };

  const openStackDetail = (representativeId: string, clickedItem?: AnimeItem) => {
    const items = groupMap[representativeId];
    if (!items) return;
    const initIdx = clickedItem ? items.findIndex(it => it.id === clickedItem.id) : items.length - 1;
    setStackDetailItems(items);
    setStackDetailInitIdx(Math.max(0, initIdx));
    setStackDetailOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      genre: selectedGenres.join(', '),
      schedule: (form.status === 'on-going' && !form.is_movie) ? selectedSchedule.join(',') : '',
      season: form.is_movie ? 0 : (form.season || 1),
      release_year: extraData.release_year ?? null,
      studio: extraData.studio || null,
      mal_url: extraData.mal_url || null,
      anilist_url: extraData.anilist_url || null,
      mal_id: extraData.mal_id ?? null,
      anilist_id: extraData.anilist_id ?? null,
      is_movie: form.is_movie,
      is_hentai: form.is_hentai,
      duration_minutes: form.is_movie ? (form.duration_minutes || null) : null,
      watch_status: formWatchStatus,
      alternative_titles: extraData.alternative_titles ?? null,
    };

    if (editItem) {
      updateMut.mutate({ id: editItem.id, ...data });
    } else {
      // Cek duplikasi sebelum membuat data baru
      try {
        const duplicates = await findDuplicates(data.title, data.mal_id, data.anilist_id);
        if (duplicates.length > 0) {
          setDuplicateConflicts(duplicates);
          setPendingSubmitData(data);
          setDuplicateModalOpen(true);
          return;
        }
      } catch (err) {
        console.error('Gagal cek duplikasi:', err);
      }
      createMut.mutate(data);
    }
  };

  const handleConfirmDuplicate = () => {
    if (pendingSubmitData) {
      createMut.mutate(pendingSubmitData);
      setDuplicateModalOpen(false);
      setPendingSubmitData(null);
    }
  };

  const existingGroupKeys = useMemo(() => {
    const keys = new Set<string>();
    animeList.filter(a => !a.is_movie).forEach(a => keys.add((a.parent_title || a.title).trim()));
    if (editItem) keys.delete(editItem.title.trim());
    return Array.from(keys).sort();
  }, [animeList, editItem]);

  const filteredParentTitles = useMemo(() => {
    if (!parentSearch.trim()) return existingGroupKeys;
    return existingGroupKeys.filter(t => t.toLowerCase().includes(parentSearch.toLowerCase()));
  }, [existingGroupKeys, parentSearch]);

  const ic = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";

  // ── Circle progress for avg rating ─────────────────────────────────────────
  const ratingCircleRef = useRef<SVGCircleElement>(null);
  const progressCircleRef = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!progressCircleRef.current) return;
    const avgNum = parseFloat(String(stats.avgRating));
    if (isNaN(avgNum)) return;
    const pct = (avgNum / 10) * 100;
    const circumference = 2 * Math.PI * 38;
    const offset = circumference - (pct / 100) * circumference;
    gsap.fromTo(progressCircleRef.current,
      { strokeDashoffset: circumference },
      { strokeDashoffset: offset, duration: dur(1.2), ease: 'power3.out', delay: dur(0.4) }
    );
  }, [stats.avgRating]);

  return (
    <div ref={containerRef}>
      <Breadcrumb />

      {/* ── Header Card ── */}
      <AnimeHeader
        animeList={animeList}
        stats={stats}
        watchlistCount={watchlistItems.length}
        currentLang={currentLang}
        onLangChange={setTitleLang}
        onOpenBulkImport={() => setBulkImportOpen(true)}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ANIME_QUERY_KEY })}
        onAdd={openAdd}
      />

      <AnimeToolbar
        pageTab={pageTab}
        watchlistCount={watchlistItems.length}
        onPageTabChange={setPageTab}
      />

      {pageTab === 'watchlist' && (
        <AnimeWatchlist
          watchlistItems={watchlistItems}
          watchlistFiltered={watchlistFiltered}
          paginatedWatchlist={paginatedWatchlist}
          stats={stats}
          watchlistFilter={watchlistFilter}
          currentPage={watchlistCurrentPage}
          totalPages={watchlistTotalPages}
          pageSize={watchlistPageSize}
          titleLang={currentLang}
          onFilterChange={setWatchlistFilter}
          onPageChange={(p) => { setWatchlistCurrentPage(p); scrollToListStart('watchlist'); }}
          onPageSizeChange={(s) => { setWatchlistPageSize(s); setWatchlistCurrentPage(1); scrollToListStart('watchlist'); }}
          onPageTabChange={setPageTab}
          onUpdateWatchStatus={handleUpdateWatchStatus}
          onUpdateEpisode={handleUpdateEpisode}
          onEdit={openEdit}
          onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
          onView={openDetail}
          listStartRef={watchlistStartRef}
        />
      )}

      {/* ?? KOLEKSI TAB ?? */}
      {pageTab === 'semua' && (
        <>
          <AnimeFilterBar
            search={search}
            onSearchChange={setSearch}
            showFilters={showFilters}
            onShowFiltersChange={setShowFilters}
            activeFilterCount={activeFilterCount}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            filter={filter}
            onFilterChange={setFilter}
            movieFilter={movieFilter}
            onMovieFilterChange={setMovieFilter}
            watchStatusFilter={watchStatusFilter}
            onWatchStatusFilterChange={setWatchStatusFilter}
            showFavoriteOnly={showFavoriteOnly}
            onShowFavoriteOnlyChange={setShowFavoriteOnly}
            showBookmarkOnly={showBookmarkOnly}
            onShowBookmarkOnlyChange={setShowBookmarkOnly}
            showHentaiOnly={showHentaiOnly}
            onShowHentaiOnlyChange={setShowHentaiOnly}
            usedGenres={usedGenres}
            genreFilter={genreFilter}
            onGenreFilterChange={setGenreFilter}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            sortReverse={sortReverse}
            onSortReverseChange={setSortReverse}
            batchSelectMode={batchSelectMode}
            selectedCount={selectedIds.size}
            allVisibleSelected={selectedIds.size === paginatedFiltered.length}
            batchDeletePending={batchDeleteMut.isPending}
            onToggleBatchMode={() => { setBatchSelectMode(v => !v); setSelectedIds(new Set()); }}
            onToggleSelectAll={() => {
              if (selectedIds.size === paginatedFiltered.length) {
                setSelectedIds(new Set());
              } else {
                const allIds = new Set<string>();
                paginatedFiltered.forEach(a => {
                  const group = groupMap[a.id] || [a];
                  group.forEach(it => allIds.add(it.id));
                });
                setSelectedIds(allIds);
              }
            }}
            onDeleteSelected={() => handleDeleteBatch([...selectedIds])}
          />

          {/* Content */}          {/* Content */}
          <div ref={collectionStartRef} className="h-px -mt-1" aria-hidden="true" />
          {isLoading ? (
            <AnimeGridSkeleton count={pageSize === 'semua' ? 18 : Math.min(pageSize as number, 18)} />
          ) : viewMode === 'grid' ? (
            <AnimeGrid
              items={paginatedFiltered}
              groupMap={groupMap}
              stackCounts={stackCounts}
              batchSelectMode={batchSelectMode}
              selectedIds={selectedIds}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              titleLang={currentLang}
              gridRef={gridRef}
              onToggleGroupSelection={toggleGroupSelection}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={(item) => { setDeleteItem(item); setDeleteBatchItems([]); setDeleteOpen(true); }}
              onDeleteBatch={handleDeleteBatch}
              onView={openDetail}
              onViewStack={(anime) => openStackDetail(anime.id)}
              onToggleFavorite={(anime) => toggleFavoriteMut.mutate(anime)}
              onToggleBookmark={(anime) => toggleBookmarkMut.mutate(anime)}
              onUpdateWatchStatus={handleUpdateWatchStatus}
              onPageChange={(p) => { setCurrentPage(p); scrollToListStart('collection'); }}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); scrollToListStart('collection'); }}
            />
          ) : (
            <AnimeList
              items={paginatedFiltered}
              filteredCount={filtered.length}
              search={search}
              groupMap={groupMap}
              stackCounts={stackCounts}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              titleLang={currentLang}
              listRef={gridRef}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
              onView={openDetail}
              onViewStack={(anime) => openStackDetail(anime.id)}
              onToggleFavorite={(anime) => toggleFavoriteMut.mutate(anime)}
              onToggleBookmark={(anime) => toggleBookmarkMut.mutate(anime)}
              onUpdateWatchStatus={handleUpdateWatchStatus}
              onPageChange={(p) => { setCurrentPage(p); scrollToListStart('collection'); }}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); scrollToListStart('collection'); }}
            />
          )}
        </>
      )}

      {/* ?? Stack Detail Modal ?? */}
      <StackDetailModal open={stackDetailOpen} onOpenChange={(v) => { if (!coverLightbox) setStackDetailOpen(v); }}
        items={stackDetailItems} initialIndex={stackDetailInitIdx}
        onEdit={openEdit} onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
        onUpdateWatchStatus={handleUpdateWatchStatus}
        onCoverClick={(url, title) => setCoverLightbox({ url, title })} />

      {/* ── Detail Modal ── */}
      <AnimeDetailDialog open={detailOpen} onOpenChange={(v) => { if (!coverLightbox) setDetailOpen(v); }}>
          {detailItem && (() => {
            const item = detailItem;
            const freshItem = animeList.find(a => a.id === item.id) || item;
            const cfg = STATUS_CONFIG[freshItem.status] || STATUS_CONFIG.planned;
            const extra = extractExtra(freshItem);
            const genres = freshItem.genre ? freshItem.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
            const schedules = freshItem.schedule ? freshItem.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
            const progress = freshItem.episodes > 0
              ? Math.min(100, ((freshItem.episodes_watched || 0) / freshItem.episodes) * 100) : 0;
            const ws = getWatchStatus(freshItem);
            const wsCfg = WATCH_STATUS_CONFIG[ws];
            const WsIcon = wsCfg.icon;
            const hasKnownEps = freshItem.episodes > 0;
            const watched = freshItem.episodes_watched || 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-lg leading-tight flex items-center gap-2 flex-wrap">
                    {freshItem.title}
                    {freshItem.is_movie && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20"><Film className="w-2.5 h-2.5" />MOVIE</span>}
                    {freshItem.is_favorite && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-300/50"><Heart className="w-2.5 h-2.5 fill-amber-500" />Favorit</span>}
                    {freshItem.is_bookmarked && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold border border-sky-300/50"><Bookmark className="w-2.5 h-2.5 fill-sky-500" />Bookmark</span>}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    {cfg.label}
                    {freshItem.is_movie ? ' · Movie' : (freshItem.season > 0 ? ` · Season ${freshItem.season}` : '')}
                    {freshItem.cour ? ` · ${freshItem.cour}` : ''}
                    {freshItem.parent_title ? ` · ${freshItem.parent_title}` : ''}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  {/* Cover */}
                  {freshItem.cover_url && (
                    <div
                      className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-2xl overflow-hidden border border-border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setCoverLightbox({ url: freshItem.cover_url, title: freshItem.title })}
                    >
                      <img src={freshItem.cover_url} alt={freshItem.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Watch status + countdown */}
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status Tonton Saya</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <WatchStatusButton item={freshItem} onUpdate={handleUpdateWatchStatus} />
                      {ws === 'watched' && (freshItem as any).watched_at && (
                        <WatchedCountdown watchedAt={(freshItem as any).watched_at} />
                      )}
                    </div>
                  </div>

                  {/* Episode quick action */}
                  {!freshItem.is_movie && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Update Progress Episode</p>
                      <div className="flex items-center gap-2">
                        <button disabled={watched <= 0} onClick={() => handleUpdateEpisode(freshItem, Math.max(0, watched - 1))}
                          className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted hover:bg-accent disabled:opacity-30 transition-colors">
                          <Minus className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <div className="flex-1 flex justify-center">
                          <EpisodeInlineEditor watched={watched} total={freshItem.episodes || 0} onSave={(w, t) => handleUpdateEpisode(freshItem, w, t)} />
                        </div>
                        <button disabled={freshItem.episodes > 0 && watched >= freshItem.episodes} onClick={() => handleUpdateEpisode(freshItem, watched + 1)}
                          className="flex items-center justify-center gap-1 px-3 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-30 transition-colors text-xs font-bold">
                          <Plus className="w-3.5 h-3.5" />Ep
                        </button>
                      </div>
                      {hasKnownEps && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                            <span>{watched} / {freshItem.episodes} episode</span>
                            <span className="font-mono font-semibold">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: progress === 100 ? 'hsl(var(--success))' : 'hsl(var(--primary))' }} />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info utama: Status rilis + Rating + Season/Cour + Tahun + Studio */}
                  <div className="rounded-xl border border-border p-3 space-y-2.5">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Informasi</p>
                    <div className="grid grid-cols-2 gap-2">
                      {/* Status rilis */}
                      <div className={`rounded-lg border p-2.5 text-center ${cfg.bg}`}>
                        <span className={`w-2 h-2 rounded-full mx-auto block mb-1 ${cfg.dot} ${freshItem.status === 'on-going' ? 'animate-pulse' : ''}`} />
                        <p className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Status Rilis</p>
                      </div>
                      {/* Rating */}
                      {freshItem.rating > 0 ? (
                        <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500 mx-auto mb-1" />
                          <p className="text-sm font-bold">{freshItem.rating}/10</p>
                          <p className="text-[9px] text-muted-foreground">Rating</p>
                        </div>
                      ) : freshItem.is_movie && freshItem.duration_minutes ? (
                        <div className="rounded-lg border border-violet-300/40 bg-violet-50/50 dark:bg-violet-950/20 p-2.5 text-center">
                          <Clock className="w-4 h-4 text-violet-500 mx-auto mb-1" />
                          <p className="text-xs font-bold text-violet-600 dark:text-violet-400">{formatDurationLong(freshItem.duration_minutes)}</p>
                          <p className="text-[9px] text-muted-foreground">Durasi</p>
                        </div>
                      ) : !freshItem.is_movie ? (
                        <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center">
                          <Eye className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                          <p className="text-sm font-bold">{hasKnownEps ? `${watched}/${freshItem.episodes}` : watched > 0 ? `${watched} ep` : '—'}</p>
                          <p className="text-[9px] text-muted-foreground">Episode</p>
                        </div>
                      ) : null}
                    </div>
                    {/* Studio + Tahun + Season */}
                    <div className="space-y-1.5">
                      {(extra.studio || extra.release_year) && (
                        <div className="flex items-center gap-4 flex-wrap">
                          {extra.studio && (
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-foreground font-medium">{extra.studio}</span>
                            </div>
                          )}
                          {extra.release_year && (
                            <div className="flex items-center gap-1.5">
                              <CalendarClock className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-foreground font-medium">{extra.release_year}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {!freshItem.is_movie && (freshItem.season > 0 || freshItem.cour || freshItem.parent_title) && (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Layers className="w-3 h-3 text-muted-foreground shrink-0" />
                          <span className="text-xs text-foreground font-medium">
                            {freshItem.parent_title && <span className="text-muted-foreground">{freshItem.parent_title} · </span>}
                            {freshItem.season > 0 && `Season ${freshItem.season}`}
                            {freshItem.cour && ` · ${freshItem.cour}`}
                          </span>
                        </div>
                      )}
                      {freshItem.is_movie && freshItem.duration_minutes && freshItem.rating > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-violet-500 shrink-0" />
                          <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">{formatDurationLong(freshItem.duration_minutes)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Favorit & Bookmark */}
                  {(freshItem.is_favorite || freshItem.is_bookmarked) && (
                    <div className="flex gap-2 flex-wrap">
                      {freshItem.is_favorite && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300/50 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                          <Heart className="w-3.5 h-3.5 fill-amber-500" />Masuk Favorit
                        </div>
                      )}
                      {freshItem.is_bookmarked && (
                        <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-300/50 text-sky-600 dark:text-sky-400 text-xs font-semibold">
                          <Bookmark className="w-3.5 h-3.5 fill-sky-500" />Di-bookmark
                        </div>
                      )}
                    </div>
                  )}

                  {/* Genre */}
                  {genres.length > 0 && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Genre</p>
                      <div className="flex flex-wrap gap-1.5">
                        {genres.map(g => (
                          <span key={g} className="text-[10px] px-2 py-0.5 rounded-lg font-semibold"
                            style={{ background: (GENRE_PALETTE[g] || '#64748b') + '22', color: GENRE_PALETTE[g] || 'hsl(var(--muted-foreground))' }}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Jadwal tayang */}
                  {schedules.length > 0 && freshItem.status === 'on-going' && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Jadwal Tayang</p>
                      <div className="flex flex-wrap gap-1.5">
                        {schedules.map(d => (
                          <span key={d} className="px-2 py-1 rounded-lg bg-info/10 text-info text-[10px] font-semibold border border-info/20">
                            {DAY_LABELS[d] || d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MAL / AniList links */}
                  {(extra.mal_url || extra.anilist_url || extra.mal_id || extra.anilist_id) && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sumber Eksternal</p>
                      <div className="flex gap-2 flex-wrap">
                        {extra.mal_url && (
                          <a href={extra.mal_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-[10px] font-bold hover:bg-blue-500/20 transition-colors min-h-[36px]"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-2.5 h-2.5" />MAL{extra.mal_id ? ` #${extra.mal_id}` : ''}
                          </a>
                        )}
                        {extra.anilist_url && (
                          <a href={extra.anilist_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-violet-500/10 text-violet-500 text-[10px] font-bold hover:bg-violet-500/20 transition-colors min-h-[36px]"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-2.5 h-2.5" />AniList{extra.anilist_id ? ` #${extra.anilist_id}` : ''}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Streaming link */}
                  {freshItem.streaming_url && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Link Streaming</p>
                      <div className="flex gap-2">
                        <button onClick={() => openExternalUrl(freshItem.streaming_url)} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors min-h-[44px]"><ExternalLink className="w-3.5 h-3.5" />{freshItem.is_movie ? 'Tonton Film' : 'Buka Link'}</button>
                        <button onClick={() => copyLink()} className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]"><Copy className="w-3.5 h-3.5" />Salin</button>
                      </div>
                    </div>
                  )}

                  {/* Sinopsis */}
                  {freshItem.synopsis && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sinopsis</p>
                      <p className="text-sm text-foreground leading-relaxed">{freshItem.synopsis}</p>
                    </div>
                  )}

                  {/* Catatan pribadi */}
                  {freshItem.notes && (
                    <div className="rounded-xl border border-border p-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Catatan Pribadi</p>
                      <p className="text-sm text-foreground leading-relaxed">{freshItem.notes}</p>
                    </div>
                  )}

                  {/* Nama Alternatif */}
                  <Suspense fallback={<LoadingState label="Memuat judul alternatif..." />}>
                    <AlternativeTitlesPanel
                      storedTitle={freshItem.title}
                      altTitles={extractAltTitles(freshItem)}
                      malId={extractExtra(freshItem).mal_id}
                      anilistId={extractExtra(freshItem).anilist_id}
                      mediaType="anime"
                      itemId={freshItem.id}
                      tableName="anime"
                      onFetched={() => {
                        queryClient.invalidateQueries({ queryKey: ANIME_QUERY_KEY });
                      }}
                    />
                  </Suspense>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => openEdit(freshItem), 200); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-all min-h-[44px]"><Edit2 className="w-4 h-4" />Edit</button>
                    <button onClick={() => { setDetailOpen(false); setTimeout(() => { setDeleteItem(freshItem); setDeleteOpen(true); }, 200); }} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-all border border-destructive/20 min-h-[44px]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </>
            );
          })()}
      </AnimeDetailDialog>

      {/* ── Add/Edit Modal ── */}
      <AnimeFormDialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogHeader>
            <DialogTitle className="font-display text-lg flex items-center gap-2">
              {editItem ? '✏️ Edit Anime' : '✨ Tambah Anime / Movie'}
              {form.is_movie && <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-[10px] font-bold border border-violet-500/20"><Film className="w-2.5 h-2.5" />MOVIE</span>}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {editItem ? 'Perbarui informasi.' : 'Gunakan pencarian MAL/AniList untuk auto-fill. Status rilis dan status tonton diisi terpisah.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <Suspense fallback={<LoadingState label="Memuat form tambahan..." />}>
              <AnimeExtraFields
                value={extraData}
                onChange={setExtraData}
                titleHint={form.title}
                hasCoverOverride={!!coverFile}
                onTitleChange={v => setForm(prev => ({ ...prev, title: v }))}
                onCoverUrlChange={url => {
                  if (!coverFile) { setCoverPreview(url); setForm(prev => ({ ...prev, cover_url: url })); }
                }}
                onGenresChange={setSelectedGenres}
                onEpisodesChange={eps => setForm(prev => ({ ...prev, episodes: eps }))}
                onSynopsisChange={synopsis => setForm(prev => ({ ...prev, synopsis }))}
                onStatusChange={status => setForm(prev => ({ ...prev, status }))}
                onSeasonChange={season => setForm(prev => ({ ...prev, season }))}
                onCourChange={cour => setForm(prev => ({ ...prev, cour }))}
                onParentTitleChange={parentTitle => { setForm(prev => ({ ...prev, parent_title: parentTitle })); setParentSearch(parentTitle); }}
                onRatingChange={rating => setForm(prev => ({ ...prev, rating }))}
                onIsMovieChange={isMovie => {
                  setForm(prev => ({
                    ...prev,
                    is_movie: isMovie,
                    season: isMovie ? 0 : (prev.season || 1),
                    duration_minutes: isMovie ? prev.duration_minutes : null,
                  }));
                }}
                onDurationMinutesChange={mins => setForm(prev => ({ ...prev, duration_minutes: mins }))}
                onTranslatingChange={setIsTranslatingSync}
                onTranslationErrorChange={setTranslationErrorSync}
              />
            </Suspense>

            {/* Cover */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Cover Image
                {coverPreview && !coverFile && <span className="ml-2 text-[10px] text-info font-normal">(dari MAL/AniList — upload untuk mengganti)</span>}
              </label>
              <div className="flex items-center gap-4">
                <div onClick={() => coverInputRef.current?.click()}
                  className="w-20 h-[120px] rounded-xl overflow-hidden border-2 border-dashed border-border bg-muted flex items-center justify-center cursor-pointer hover:border-primary/50 transition-all shrink-0 relative group">
                  {coverPreview
                    ? <><img src={coverPreview} alt="Cover" className="w-full h-full object-cover" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-[9px] font-bold">Ganti</span></div></>
                    : <div className="flex flex-col items-center gap-1.5 text-center px-2"><ImageIcon className="w-6 h-6 text-muted-foreground/40" /><span className="text-[9px] text-muted-foreground">Upload</span></div>
                  }
                </div>
                <div className="space-y-1.5">
                  <button type="button" onClick={() => coverInputRef.current?.click()} className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors">Upload Cover Manual</button>
                  <p className="text-[10px] text-muted-foreground">{coverFile ? '✓ File dipilih' : coverPreview ? '📥 Cover dari MAL/AniList' : 'Atau gunakan auto-fill di atas'}</p>
                  {coverPreview && <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(''); setForm(prev => ({ ...prev, cover_url: '' })); }} className="text-[11px] text-destructive hover:text-destructive/80">Hapus cover</button>}
                </div>
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setCoverFile(f); setCoverPreview(URL.createObjectURL(f)); } }} />
            </div>

            {/* Judul */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Judul {form.is_movie ? 'Film' : 'Anime'} *
              </label>
              <input type="text" value={form.title} onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                placeholder={form.is_movie ? 'cth: Dragon Ball Super: Broly' : 'cth: Solo Leveling Season 2'}
                className={ic} required />
            </div>

            {/* Movie toggle */}
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${form.is_movie ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-950/20' : 'border-border bg-muted/20'}`}>
              <div className="flex items-center gap-2">
                <Film className={`w-4 h-4 ${form.is_movie ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-sm font-semibold ${form.is_movie ? 'text-violet-700 dark:text-violet-300' : 'text-foreground'}`}>
                    {form.is_movie ? '🎬 Ini adalah Movie/Film' : 'Tandai sebagai Movie'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {form.is_movie ? 'Matikan untuk beralih ke mode serial' : 'Aktifkan jika ini film bukan serial'}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, is_movie: !prev.is_movie, season: !prev.is_movie ? 0 : (prev.season || 1), duration_minutes: !prev.is_movie ? prev.duration_minutes : null }))}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${form.is_movie ? 'bg-violet-500' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_movie ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* HAnime / 18+ toggle */}
            <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${form.is_hentai ? 'border-pink-300 dark:border-pink-700 bg-pink-50/50 dark:bg-pink-950/20' : 'border-border bg-muted/20'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${form.is_hentai ? 'text-pink-600 dark:text-pink-400' : 'text-muted-foreground'}`}>🔞</span>
                <div>
                  <p className={`text-sm font-semibold ${form.is_hentai ? 'text-pink-700 dark:text-pink-300' : 'text-foreground'}`}>
                    {form.is_hentai ? 'HAnime (18+)' : 'Tandai sebagai HAnime'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Konten dewasa / hentai
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setForm(prev => ({ ...prev, is_hentai: !prev.is_hentai }))}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none flex-shrink-0 ${form.is_hentai ? 'bg-pink-500' : 'bg-muted-foreground/30'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.is_hentai ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {/* Season/Cour */}
            {!form.is_movie && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Season</label>
                  <input type="number" value={form.season || ''} onChange={e => setForm(prev => ({ ...prev, season: Number(e.target.value) }))} placeholder="1" className={ic} min={1} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Cour / Part</label>
                  <input type="text" value={form.cour} onChange={e => setForm(prev => ({ ...prev, cour: e.target.value }))} placeholder="Part 2" className={ic} />
                </div>
              </div>
            )}

            {/* Group */}
            {!form.is_movie && (
              <div className="relative">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Kelompokkan Dengan</label>
                <input type="text" value={parentSearch}
                  onChange={e => { setParentSearch(e.target.value); setForm(prev => ({ ...prev, parent_title: e.target.value })); setShowParentDD(true); }}
                  onFocus={() => setShowParentDD(true)}
                  placeholder="Ketik atau pilih judul induk..." className={ic} />
                {showParentDD && filteredParentTitles.length > 0 && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowParentDD(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-50 py-1 max-h-40 overflow-y-auto">
                      <button type="button" onClick={() => { setForm(prev => ({ ...prev, parent_title: '' })); setParentSearch(''); setShowParentDD(false); }} className="w-full text-left px-3.5 py-2.5 text-sm text-muted-foreground hover:bg-muted">— Tidak dikelompokkan —</button>
                      {filteredParentTitles.map(t => (
                        <button key={t} type="button" onClick={() => { setForm(prev => ({ ...prev, parent_title: t })); setParentSearch(t); setShowParentDD(false); }}
                          className={`w-full text-left px-3.5 py-2.5 text-sm truncate hover:bg-muted ${form.parent_title === t ? 'text-primary font-semibold' : 'text-foreground'}`}>{t}</button>
                      ))}
                    </div>
                  </>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Tumpuk beberapa season menjadi satu card.</p>
              </div>
            )}

            {/* Status Rilis */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                  Status Rilis <span className="text-[9px] font-normal normal-case text-muted-foreground">(dari auto-fill / manual)</span>
                </label>
                <select value={form.status} onChange={e => setForm(prev => ({ ...prev, status: e.target.value as any }))} className={ic}>
                  <option value="on-going">{form.is_movie ? 'Sedang Tayang' : 'On-Going'}</option>
                  <option value="completed">{form.is_movie ? 'Sudah Rilis' : 'Selesai Rilis'}</option>
                  <option value="planned">{form.is_movie ? 'Belum Rilis' : 'Akan Rilis'}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Rating (0-10)</label>
                <input type="number" value={form.rating || ''} onChange={e => setForm(prev => ({ ...prev, rating: Number(e.target.value) }))} placeholder="9.5" className={ic} min={0} max={10} step={0.1} />
              </div>
            </div>

            {/* Status Tonton */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Status Tonton Saya <span className="text-[9px] font-normal normal-case text-muted-foreground">(tidak mempengaruhi status rilis)</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {([
                  { value: 'none' as WatchStatus, label: 'Belum Ditandai', icon: BookmarkIcon, cls: 'border-border text-muted-foreground' },
                  { value: 'want_to_watch' as WatchStatus, label: 'Mau Nonton', icon: BookmarkPlus, cls: 'border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20' },
                  { value: 'watching' as WatchStatus, label: 'Sedang Nonton', icon: PlayCircle, cls: 'border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20' },
                  { value: 'watched' as WatchStatus, label: 'Sudah Ditonton', icon: CheckCircle, cls: 'border-sky-300 dark:border-sky-700 text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/20' },
                ]).map(opt => {
                  const OptIcon = opt.icon;
                  const isActive = formWatchStatus === opt.value;
                  return (
                    <button key={opt.value} type="button" onClick={() => setFormWatchStatus(opt.value)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 text-center transition-all ${isActive ? `${opt.cls} shadow-sm ring-2 ring-primary/20` : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground bg-muted/20'}`}>
                      <OptIcon className={`w-4 h-4 ${isActive ? '' : 'text-muted-foreground'}`} />
                      <span className="text-[9px] font-semibold leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Duration / Episodes */}
            {form.is_movie ? (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5 block">
                  <Clock className="w-3.5 h-3.5 text-violet-500" />Durasi Film (menit)
                </label>
                <input type="number" value={form.duration_minutes || ''} onChange={e => setForm(prev => ({ ...prev, duration_minutes: e.target.value ? Number(e.target.value) : null }))}
                  placeholder="cth: 90, 120" className={ic} min={1} max={600} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Total Episode</label>
                  <input type="number" value={form.episodes || ''} onChange={e => setForm(prev => ({ ...prev, episodes: Number(e.target.value) }))} placeholder="24" className={ic} min={0} />
                </div>
                {(form.status === 'on-going' || form.status === 'completed') && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Ditonton</label>
                    <input type="number" value={form.episodes_watched || ''} onChange={e => setForm(prev => ({ ...prev, episodes_watched: Number(e.target.value) }))} placeholder="12" className={ic} min={0} />
                  </div>
                )}
              </div>
            )}

            {/* Genre */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Genre</label>
              <GenreSelect genres={ANIME_GENRES} selected={selectedGenres} onChange={setSelectedGenres} />
            </div>

            {/* Schedule */}
            {form.status === 'on-going' && !form.is_movie && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Jadwal Tayang</label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map(day => (
                    <button key={day.value} type="button"
                      onClick={() => setSelectedSchedule(prev => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value])}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedSchedule.includes(day.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-muted text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'}`}>
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Streaming URL */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                {form.is_movie ? 'Link Nonton Film' : 'Link Streaming'}
              </label>
              <input type="url" value={form.streaming_url} onChange={e => setForm(prev => ({ ...prev, streaming_url: e.target.value }))} placeholder="https://..." className={ic} />
            </div>

            {/* Synopsis */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Sinopsis</label>
              <textarea value={form.synopsis} onChange={e => setForm(prev => ({ ...prev, synopsis: e.target.value }))} placeholder="Ringkasan cerita..." rows={3} className={`${ic} resize-none`} />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Catatan</label>
              <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} className={`${ic} resize-none`} />
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-muted text-muted-foreground hover:bg-accent transition-all">Batal</button>
              <button type="submit" disabled={createMut.isPending || updateMut.isPending || uploading || isTranslatingSync}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all ${form.is_movie ? 'bg-violet-500 text-white' : 'bg-primary text-primary-foreground'}`}>
                {uploading ? 'Mengupload...' : isTranslatingSync ? 'Menerjemahkan...' : createMut.isPending || updateMut.isPending ? 'Menyimpan...' : editItem ? 'Simpan' : (form.is_movie ? '🎬 Tambah Film' : 'Tambah')}
              </button>
            </div>
          </form>
      </AnimeFormDialog>

      {/* ── Delete Modal ── */}
      <AnimeDeleteDialog
        open={deleteOpen}
        deleteItem={deleteItem}
        batchIds={deleteBatchItems}
        deleting={deleteMut.isPending}
        batchDeleting={batchDeleteMut.isPending}
        onOpenChange={(v) => { setDeleteOpen(v); if (!v) { setDeleteItem(null); setDeleteBatchItems([]); } }}
        onConfirm={() => {
          if (deleteBatchItems.length > 0) batchDeleteMut.mutate(deleteBatchItems);
          else if (deleteItem) deleteMut.mutate(deleteItem.id);
        }}
      />

      <Suspense fallback={<LoadingState label="Memuat pratinjau cover..." />}>
        <CoverLightbox
          open={!!coverLightbox}
          onClose={() => setCoverLightbox(null)}
          imageUrl={coverLightbox?.url || ''}
          title={coverLightbox?.title}
        />
      </Suspense>

      {/* ── Bulk Import Dialog ── */}
      <AnimeBulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: ANIME_QUERY_KEY })}
      />

      <Suspense fallback={<LoadingState label="Memuat pemeriksaan duplikat..." />}>
        <DuplicateConfirmationModal
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        onConfirm={handleConfirmDuplicate}
        onCancel={() => { setDuplicateModalOpen(false); setPendingSubmitData(null); }}
        newItem={pendingSubmitData || {}}
        existingItems={duplicateConflicts}
        mediaType="anime"
      />
      </Suspense>
    </div>
  );

  // helper in detail modal
  function copyLink() {
    if (detailItem?.streaming_url) {
      navigator.clipboard.writeText(detailItem.streaming_url);
      toast({ title: 'Link disalin!' });
    }
  }
};

export default Anime;
