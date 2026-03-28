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
 * - [BARU] Batch Delete: hapus massal anime yang dipilih
 * - [BARU] Filter: Urutkan berdasarkan episode terakhir ditonton (tracking penambahan episode)
 * - [BARU] Reverse Order: opsi untuk membalikkan urutan pengurutan
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  Plus, Search, Tv, ImageIcon, Layers, X, Star,
  SlidersHorizontal, ExternalLink, Copy, Eye, Edit2,
  Trash2, ChevronDown, Filter, Clock,
  Grid3X3, List, MoreVertical, Bookmark, Heart, ChevronLeft, ChevronRight,
  CalendarClock, Building2, Film, BookmarkPlus, CheckCircle, PlayCircle,
  BookOpen, Bookmark as BookmarkIcon, Minus, Check, Upload,
  CheckSquare, Square, ArrowUpDown, ArrowDownNarrowWide, ArrowUpNarrowWide
} from 'lucide-react';
import { animeService, uploadImage } from '@/lib/supabase-service';
import type { AnimeItem } from '@/lib/types';
import { ANIME_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import ImportExportButton from '@/components/ImportExportButton';
import GenreSelect from '@/components/shared/GenreSelect';
import { useBackGesture } from '@/hooks/useBackGesture';
import AnimeExtraFields, { type AnimeExtraData } from '@/components/shared/AnimeExtraFields';
import AlternativeTitlesPanel from '@/components/shared/AlternativeTitlesPanel';
import Breadcrumb from '@/components/Breadcrumb';
import { deserializeAlternativeTitles } from '@/hooks/useAlternativeTitles';
import { buildGroupMap } from '@/lib/titleGrouping';
import { filterItemsByQuery } from '@/lib/alternativeTitlesSearch';
import { GroupActionMenu } from '@/components/GroupActionMenu';
import { useWatchedAutoRemove } from '@/hooks/useWatchedAutoRemove';
import BulkImportDialog from '@/components/shared/BulkImportDialog';
import TitleLanguageSwitch from '@/components/shared/TitleLanguageSwitch';
import CoverLightbox from '@/components/shared/CoverLightbox';
import DuplicateConfirmationModal from '@/components/shared/DuplicateConfirmationModal';
import { useTitleLanguage, resolveTitle } from '@/hooks/useTitleLanguage';

// ─── Types ─────────────────────────────────────────────────────────────────────
type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';
type SortMode = 'terbaru' | 'rating' | 'judul_az' | 'episode' | 'jadwal_terdekat' | 'tahun_terbaru' | 'terbaru_tonton';
type FilterStatus = 'all' | 'on-going' | 'completed' | 'planned';
type ViewMode = 'grid' | 'list';
type PageTab = 'semua' | 'watchlist';
type PageSize = 30 | 50 | 100 | 500 | 1000 | 'semua';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} mnt`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}j ${m}m` : `${h}j`;
}

function formatDurationLong(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} jam ${m} menit` : `${h} jam`;
}

const emptyForm: {
  title: string; status: 'on-going' | 'completed' | 'planned'; genre: string; rating: number;
  episodes: number; episodes_watched: number; cover_url: string; synopsis: string; notes: string;
  season: number; cour: string; streaming_url: string; schedule: string; parent_title: string;
  is_movie: boolean; duration_minutes: number | null; is_hentai: boolean;
} = {
  title: '', status: 'planned', genre: '', rating: 0, episodes: 0,
  episodes_watched: 0, cover_url: '', synopsis: '', notes: '',
  season: 1, cour: '', streaming_url: '', schedule: '', parent_title: '',
  is_movie: false,
  duration_minutes: null,
  is_hentai: false,
};

const emptyExtra: AnimeExtraData = {
  release_year: null,
  studio: '',
  mal_url: '',
  anilist_url: '',
};

const DAY_LABELS: Record<string, string> = {
  senin: 'Sen', selasa: 'Sel', rabu: 'Rab', kamis: 'Kam',
  jumat: 'Jum', sabtu: 'Sab', minggu: 'Min',
};

const STATUS_CONFIG = {
  'on-going': {
    label: 'Tayang',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-400/15 dark:border-emerald-400/30',
    dot: 'bg-emerald-500',
  },
  'completed': {
    label: 'Selesai',
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 border-sky-200 dark:bg-sky-400/15 dark:border-sky-400/30',
    dot: 'bg-sky-500',
  },
  'planned': {
    label: 'Akan Rilis',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 border-amber-200 dark:bg-amber-400/15 dark:border-amber-400/30',
    dot: 'bg-amber-500',
  },
};

const WATCH_STATUS_CONFIG: Record<WatchStatus, { label: string; icon: any; color: string; bg: string }> = {
  none: {
    label: 'Belum Ditandai',
    icon: BookmarkIcon,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
  want_to_watch: {
    label: 'Mau Nonton',
    icon: BookmarkPlus,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-300/50 dark:border-amber-600/40',
  },
  watching: {
    label: 'Sedang Nonton',
    icon: PlayCircle,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300/50 dark:border-emerald-600/40',
  },
  watched: {
    label: 'Sudah Ditonton',
    icon: CheckCircle,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/30 border-sky-300/50 dark:border-sky-600/40',
  },
};

const GENRE_PALETTE: Record<string, string> = {
  'Action': '#ef4444', 'Adventure': '#22c55e', 'Comedy': '#f59e0b',
  'Drama': '#a855f7', 'Fantasy': '#3b82f6', 'Horror': '#dc2626',
  'Mystery': '#8b5cf6', 'Romance': '#ec4899', 'Sci-Fi': '#06b6d4',
  'Slice of Life': '#10b981', 'Isekai': '#14b8a6', 'Supernatural': '#7c3aed',
  'Martial Arts': '#f97316', 'Psychological': '#6366f1', 'School': '#0ea5e9',
  'Shounen': '#3b82f6', 'Mecha': '#64748b', 'Sports': '#f97316',
};

// ─── PAGE SIZE OPTIONS ────────────────────────────────────────────────────────
const PAGE_SIZE_OPTIONS: { value: PageSize; label: string }[] = [
  { value: 30,      label: '30' },
  { value: 50,      label: '50' },
  { value: 100,     label: '100' },
  { value: 500,     label: '500' },
  { value: 1000,    label: '1000' },
  { value: 'semua', label: 'Semua' },
];

// ─── Pagination Component ─────────────────────────────────────────────────────
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  pageSize: PageSize;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSize) => void;
}

function Pagination({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const startItem = pageSize === 'semua' ? 1 : (currentPage - 1) * (pageSize as number) + 1;
  const endItem   = pageSize === 'semua' ? totalItems : Math.min(currentPage * (pageSize as number), totalItems);

  // Generate page numbers to show
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-border/60">
      {/* Info + Page Size Selector — kiri */}
      <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {pageSize === 'semua'
            ? `Menampilkan semua ${totalItems} item`
            : `${startItem}–${endItem} dari ${totalItems} item`}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">Per halaman:</span>
          <div className="flex gap-0.5 p-0.5 rounded-xl bg-muted/70 border border-border">
            {PAGE_SIZE_OPTIONS.map(opt => (
              <button
                key={String(opt.value)}
                onClick={() => onPageSizeChange(opt.value)}
                className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all whitespace-nowrap ${
                  pageSize === opt.value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Page Navigator — kanan */}
      {pageSize !== 'semua' && totalPages > 1 && (
        <div className="flex items-center gap-1 flex-wrap justify-center">
          {/* First + Prev */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
            title="Halaman pertama"
          >
            «
          </button>
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Halaman sebelumnya"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Numbers */}
          {getPageNumbers().map((p, idx) => (
            <button
              key={idx}
              onClick={() => typeof p === 'number' && onPageChange(p)}
              disabled={p === '...'}
              className={`flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                currentPage === p
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : p === '...'
                    ? 'cursor-default text-muted-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {p}
            </button>
          ))}

          {/* Next + Last */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Halaman berikutnya"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
            title="Halaman terakhir"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getNearestDay(schedule: string): number {
  if (!schedule) return 99;
  const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  const todayIdx = new Date().getDay();
  const scheduleDays = schedule.split(',').map(s => s.trim().toLowerCase());
  
  let minDiff = 99;
  scheduleDays.forEach(day => {
    const dayIdx = days.indexOf(day);
    if (dayIdx === -1) return;
    let diff = dayIdx - todayIdx;
    if (diff < 0) diff += 7;
    if (diff < minDiff) minDiff = diff;
  });
  return minDiff;
}

function getWatchStatus(item: AnimeItem): WatchStatus {
  return (item as any).watch_status || 'none';
}

function extractExtra(item: AnimeItem): AnimeExtraData {
  return {
    release_year: (item as any).release_year ?? null,
    studio: (item as any).studio || '',
    mal_url: (item as any).mal_url || '',
    anilist_url: (item as any).anilist_url || '',
    mal_id: (item as any).mal_id ?? null,
    anilist_id: (item as any).anilist_id ?? null,
    alternative_titles: (item as any).alternative_titles ?? null,
  };
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const Anime = () => {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [pageTab, setPageTab] = useState<PageTab>('semua');
  const [watchlistFilter, setWatchlistFilter] = useState<'all' | WatchStatus>('all');
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [genreFilter, setGenreFilter] = useState('all');
  const [movieFilter, setMovieFilter] = useState<'all' | 'movie' | 'series'>('all');
  const [watchStatusFilter, setWatchStatusFilter] = useState<'all' | WatchStatus>('all');
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [showBookmarkOnly, setShowBookmarkOnly] = useState(false);
  const [showHentaiOnly, setShowHentaiOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('terbaru');
  const [sortReverse, setSortReverse] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showGenreDD, setShowGenreDD] = useState(false);
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

  // ── Batch Delete state ─────────────────────────────────────────────────────
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);

  // ── Pagination state ───────────────────────────────────────────────────────
  const [pageSize, setPageSize] = useState<PageSize>(30);
  const [currentPage, setCurrentPage] = useState(1);
  const [watchlistPageSize, setWatchlistPageSize] = useState<PageSize>(30);
  const [watchlistCurrentPage, setWatchlistCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [coverLightbox, setCoverLightbox] = useState<{ url: string; title: string } | null>(null);

  const { currentLang, setLang: setTitleLang } = useTitleLanguage('anime');

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filter !== 'all') c++;
    if (movieFilter !== 'all') c++;
    if (watchStatusFilter !== 'all') c++;
    if (showFavoriteOnly) c++;
    if (showBookmarkOnly) c++;
    if (showHentaiOnly) c++;
    if (genreFilter !== 'all') c++;
    return c;
  }, [filter, movieFilter, watchStatusFilter, showFavoriteOnly, showBookmarkOnly, showHentaiOnly, genreFilter]);

  useBackGesture(modalOpen, () => setModalOpen(false), 'anime-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'anime-delete');
  useBackGesture(stackDetailOpen, () => setStackDetailOpen(false), 'anime-stack-detail');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'anime-detail');

  useWatchedAutoRemove();

  const { data: animeList = [], isLoading } = useQuery({ queryKey: ['anime'], queryFn: animeService.getAll });

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.anime-page-header', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
      gsap.fromTo('.anime-stat-pill', { opacity: 0, scale: 0.85, y: 8 }, { opacity: 1, scale: 1, y: 0, stagger: 0.07, duration: 0.4, ease: 'back.out(1.7)', delay: 0.15 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // Reset page ke 1 saat filter/search/sort berubah
  useEffect(() => { setCurrentPage(1); }, [filter, search, genreFilter, sortMode, sortReverse, movieFilter, watchStatusFilter, showFavoriteOnly, showBookmarkOnly]);
  useEffect(() => { setWatchlistCurrentPage(1); }, [watchlistFilter]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMut = useMutation({
    mutationFn: async (row: Partial<AnimeItem>) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'anime'); setUploading(false); }
      return animeService.create({ ...row, cover_url: cover_url || row.cover_url || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime'] });
      setModalOpen(false); setCoverFile(null); setCoverPreview('');
      toast({ title: 'Berhasil ditambahkan ✨' });
    },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, ...row }: Partial<AnimeItem> & { id: string }) => {
      let cover_url = row.cover_url || '';
      if (coverFile) { setUploading(true); cover_url = await uploadImage('covers', coverFile, 'anime'); setUploading(false); }
      return animeService.update(id, { ...row, cover_url: cover_url || row.cover_url || '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime'] });
      setModalOpen(false); setCoverFile(null); setCoverPreview('');
      toast({ title: 'Berhasil diperbarui ✨' });
    },
    onError: (e: any) => { setUploading(false); toast({ title: 'Error', description: e.message, variant: 'destructive' }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => animeService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['anime'] }); setDeleteOpen(false); toast({ title: 'Dihapus' }); },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const deleteBatchMut = useMutation({
    mutationFn: (ids: string[]) => animeService.deleteBatch(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['anime'] });
      setBatchDeleteOpen(false);
      setSelectionMode(false);
      setSelectedIds([]);
      toast({ title: 'Berhasil dihapus massal ✨' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleFavoriteMut = useMutation({
    mutationFn: (item: AnimeItem) => animeService.update(item.id, { is_favorite: !item.is_favorite }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['anime'] }),
  });

  const toggleBookmarkMut = useMutation({
    mutationFn: (item: AnimeItem) => animeService.update(item.id, { is_bookmarked: !item.is_bookmarked }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['anime'] }),
  });

  const updateWatchStatusMut = useMutation({
    mutationFn: ({ item, newStatus }: { item: AnimeItem; newStatus: WatchStatus }) => {
      const payload: Record<string, any> = {
        watch_status: newStatus,
        watched_at: newStatus === 'watched' ? new Date().toISOString() : null,
      };
      return animeService.update(item.id, payload as any);
    },
    onSuccess: (_, { newStatus, item }) => {
      queryClient.invalidateQueries({ queryKey: ['anime'] });
      const statusLabels: Record<WatchStatus, string> = {
        none: 'Penanda dihapus',
        want_to_watch: 'Ditandai: Mau Nonton',
        watching: 'Ditandai: Sedang Nonton',
        watched: 'Ditandai: Sudah Ditonton — akan dihapus dari watchlist dalam 1 jam',
      };
      toast({ title: statusLabels[newStatus], description: item.title });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateEpisodeMut = useMutation({
    mutationFn: ({ id, episodes_watched, episodes }: { id: string; episodes_watched: number; episodes?: number }) =>
      animeService.update(id, {
        episodes_watched,
        updated_at: new Date().toISOString(), // Track for 'recently watched'
        ...(episodes !== undefined ? { episodes } : {}),
      } as any),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['anime'] });
      toast({
        title: 'Episode diperbarui',
        description: `Progress: Ep ${vars.episodes_watched}${vars.episodes ? `/${vars.episodes}` : ''}`,
      });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

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
  const usedGenres = useMemo(() => {
    const s = new Set<string>();
    animeList.forEach(a => a.genre?.split(',').map(g => g.trim()).filter(Boolean).forEach(g => s.add(g)));
    return Array.from(s).sort();
  }, [animeList]);

  const { displayList, stackCounts, groupMap } = useMemo(
    () => buildGroupMap(animeList),
    [animeList]
  );

  const watchlistItems = useMemo(
    () => animeList.filter(a => getWatchStatus(a) !== 'none'),
    [animeList]
  );

  const watchlistFiltered = useMemo(() => {
    if (watchlistFilter === 'all') return watchlistItems;
    return watchlistItems.filter(a => getWatchStatus(a) === watchlistFilter);
  }, [watchlistItems, watchlistFilter]);

  const filtered = useMemo(() => {
    // Pre-filter menggunakan alternative_titles untuk pencarian lebih akurat
    const searchFiltered = search.trim()
      ? filterItemsByQuery(displayList, search)
      : displayList;

    let r = searchFiltered.filter(a => {
      const mf = filter === 'all' || a.status === filter;
      const mg = genreFilter === 'all' || (a.genre || '').toLowerCase().includes(genreFilter.toLowerCase());
      const mm = movieFilter === 'all' || (movieFilter === 'movie' ? a.is_movie : !a.is_movie);
      const mw = watchStatusFilter === 'all' || getWatchStatus(a) === watchStatusFilter;
      const mfav = !showFavoriteOnly || !!a.is_favorite;
      const mbm  = !showBookmarkOnly || !!a.is_bookmarked;
      const mh   = !showHentaiOnly || !!a.is_hentai;
      return mf && mg && mm && mw && mfav && mbm && mh;
    });

    // Sorting
    if (sortMode === 'terbaru') r = [...r].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortMode === 'rating') r = [...r].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortMode === 'judul_az') r = [...r].sort((a, b) => a.title.localeCompare(b.title));
    if (sortMode === 'episode') r = [...r].sort((a, b) => (b.episodes || 0) - (a.episodes || 0));
    if (sortMode === 'jadwal_terdekat') r = [...r].sort((a, b) => getNearestDay(a.schedule || '') - getNearestDay(b.schedule || ''));
    if (sortMode === 'tahun_terbaru') r = [...r].sort((a, b) => ((b as any).release_year || 0) - ((a as any).release_year || 0));
    if (sortMode === 'terbaru_tonton') r = [...r].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

    // Reverse
    if (sortReverse) r.reverse();

    return r;
  }, [displayList, filter, search, genreFilter, sortMode, sortReverse, movieFilter, watchStatusFilter, showFavoriteOnly, showBookmarkOnly, showHentaiOnly]);

  // ── Pagination derived ─────────────────────────────────────────────────────
  const totalPages = useMemo(() => {
    if (pageSize === 'semua') return 1;
    return Math.max(1, Math.ceil(filtered.length / (pageSize as number)));
  }, [filtered.length, pageSize]);

  const paginatedFiltered = useMemo(() => {
    if (pageSize === 'semua') return filtered;
    const start = (currentPage - 1) * (pageSize as number);
    return filtered.slice(start, start + (pageSize as number));
  }, [filtered, pageSize, currentPage]);

  const watchlistTotalPages = useMemo(() => {
    if (watchlistPageSize === 'semua') return 1;
    return Math.max(1, Math.ceil(watchlistFiltered.length / (watchlistPageSize as number)));
  }, [watchlistFiltered.length, watchlistPageSize]);

  const paginatedWatchlist = useMemo(() => {
    if (watchlistPageSize === 'semua') return watchlistFiltered;
    const start = (watchlistCurrentPage - 1) * (watchlistPageSize as number);
    return watchlistFiltered.slice(start, start + (watchlistPageSize as number));
  }, [watchlistFiltered, watchlistPageSize, watchlistCurrentPage]);

  // Clamp page bila total pages berkurang
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    if (watchlistCurrentPage > watchlistTotalPages) setWatchlistCurrentPage(watchlistTotalPages);
  }, [watchlistTotalPages, watchlistCurrentPage]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditItem(null); setForm(emptyForm); setFormWatchStatus('none'); setExtraData(emptyExtra);
    setSelectedGenres([]); setSelectedSchedule([]);
    setCoverFile(null); setCoverPreview(''); setParentSearch(''); setModalOpen(true);
  };

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
        const duplicates = await animeService.findDuplicates(data.title, data.mal_id, data.anilist_id);
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

  const handleImport = async (items: any[]) => {
    for (const item of items) { const { id, user_id, created_at, ...rest } = item; await animeService.create(rest); }
    queryClient.invalidateQueries({ queryKey: ['anime'] });
    toast({ title: 'Import Berhasil', description: `${items.length} anime diimpor` });
  };

  const stats = useMemo(() => ({
    total: animeList.length,
    ongoing: animeList.filter(a => a.status === 'on-going').length,
    completed: animeList.filter(a => a.status === 'completed').length,
    planned: animeList.filter(a => a.status === 'planned').length,
    favorites: animeList.filter(a => a.is_favorite).length,
    movies: animeList.filter(a => a.is_movie).length,
    wantToWatch: animeList.filter(a => getWatchStatus(a) === 'want_to_watch').length,
    watching: animeList.filter(a => getWatchStatus(a) === 'watching').length,
    watched: animeList.filter(a => getWatchStatus(a) === 'watched').length,
    avgRating: animeList.filter(a => a.rating > 0).length > 0
      ? (animeList.filter(a => a.rating > 0).reduce((s, a) => s + a.rating, 0) / animeList.filter(a => a.rating > 0).length).toFixed(1)
      : '—',
  }), [animeList]);

  // ── Batch Delete Handlers ──────────────────────────────────────────────────
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAll = () => {
    const allIds = filtered.map(a => a.id);
    setSelectedIds(allIds);
  };

  const deselectAll = () => {
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setBatchDeleteOpen(true);
  };

  const confirmBatchDelete = () => {
    deleteBatchMut.mutate(selectedIds);
  };

  const handleGroupDelete = (ids: string[]) => {
    setSelectedIds(ids);
    setBatchDeleteOpen(true);
  };

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
      { strokeDashoffset: offset, duration: 1.2, ease: 'power3.out', delay: 0.4 }
    );
  }, [stats.avgRating]);

  return (
    <div ref={containerRef}>
      <Breadcrumb />

      {/* ── Header Card ── */}
      <div className="anime-page-header mb-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Top label */}
        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Tv className="w-3 h-3 text-primary" />
          </div>
          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.14em]">
            Anime &amp; Movie Archive
          </span>
        </div>

        <div className="px-4 pt-1.5 pb-4">
          {/* Title */}
          <h1 className="page-header leading-tight mb-1">Database Anime 📺</h1>

          {/* Subtitle + Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-2 mb-4">
            <p className="text-xs text-muted-foreground font-medium min-w-0 overflow-hidden whitespace-nowrap text-ellipsis flex-1">
              {animeList.length} judul · {stats.movies} movie · {watchlistItems.length} watchlist
            </p>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
              <TitleLanguageSwitch currentLang={currentLang} onLangChange={setTitleLang} />
              <ImportExportButton
                data={animeList}
                filename="anime-livoria"
                mediaType="anime"
                onImportComplete={() => queryClient.invalidateQueries({ queryKey: ['anime'] })}
                onOpenBulkImport={() => setBulkImportOpen(true)}
              />
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs sm:text-sm font-bold hover:opacity-90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Tambah</span>
              </button>
            </div>
          </div>

          {/* Stat Pills */}
          <div className="flex flex-wrap gap-2">
            <div className="anime-stat-pill flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-foreground">{stats.ongoing}</span>
              <span className="text-[10px] font-medium text-muted-foreground">Tayang</span>
            </div>
            <div className="anime-stat-pill flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-sky-500" />
              <span className="text-[10px] font-bold text-foreground">{stats.completed}</span>
              <span className="text-[10px] font-medium text-muted-foreground">Selesai</span>
            </div>
            <div className="anime-stat-pill flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-[10px] font-bold text-foreground">{stats.planned}</span>
              <span className="text-[10px] font-medium text-muted-foreground">Akan Rilis</span>
            </div>
            <div className="anime-stat-pill flex items-center gap-2 px-3 py-1.5 rounded-xl bg-muted/50 border border-border/50">
              <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
              <span className="text-[10px] font-bold text-foreground">{stats.favorites}</span>
              <span className="text-[10px] font-medium text-muted-foreground">Favorit</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex p-1 rounded-xl bg-muted/60 border border-border/50 backdrop-blur-sm">
          <button
            onClick={() => setPageTab('semua')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              pageTab === 'semua' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Koleksi
          </button>
          <button
            onClick={() => setPageTab('watchlist')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              pageTab === 'watchlist' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" /> Watchlist
            {watchlistItems.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px]">
                {watchlistItems.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-all"
            title={viewMode === 'grid' ? 'Tampilan List' : 'Tampilan Grid'}
          >
            {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── Batch Actions & Selection Bar ── */}
      {selectionMode && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-2xl bg-foreground text-background shadow-2xl">
            <div className="flex items-center gap-3">
              <button 
                onClick={deselectAll}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-background/10 hover:bg-background/20 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold">{selectedIds.length} dipilih</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={selectAll}
                className="px-3 py-1.5 rounded-lg bg-background/10 hover:bg-background/20 text-xs font-bold transition-all"
              >
                Pilih Semua
              </button>
              <button 
                onClick={handleBatchDelete}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition-all disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Filters & Search ── */}
      {pageTab === 'semua' && (
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input
                type="text"
                placeholder="Cari anime, genre, atau studio..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted text-muted-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px]">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="relative">
                <button
                  ref={sortTriggerRef}
                  onClick={() => setShowSortDD(!showSortDD)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-all"
                >
                  <ArrowUpDown className="w-4 h-4" />
                  Urutkan
                </button>

                {showSortDD && (
                  <div className="absolute right-0 top-full mt-2 w-56 z-50 rounded-xl border border-border bg-card shadow-xl py-1 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-3 py-2 border-b border-border/50">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Metode Pengurutan</span>
                    </div>
                    {[
                      { k: 'terbaru', l: 'Terbaru Ditambahkan', i: Clock },
                      { k: 'terbaru_tonton', l: 'Baru Saja Ditonton', i: PlayCircle },
                      { k: 'rating', l: 'Rating Tertinggi', i: Star },
                      { k: 'judul_az', l: 'Judul (A-Z)', i: List },
                      { k: 'episode', l: 'Jumlah Episode', i: Layers },
                      { k: 'jadwal_terdekat', l: 'Jadwal Terdekat', i: CalendarClock },
                      { k: 'tahun_terbaru', l: 'Tahun Rilis', i: Building2 },
                    ].map(({ k, l, i: Icon }) => (
                      <button
                        key={k}
                        onClick={() => { setSortMode(k as SortMode); setShowSortDD(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-medium transition-colors ${
                          sortMode === k ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-3.5 h-3.5 ${sortMode === k ? 'text-primary' : 'text-muted-foreground'}`} />
                          {l}
                        </div>
                        {sortMode === k && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                    <div className="px-3 py-2 border-t border-border/50 bg-muted/30">
                      <button 
                        onClick={() => setSortReverse(!sortReverse)}
                        className="w-full flex items-center justify-between text-[10px] font-bold text-muted-foreground hover:text-foreground transition-all"
                      >
                        REVERSE ORDER
                        {sortReverse ? <ArrowUpNarrowWide className="w-3 h-3" /> : <ArrowDownNarrowWide className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  setSelectionMode(!selectionMode);
                  if (selectionMode) setSelectedIds([]);
                }}
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${
                  selectionMode 
                    ? 'bg-primary border-primary text-primary-foreground shadow-md' 
                    : 'bg-card border-border text-muted-foreground hover:text-foreground'
                }`}
                title="Pilih Batch"
              >
                <CheckSquare className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="p-4 rounded-2xl bg-card border border-border shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Rilis</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'on-going', 'completed', 'planned'].map(s => (
                      <button
                        key={s}
                        onClick={() => setFilter(s as any)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                          filter === s ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {s === 'all' ? 'Semua' : (STATUS_CONFIG as any)[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Tonton</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['all', 'want_to_watch', 'watching', 'watched'].map(s => (
                      <button
                        key={s}
                        onClick={() => setWatchStatusFilter(s as any)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                          watchStatusFilter === s ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {s === 'all' ? 'Semua' : (WATCH_STATUS_CONFIG as any)[s].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Genre</label>
                  <select
                    value={genreFilter}
                    onChange={e => setGenreFilter(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="all">Semua Genre</option>
                    {usedGenres.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Format</label>
                  <div className="flex gap-1.5">
                    {[
                      { k: 'all', l: 'Semua' },
                      { k: 'series', l: 'TV Series' },
                      { k: 'movie', l: 'Movie' },
                    ].map(m => (
                      <button
                        key={m.k}
                        onClick={() => setMovieFilter(m.k as any)}
                        className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                          movieFilter === m.k ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/30'
                        }`}
                      >
                        {m.l}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 lg:col-span-2">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Lainnya</label>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setShowFavoriteOnly(!showFavoriteOnly)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        showFavoriteOnly ? 'bg-pink-500 border-pink-500 text-white' : 'bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${showFavoriteOnly ? 'fill-white' : ''}`} />
                      Hanya Favorit
                    </button>
                    <button
                      onClick={() => setShowBookmarkOnly(!showBookmarkOnly)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        showBookmarkOnly ? 'bg-amber-500 border-amber-500 text-white' : 'bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <BookmarkIcon className={`w-3.5 h-3.5 ${showBookmarkOnly ? 'fill-white' : ''}`} />
                      Hanya Bookmark
                    </button>
                    <button
                      onClick={() => setShowHentaiOnly(!showHentaiOnly)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                        showHentaiOnly ? 'bg-red-600 border-red-600 text-white' : 'bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Tampilkan 18+
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/50 flex justify-end">
                <button
                  onClick={() => {
                    setFilter('all'); setGenreFilter('all'); setMovieFilter('all'); setWatchStatusFilter('all');
                    setShowFavoriteOnly(false); setShowBookmarkOnly(false); setShowHentaiOnly(false);
                  }}
                  className="text-[10px] font-bold text-muted-foreground hover:text-primary transition-colors"
                >
                  RESET SEMUA FILTER
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Watchlist Filter ── */}
      {pageTab === 'watchlist' && (
        <div className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-2xl bg-muted/40 border border-border/50">
          {[
            { k: 'all', l: 'Semua Watchlist', i: Layers },
            { k: 'want_to_watch', l: 'Mau Nonton', i: BookmarkPlus },
            { k: 'watching', l: 'Sedang Nonton', i: PlayCircle },
            { k: 'watched', l: 'Selesai Nonton', i: CheckCircle },
          ].map(w => (
            <button
              key={w.k}
              onClick={() => setWatchlistFilter(w.k as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                watchlistFilter === w.k ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-card/30'
              }`}
            >
              <w.i className="w-3.5 h-3.5" />
              {w.l}
            </button>
          ))}
        </div>
      )}

      {/* ── Content Grid/List ── */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[3/4.5] rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {pageTab === 'semua' ? (
            filtered.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border-2 border-dashed border-border/50">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Tv className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">Tidak ada hasil ditemukan</h3>
                <p className="text-xs text-muted-foreground">Coba ubah kata kunci atau filter pencarian Anda.</p>
              </div>
            ) : (
              <div ref={gridRef} className={viewMode === 'grid'
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
                : "flex flex-col gap-3"
              }>
                {paginatedFiltered.map(item => {
                  const isStacked = !item.is_movie && stackCounts[item.parent_title || item.title] > 1;
                  const isSelected = selectedIds.includes(item.id);
                  
                  return (
                    <div key={item.id} className="relative group">
                      {selectionMode && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(item.id);
                          }}
                          className={`absolute top-2 left-2 z-30 w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-black/40 text-white border border-white/20 backdrop-blur-md hover:bg-black/60'
                          }`}
                        >
                          {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                        </button>
                      )}
                      
                      <MediaCard
                        item={item}
                        viewMode={viewMode}
                        isStacked={isStacked}
                        stackCount={stackCounts[item.parent_title || item.title]}
                        currentLang={currentLang}
                        onEdit={openEdit}
                        onDelete={(id) => { setDeleteItem(item); setDeleteOpen(true); }}
                        onDetail={openDetail}
                        onStackDetail={openStackDetail}
                        onToggleFavorite={toggleFavoriteMut.mutate}
                        onToggleBookmark={toggleBookmarkMut.mutate}
                        onUpdateWatchStatus={handleUpdateWatchStatus}
                        onGroupDelete={handleGroupDelete}
                        isSelectionMode={selectionMode}
                        isSelected={isSelected}
                        onSelect={toggleSelection}
                      />
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            paginatedWatchlist.length === 0 ? (
              <div className="py-20 text-center rounded-3xl border-2 border-dashed border-border/50">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <BookmarkIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-1">Watchlist masih kosong</h3>
                <p className="text-xs text-muted-foreground">Tandai anime yang ingin atau sedang Anda tonton.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedWatchlist.map(item => (
                  <WatchlistCard
                    key={item.id}
                    item={item}
                    currentLang={currentLang}
                    onEdit={openEdit}
                    onDetail={openDetail}
                    onUpdateWatchStatus={handleUpdateWatchStatus}
                    onUpdateEpisode={handleUpdateEpisode}
                  />
                ))}
              </div>
            )
          )}

          {/* Pagination */}
          {pageTab === 'semua' ? (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          ) : (
            <Pagination
              currentPage={watchlistCurrentPage}
              totalPages={watchlistTotalPages}
              pageSize={watchlistPageSize}
              totalItems={watchlistFiltered.length}
              onPageChange={setWatchlistCurrentPage}
              onPageSizeChange={setWatchlistPageSize}
            />
          )}
        </>
      )}

      {/* ── MODALS ── */}

      {/* Form Modal */}
      <AnimePageForm
        open={modalOpen}
        onOpenChange={setModalOpen}
        editItem={editItem}
        form={form}
        setForm={setForm}
        formWatchStatus={formWatchStatus}
        setFormWatchStatus={setFormWatchStatus}
        extraData={extraData}
        setExtraData={setExtraData}
        selectedGenres={selectedGenres}
        setSelectedGenres={setSelectedGenres}
        selectedSchedule={selectedSchedule}
        setSelectedSchedule={setSelectedSchedule}
        coverPreview={coverPreview}
        setCoverPreview={setCoverPreview}
        setCoverFile={setCoverFile}
        uploading={uploading}
        parentSearch={parentSearch}
        setParentSearch={setParentSearch}
        showParentDD={showParentDD}
        setShowParentDD={setShowParentDD}
        filteredParentTitles={filteredParentTitles}
        onSubmit={handleSubmit}
      />

      {/* Delete Single Confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold mb-2">Hapus Anime?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mb-6">
              Apakah Anda yakin ingin menghapus <strong>{deleteItem?.title}</strong>? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
            <div className="flex gap-3 w-full">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-bold hover:bg-muted/80 transition-all">Batal</button>
              <button onClick={() => deleteItem && deleteMut.mutate(deleteItem.id)} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-all">Hapus</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch Delete Confirm */}
      <Dialog open={batchDeleteOpen} onOpenChange={setBatchDeleteOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl p-6">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
              <Trash2 className="w-8 h-8 text-destructive" />
            </div>
            <DialogTitle className="text-xl font-bold mb-2">Hapus Massal?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mb-6">
              Anda akan menghapus <strong>{selectedIds.length}</strong> anime sekaligus. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
            <div className="flex gap-3 w-full">
              <button onClick={() => setBatchDeleteOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm font-bold hover:bg-muted/80 transition-all">Batal</button>
              <button onClick={confirmBatchDelete} className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-bold hover:opacity-90 transition-all">Hapus Semua</button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Modal */}
      <DetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        item={detailItem}
        currentLang={currentLang}
        onEdit={openEdit}
        onDelete={(it) => { setDeleteItem(it); setDeleteOpen(true); }}
        onUpdateWatchStatus={handleUpdateWatchStatus}
        onUpdateEpisode={handleUpdateEpisode}
      />

      {/* Stack Detail Modal */}
      <StackDetailModal
        open={stackDetailOpen}
        onOpenChange={setStackDetailOpen}
        items={stackDetailItems}
        initIdx={stackDetailInitIdx}
        currentLang={currentLang}
        onEdit={openEdit}
        onDelete={(it) => { setDeleteItem(it); setDeleteOpen(true); }}
        onDetail={openDetail}
        onUpdateWatchStatus={handleUpdateWatchStatus}
      />

      {/* Duplicate Confirm */}
      <DuplicateConfirmationModal
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        conflicts={duplicateConflicts}
        onConfirm={handleConfirmDuplicate}
        mediaType="anime"
      />

      {/* Bulk Import */}
      <BulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImport={handleImport}
        mediaType="anime"
      />

      {/* Lightbox */}
      <CoverLightbox
        open={!!coverLightbox}
        onOpenChange={() => setCoverLightbox(null)}
        url={coverLightbox?.url || ''}
        title={coverLightbox?.title || ''}
      />
    </div>
  );
};

// ─── Sub-components ──────────────────────────────────────────────────────────

interface MediaCardProps {
  item: AnimeItem;
  viewMode: ViewMode;
  isStacked: boolean;
  stackCount: number;
  currentLang: 'id' | 'en' | 'jp';
  onEdit: (item: AnimeItem) => void;
  onDelete: (id: string) => void;
  onDetail: (item: AnimeItem) => void;
  onStackDetail: (id: string, clicked?: AnimeItem) => void;
  onToggleFavorite: (item: AnimeItem) => void;
  onToggleBookmark: (item: AnimeItem) => void;
  onUpdateWatchStatus: (item: AnimeItem, status: WatchStatus) => void;
  onGroupDelete: (ids: string[]) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

function MediaCard({
  item, viewMode, isStacked, stackCount, currentLang,
  onEdit, onDelete, onDetail, onStackDetail,
  onToggleFavorite, onToggleBookmark, onUpdateWatchStatus, onGroupDelete,
  isSelectionMode, isSelected, onSelect
}: MediaCardProps) {
  const title = resolveTitle(item, currentLang);
  const status = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
  const watchStatus = getWatchStatus(item);
  const watchCfg = WATCH_STATUS_CONFIG[watchStatus];

  if (viewMode === 'list') {
    return (
      <div 
        onClick={() => isSelectionMode ? onSelect?.(item.id) : isStacked ? onStackDetail(item.parent_title || item.title, item) : onDetail(item)}
        className={`flex items-center gap-4 p-3 rounded-2xl bg-card border transition-all cursor-pointer ${
          isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50'
        }`}
      >
        <div className="relative w-16 h-20 shrink-0 rounded-xl overflow-hidden bg-muted">
          {item.cover_url ? (
            <img src={item.cover_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-muted-foreground/40" /></div>
          )}
          {isStacked && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">+{stackCount}</span>
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-foreground truncate">{title}</h3>
            {item.is_favorite && <Heart className="w-3 h-3 text-pink-500 fill-pink-500 shrink-0" />}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            {item.rating > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-500">
                <Star className="w-3 h-3 fill-amber-500" /> {item.rating}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground font-medium">
              {item.episodes_watched || 0}/{item.episodes || '?'} Ep
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {!isSelectionMode && (
            <GroupActionMenu
              onEdit={() => onEdit(item)}
              onDelete={() => onDelete(item.id)}
              onToggleFavorite={() => onToggleFavorite(item)}
              onToggleBookmark={() => onToggleBookmark(item)}
              onUpdateWatchStatus={(s) => onUpdateWatchStatus(item, s as any)}
              isFavorite={item.is_favorite}
              isBookmarked={item.is_bookmarked}
              watchStatus={watchStatus}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={() => isSelectionMode ? onSelect?.(item.id) : isStacked ? onStackDetail(item.parent_title || item.title, item) : onDetail(item)}
      className={`relative aspect-[3/4.5] rounded-2xl overflow-hidden bg-muted group/card cursor-pointer transition-all ${
        isSelected ? 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-[0.98]' : 'hover:scale-[1.02] hover:shadow-xl'
      }`}
    >
      {/* Cover Image */}
      {item.cover_url ? (
        <img src={item.cover_url} alt={title} className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-10 h-10 text-muted-foreground/20" /></div>
      )}

      {/* Stack Indicator */}
      {isStacked && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold">
          <Layers className="w-3 h-3" /> {stackCount}
        </div>
      )}

      {/* Watch Status Tag */}
      {watchStatus !== 'none' && (
        <div className={`absolute top-2 left-2 z-20 px-2 py-1 rounded-lg backdrop-blur-md border border-white/10 text-white text-[9px] font-bold flex items-center gap-1 ${
          watchStatus === 'watching' ? 'bg-emerald-500/80' : watchStatus === 'want_to_watch' ? 'bg-amber-500/80' : 'bg-sky-500/80'
        }`}>
          <watchCfg.icon className="w-2.5 h-2.5" />
          {watchCfg.label}
        </div>
      )}

      {/* Overlay info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-100 transition-opacity">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white ${
              item.status === 'on-going' ? 'bg-emerald-500' : item.status === 'completed' ? 'bg-sky-500' : 'bg-amber-500'
            }`}>
              {status.label}
            </span>
            {item.is_hentai && (
              <span className="px-2 py-0.5 rounded-md bg-red-600 text-white text-[9px] font-black uppercase tracking-wider">18+</span>
            )}
          </div>
          <h3 className="text-xs font-bold text-white line-clamp-2 leading-snug mb-1">{title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-white/80">{item.episodes_watched || 0}/{item.episodes || '?'} Ep</span>
              {item.rating > 0 && (
                <div className="flex items-center gap-0.5">
                  <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                  <span className="text-[10px] font-bold text-amber-400">{item.rating}</span>
                </div>
              )}
            </div>
            {item.is_favorite && <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />}
          </div>
        </div>
      </div>
      
      {/* Hover Action (Desktop Only) */}
      {!isSelectionMode && (
        <div className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity hidden sm:block">
          <GroupActionMenu
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item.id)}
            onToggleFavorite={() => onToggleFavorite(item)}
            onToggleBookmark={() => onToggleBookmark(item)}
            onUpdateWatchStatus={(s) => onUpdateWatchStatus(item, s as any)}
            isFavorite={item.is_favorite}
            isBookmarked={item.is_bookmarked}
            watchStatus={watchStatus}
            variant="glass"
          />
        </div>
      )}
    </div>
  );
}

// ─── Watchlist Card ───
function WatchlistCard({ item, currentLang, onEdit, onDetail, onUpdateWatchStatus, onUpdateEpisode }: any) {
  const title = resolveTitle(item, currentLang);
  const watchStatus = getWatchStatus(item);
  const watchCfg = WATCH_STATUS_CONFIG[watchStatus];
  
  const progress = item.episodes > 0 ? (item.episodes_watched / item.episodes) * 100 : 0;

  return (
    <div className="group relative rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Cover */}
        <div 
          onClick={() => onDetail(item)}
          className="relative w-24 h-32 shrink-0 rounded-xl overflow-hidden bg-muted cursor-pointer"
        >
          {item.cover_url ? (
            <img src={item.cover_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-8 h-8 text-muted-foreground/30" /></div>
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 
              onClick={() => onDetail(item)}
              className="text-sm font-bold text-foreground line-clamp-2 leading-tight cursor-pointer hover:text-primary transition-colors"
            >
              {title}
            </h3>
            <div className="shrink-0">
              <GroupActionMenu
                onEdit={() => onEdit(item)}
                onDelete={() => {}}
                onToggleFavorite={() => {}}
                onToggleBookmark={() => {}}
                onUpdateWatchStatus={(s) => onUpdateWatchStatus(item, s as any)}
                isFavorite={item.is_favorite}
                isBookmarked={item.is_bookmarked}
                watchStatus={watchStatus}
                hideDelete
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${watchCfg.bg} ${watchCfg.color}`}>
              <watchCfg.icon className="w-3 h-3" />
              {watchCfg.label}
            </div>
            {item.rating > 0 && (
              <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                <Star className="w-3 h-3 fill-amber-500" /> {item.rating}
              </div>
            )}
          </div>

          {/* Episode Progress */}
          <div className="mt-auto space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-muted-foreground">Progress Nonton</span>
              <span className="text-foreground">{item.episodes_watched || 0} / {item.episodes || '?'} Ep</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${watchStatus === 'watching' ? 'bg-emerald-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
            
            {/* Quick Episode Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button 
                onClick={() => onUpdateEpisode(item, Math.max(0, (item.episodes_watched || 0) - 1))}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-muted text-muted-foreground hover:bg-accent hover:text-foreground transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => onUpdateEpisode(item, (item.episodes_watched || 0) + 1, item.episodes)}
                className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> Episode Baru
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ───
function DetailModal({ open, onOpenChange, item, currentLang, onEdit, onDelete, onUpdateWatchStatus, onUpdateEpisode }: any) {
  if (!item) return null;
  const title = resolveTitle(item, currentLang);
  const status = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
  const watchStatus = getWatchStatus(item);
  const watchCfg = WATCH_STATUS_CONFIG[watchStatus];
  const altTitles = deserializeAlternativeTitles(item.alternative_titles);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
        {/* Header with Image Background */}
        <div className="relative h-48 sm:h-64 bg-muted">
          {item.cover_url ? (
            <>
              <img src={item.cover_url} alt={title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/30" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-12 h-12 text-muted-foreground/20" /></div>
          )}
          
          <button 
            onClick={() => onOpenChange(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-all"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="absolute bottom-4 left-6 right-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.color}`}>
                {status.label}
              </span>
              {item.is_movie && (
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-wider">Movie</span>
              )}
              {item.is_hentai && (
                <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-black uppercase tracking-wider">18+</span>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground line-clamp-2 drop-shadow-sm">{title}</h2>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 flex flex-col items-center gap-1">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span className="text-sm font-bold">{item.rating || '—'}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Rating</span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 flex flex-col items-center gap-1">
              <Layers className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">{item.episodes || '?'}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Episode</span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 flex flex-col items-center gap-1">
              <Clock className="w-4 h-4 text-sky-500" />
              <span className="text-sm font-bold">{item.duration_minutes ? `${item.duration_minutes}m` : '—'}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Durasi</span>
            </div>
            <div className="p-3 rounded-2xl bg-muted/50 border border-border/50 flex flex-col items-center gap-1">
              <CalendarClock className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold">{item.release_year || '—'}</span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Tahun</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] flex p-1 rounded-xl bg-muted/50 border border-border/50">
              {['none', 'want_to_watch', 'watching', 'watched'].map((s: any) => {
                const cfg = WATCH_STATUS_CONFIG[s as WatchStatus];
                const isActive = watchStatus === s;
                return (
                  <button
                    key={s}
                    onClick={() => onUpdateWatchStatus(item, s)}
                    className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${
                      isActive ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title={cfg.label}
                  >
                    <cfg.icon className={`w-4 h-4 ${isActive ? cfg.color : ''}`} />
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => onEdit(item)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => onDelete(item)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all border border-destructive/20"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>

          {/* Progress (if watching) */}
          {watchStatus !== 'none' && (
            <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <PlayCircle className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">Progress Nonton</p>
                    <p className="text-[10px] text-muted-foreground">Sudah menonton {item.episodes_watched || 0} dari {item.episodes || '?'} episode</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-primary">{item.episodes > 0 ? Math.round((item.episodes_watched / item.episodes) * 100) : 0}%</span>
                </div>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-700"
                  style={{ width: `${item.episodes > 0 ? (item.episodes_watched / item.episodes) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onUpdateEpisode(item, Math.max(0, (item.episodes_watched || 0) - 1))}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-card border border-border text-xs font-bold hover:bg-muted transition-all"
                >
                  <Minus className="w-3.5 h-3.5" /> Episode
                </button>
                <button 
                  onClick={() => onUpdateEpisode(item, (item.episodes_watched || 0) + 1, item.episodes)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Episode
                </button>
              </div>
            </div>
          )}

          {/* Synopsis */}
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
              <BookOpen className="w-3 h-3" /> Sinopsis
            </h4>
            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-4 rounded-2xl border border-border/50">
              {item.synopsis || 'Tidak ada sinopsis tersedia.'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Genre</h4>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {item.genre?.split(',').map((g: string) => {
                    const name = g.trim();
                    const color = GENRE_PALETTE[name] || '#64748b';
                    return (
                      <span key={name} className="px-2 py-1 rounded-lg text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: color }}>
                        {name}
                      </span>
                    );
                  }) || <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Studio</h4>
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> {item.studio || '—'}
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Jadwal Tayang</h4>
                <p className="text-sm font-bold text-foreground flex items-center gap-2">
                  <CalendarClock className="w-3.5 h-3.5 text-emerald-500" /> {item.schedule || '—'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Judul Alternatif</h4>
                <div className="space-y-1.5 pt-1">
                  {altTitles.en && (
                    <div className="flex items-start gap-2">
                      <span className="px-1 py-0.5 rounded bg-muted text-[8px] font-black text-muted-foreground mt-0.5">EN</span>
                      <p className="text-xs font-medium text-foreground leading-tight">{altTitles.en}</p>
                    </div>
                  )}
                  {altTitles.jp && (
                    <div className="flex items-start gap-2">
                      <span className="px-1 py-0.5 rounded bg-muted text-[8px] font-black text-muted-foreground mt-0.5">JP</span>
                      <p className="text-xs font-medium text-foreground leading-tight">{altTitles.jp}</p>
                    </div>
                  )}
                  {!altTitles.en && !altTitles.jp && <p className="text-xs text-muted-foreground">—</p>}
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Link Eksternal</h4>
                <div className="flex gap-2 pt-1">
                  {item.mal_url && (
                    <a href={item.mal_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2e51a2] text-white text-[10px] font-bold hover:opacity-90 transition-all">
                      MyAnimeList <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {item.anilist_url && (
                    <a href={item.anilist_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#02a9ff] text-white text-[10px] font-bold hover:opacity-90 transition-all">
                      AniList <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                  {item.streaming_url && (
                    <a href={item.streaming_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-all">
                      Nonton <PlayCircle className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {item.notes && (
            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2">
              <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Edit2 className="w-3 h-3" /> Catatan Pribadi
              </h4>
              <p className="text-sm text-foreground/80 italic leading-relaxed">"{item.notes}"</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Stack Detail Modal ───
function StackDetailModal({ open, onOpenChange, items, initIdx, currentLang, onEdit, onDelete, onDetail, onUpdateWatchStatus }: any) {
  if (!items || items.length === 0) return null;
  const parentTitle = items[0].parent_title || items[0].title;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-black text-foreground leading-tight">{parentTitle}</h2>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Koleksi Serial · {items.length} Season</p>
              </div>
            </div>
            <button onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {items.map((it: any) => (
              <div 
                key={it.id} 
                onClick={() => onDetail(it)}
                className="group relative flex gap-4 p-3 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="relative w-20 h-28 shrink-0 rounded-xl overflow-hidden bg-muted">
                  {it.cover_url ? (
                    <img src={it.cover_url} alt={it.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><ImageIcon className="w-6 h-6 text-muted-foreground/30" /></div>
                  )}
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-black/60 text-[8px] font-black text-white uppercase">
                    S{it.season || 1}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0 flex flex-col py-1">
                  <h3 className="text-sm font-bold text-foreground line-clamp-2 leading-tight mb-2 group-hover:text-primary transition-colors">
                    {resolveTitle(it, currentLang)}
                  </h3>
                  
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${STATUS_CONFIG[it.status as keyof typeof STATUS_CONFIG].bg} ${STATUS_CONFIG[it.status as keyof typeof STATUS_CONFIG].color}`}>
                      {STATUS_CONFIG[it.status as keyof typeof STATUS_CONFIG].label}
                    </span>
                    {it.rating > 0 && (
                      <div className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                        <Star className="w-3 h-3 fill-amber-500" /> {it.rating}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{it.episodes_watched || 0}/{it.episodes || '?'} Episode</span>
                    <GroupActionMenu
                      onEdit={() => onEdit(it)}
                      onDelete={() => onDelete(it)}
                      onToggleFavorite={() => {}}
                      onToggleBookmark={() => {}}
                      onUpdateWatchStatus={(s) => onUpdateWatchStatus(it, s as any)}
                      isFavorite={it.is_favorite}
                      isBookmarked={it.is_bookmarked}
                      watchStatus={getWatchStatus(it)}
                      variant="minimal"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-6 bg-muted/30 border-t border-border/50 flex justify-between items-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gunakan detail untuk melihat info lengkap tiap season.</p>
          <button 
            onClick={() => onOpenChange(false)}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-all shadow-sm"
          >
            Selesai
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── AnimePageForm Component ───
interface AnimePageFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem: AnimeItem | null;
  form: any;
  setForm: any;
  formWatchStatus: WatchStatus;
  setFormWatchStatus: (s: WatchStatus) => void;
  extraData: AnimeExtraData;
  setExtraData: (d: AnimeExtraData) => void;
  selectedGenres: string[];
  setSelectedGenres: (g: string[]) => void;
  selectedSchedule: string[];
  setSelectedSchedule: (s: string[]) => void;
  coverPreview: string;
  setCoverPreview: (p: string) => void;
  setCoverFile: (f: File | null) => void;
  uploading: boolean;
  parentSearch: string;
  setParentSearch: (s: string) => void;
  showParentDD: boolean;
  setShowParentDD: (s: boolean) => void;
  filteredParentTitles: string[];
  onSubmit: (e: React.FormEvent) => void;
}

function AnimePageForm({
  open, onOpenChange, editItem, form, setForm,
  formWatchStatus, setFormWatchStatus, extraData, setExtraData,
  selectedGenres, setSelectedGenres, selectedSchedule, setSelectedSchedule,
  coverPreview, setCoverPreview, setCoverFile, uploading,
  parentSearch, setParentSearch, showParentDD, setShowParentDD,
  filteredParentTitles, onSubmit
}: AnimePageFormProps) {
  const ic = "w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all";
  
  const handleMovieToggle = (newIsMovie: boolean) => {
    setForm((prev: any) => ({
      ...prev,
      is_movie: newIsMovie,
      season: newIsMovie ? 0 : (prev.season || 1),
      duration_minutes: newIsMovie ? (prev.duration_minutes || null) : null
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none shadow-2xl">
        <form onSubmit={onSubmit}>
          <div className="sticky top-0 z-10 px-6 sm:px-8 py-5 bg-background/80 backdrop-blur-xl border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Tv className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black text-foreground">{editItem ? 'Edit Anime' : 'Tambah Anime Baru'}</DialogTitle>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Simpan ke arsip koleksi pribadi Anda</p>
              </div>
            </div>
            <button type="button" onClick={() => onOpenChange(false)} className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            {/* Format Selector */}
            <div className="p-1 rounded-2xl bg-muted/50 border border-border/50 flex">
              <button
                type="button"
                onClick={() => handleMovieToggle(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${!form.is_movie ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Tv className="w-4 h-4" /> TV Series
              </button>
              <button
                type="button"
                onClick={() => handleMovieToggle(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${form.is_movie ? 'bg-card text-foreground shadow-sm border border-border/50' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Film className="w-4 h-4" /> Movie
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
              {/* Left Column: Cover */}
              <div className="md:col-span-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Cover Image</label>
                  <div 
                    onClick={() => document.getElementById('cover-upload')?.click()}
                    className="relative aspect-[3/4.5] rounded-2xl overflow-hidden bg-muted border-2 border-dashed border-border/50 group cursor-pointer hover:border-primary/50 transition-all"
                  >
                    {coverPreview ? (
                      <>
                        <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Upload className="w-8 h-8 text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
                        <ImageIcon className="w-10 h-10 text-muted-foreground/30" />
                        <p className="text-[10px] font-bold text-muted-foreground">Klik untuk upload atau drag &amp; drop</p>
                      </div>
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <input 
                    id="cover-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCoverFile(file);
                        setCoverPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Atau tempel URL gambar..."
                    value={form.cover_url}
                    onChange={e => {
                      setForm({...form, cover_url: e.target.value});
                      setCoverPreview(e.target.value);
                    }}
                    className={ic}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Rating Personal</label>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Star className={`w-5 h-5 ${form.rating > 0 ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground'}`} />
                    <input
                      type="range" min="0" max="10" step="0.1"
                      value={form.rating}
                      onChange={e => setForm({...form, rating: parseFloat(e.target.value)})}
                      className="flex-1 accent-primary"
                    />
                    <span className="w-8 text-sm font-black text-foreground">{form.rating || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Info */}
              <div className="md:col-span-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Judul Utama</label>
                    <input
                      required
                      type="text"
                      placeholder="Contoh: Mushoku Tensei II"
                      value={form.title}
                      onChange={e => setForm({...form, title: e.target.value})}
                      className={ic + " text-base font-bold"}
                    />
                  </div>

                  {!form.is_movie && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Parent Title (Grup)</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Judul utama untuk grup..."
                            value={parentSearch}
                            onChange={e => {
                              setParentSearch(e.target.value);
                              setForm({...form, parent_title: e.target.value});
                              setShowParentDD(true);
                            }}
                            onFocus={() => setShowParentDD(true)}
                            className={ic}
                          />
                          {showParentDD && filteredParentTitles.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-border bg-card shadow-xl py-1">
                              {filteredParentTitles.map(t => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => {
                                    setParentSearch(t);
                                    setForm({...form, parent_title: t});
                                    setShowParentDD(false);
                                  }}
                                  className="w-full text-left px-4 py-2 text-xs font-bold hover:bg-muted transition-colors"
                                >
                                  {t}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Season / Part</label>
                        <input
                          type="number"
                          value={form.season}
                          onChange={e => setForm({...form, season: parseInt(e.target.value) || 1})}
                          className={ic}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status Rilis</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({...form, status: e.target.value as any})}
                      className={ic}
                    >
                      <option value="on-going">Sedang Tayang (On-Going)</option>
                      <option value="completed">Sudah Tamat (Completed)</option>
                      <option value="planned">Akan Datang (Planned)</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Status Tonton</label>
                    <select
                      value={formWatchStatus}
                      onChange={e => setFormWatchStatus(e.target.value as WatchStatus)}
                      className={ic}
                    >
                      <option value="none">Belum Ditandai</option>
                      <option value="want_to_watch">Mau Nonton (Watchlist)</option>
                      <option value="watching">Sedang Nonton</option>
                      <option value="watched">Sudah Selesai Nonton</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Total Episode</label>
                    <input
                      type="number"
                      value={form.episodes}
                      onChange={e => setForm({...form, episodes: parseInt(e.target.value) || 0})}
                      className={ic}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Episode Ditonton</label>
                    <input
                      type="number"
                      value={form.episodes_watched}
                      onChange={e => setForm({...form, episodes_watched: parseInt(e.target.value) || 0})}
                      className={ic}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Genre</label>
                  <GenreSelect
                    availableGenres={ANIME_GENRES}
                    selectedGenres={selectedGenres}
                    onGenresChange={setSelectedGenres}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Sinopsis</label>
                  <textarea
                    rows={4}
                    placeholder="Tulis ringkasan cerita di sini..."
                    value={form.synopsis}
                    onChange={e => setForm({...form, synopsis: e.target.value})}
                    className={ic + " resize-none"}
                  />
                </div>

                <AnimeExtraFields
                  data={extraData}
                  onChange={setExtraData}
                  mediaType="anime"
                  onAutoFill={(data) => {
                    setForm(prev => ({
                      ...prev,
                      title: data.title || prev.title,
                      synopsis: data.synopsis || prev.synopsis,
                      episodes: data.episodes || prev.episodes,
                      status: data.status || prev.status,
                      cover_url: data.cover_url || prev.cover_url,
                      duration_minutes: data.duration_minutes || prev.duration_minutes,
                      is_movie: data.is_movie ?? prev.is_movie,
                      season: data.season || prev.season,
                    }));
                    if (data.cover_url) setCoverPreview(data.cover_url);
                    if (data.genres) setSelectedGenres(data.genres);
                  }}
                />

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Catatan Pribadi</label>
                  <input
                    type="text"
                    placeholder="Misal: Nonton di Netflix, Waifu: Roxy..."
                    value={form.notes}
                    onChange={e => setForm({...form, notes: e.target.value})}
                    className={ic}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 px-6 sm:px-8 py-6 bg-background/80 backdrop-blur-xl border-t border-border flex gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 px-6 py-3 rounded-2xl bg-muted text-foreground text-sm font-black uppercase tracking-widest hover:bg-muted/80 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-[2] px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {uploading ? 'Memproses...' : editItem ? 'Simpan Perubahan' : 'Tambahkan ke Koleksi'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default Anime;
