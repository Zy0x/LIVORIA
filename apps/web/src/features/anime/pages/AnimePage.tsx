import { useEffect, useRef, useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
import { MediaStackDetailModal } from '@/features/media/components/MediaStackDetailModal';
import { MediaDetailDialogContent } from '@/features/media/components/MediaDetailDialogContent';
import { MediaFormDialogContent } from '@/features/media/components/MediaFormDialogContent';
import { usePaginationTransition } from '@/shared/hooks/usePaginationTransition';
import { useDeferredListScroll, useScrollToListStart } from '@/shared/hooks/useScrollToListStart';
import { useCardEntrance } from '@/features/media/hooks/useCardEntrance';
import { useGsapCardHover } from '@/features/media/hooks/useGsapCardHover';
import { useMediaAnimationRecovery } from '@/features/media/hooks/useMediaAnimationRecovery';
import { useMediaPageEntrance } from '@/features/media/hooks/useMediaPageEntrance';
import { useMobileListRenderGate } from '@/features/media/hooks/useMobileListRenderGate';
import { buildHydratedPageItems } from '@/features/media/domain/page-hydration';
import { logger } from '@/lib/logger';
import { useAnimeFilters } from '@/features/anime/hooks/useAnimeFilters';
import { useAnimeList, useAnimeVisibleItems, ANIME_QUERY_KEY } from '@/features/anime/hooks/useAnimeList';
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
type PendingAnimeSubmitData = Partial<AnimeItem>;
// ─── Helpers ─────────────────────────────────────────────────────────────────
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
  const [pendingSubmitData, setPendingSubmitData] = useState<PendingAnimeSubmitData | null>(null);
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
  const { requestListScroll, flushListScroll } = useDeferredListScroll(scrollToListStart);
  const [coverLightbox, setCoverLightbox] = useState<{ url: string; title: string } | null>(null);
  const { currentLang, setLang: setTitleLang } = useTitleLanguage('anime');
  useBackGesture(modalOpen, () => setModalOpen(false), 'anime-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'anime-delete');
  useBackGesture(stackDetailOpen, () => setStackDetailOpen(false), 'anime-stack-detail');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'anime-detail');
  // useWatchedAutoRemove dipasang di App.tsx (GlobalEffects) — tidak perlu di sini lagi
  const { data: animeList = [], isLoading, isFetching } = useAnimeList();
  const showListSkeleton = isLoading || (isFetching && animeList.length === 0);
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

  // Reset page ke 1 saat filter/search/sort berubah (skip initial mount)
  const filterMountRef = useRef(true);
  useEffect(() => {
    if (filterMountRef.current) { filterMountRef.current = false; return; }
    if (currentPage !== 1) setCurrentPage(1, true);
  }, [currentPage, filter, search, genreFilter, sortMode, sortReverse, movieFilter, watchStatusFilter, showFavoriteOnly, showBookmarkOnly, showHentaiOnly, setCurrentPage]);

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

  const paginatedFilteredMeta = useMemo(() => {
    return paginate(filtered, currentPage, pageSize);
  }, [currentPage, filtered, pageSize, paginate]);

  const watchlistTotalPages = useMemo(() => {
    return getTotalPages(watchlistFiltered.length, watchlistPageSize);
  }, [getTotalPages, watchlistFiltered.length, watchlistPageSize]);

  const paginatedWatchlistMeta = useMemo(() => {
    return paginate(watchlistFiltered, watchlistCurrentPage, watchlistPageSize);
  }, [paginate, watchlistCurrentPage, watchlistFiltered, watchlistPageSize]);

  const {
    data: visibleFilteredItems = [],
    isFetching: isFetchingVisibleFiltered,
  } = useAnimeVisibleItems(paginatedFilteredMeta, pageTab === 'semua');
  const {
    data: visibleWatchlistItems = [],
    isFetching: isFetchingVisibleWatchlist,
  } = useAnimeVisibleItems(paginatedWatchlistMeta, pageTab === 'watchlist');

  const filteredPageHydration = useMemo(
    () => buildHydratedPageItems(paginatedFilteredMeta, visibleFilteredItems, isFetchingVisibleFiltered),
    [isFetchingVisibleFiltered, paginatedFilteredMeta, visibleFilteredItems],
  );
  const watchlistPageHydration = useMemo(
    () => buildHydratedPageItems(paginatedWatchlistMeta, visibleWatchlistItems, isFetchingVisibleWatchlist),
    [isFetchingVisibleWatchlist, paginatedWatchlistMeta, visibleWatchlistItems],
  );

  const paginatedFiltered = filteredPageHydration.items;
  const paginatedWatchlist = watchlistPageHydration.items;

  const animeListForDetails = useMemo(() => {
    const byId = new Map([...visibleFilteredItems, ...visibleWatchlistItems].map((item) => [item.id, item]));
    return animeList.map((item) => byId.get(item.id) ?? item);
  }, [animeList, visibleFilteredItems, visibleWatchlistItems]);

  const cardAnimationKey = useMemo(() => {
    const visibleItems = pageTab === 'watchlist' ? paginatedWatchlistMeta : paginatedFilteredMeta;
    return [
      pageTab,
      viewMode,
      pageTab === 'watchlist' ? watchlistCurrentPage : currentPage,
      pageTab === 'watchlist' ? watchlistPageSize : pageSize,
      visibleItems.map((item) => item.id).join('|'),
    ].join(':');
  }, [currentPage, pageSize, pageTab, paginatedFilteredMeta, paginatedWatchlistMeta, viewMode, watchlistCurrentPage, watchlistPageSize]);
  const activeHydration = pageTab === 'watchlist' ? watchlistPageHydration : filteredPageHydration;
  const shouldBlockListRender = showListSkeleton || activeHydration.isBlocking;
  const canRenderPartialHydration = activeHydration.isPartial;
  const mobileListReady = useMobileListRenderGate(cardAnimationKey, shouldBlockListRender);
  const { isPaginationTransitioning, startPaginationTransition } = usePaginationTransition(
    cardAnimationKey,
    shouldBlockListRender || (!canRenderPartialHydration && !mobileListReady),
  );
  const showRenderSkeleton = shouldBlockListRender || (!canRenderPartialHydration && (!mobileListReady || isPaginationTransitioning));

  useMediaPageEntrance(containerRef, 'anime', showRenderSkeleton);
  useCardEntrance(containerRef, cardAnimationKey, {
    selector: pageTab === 'watchlist' ? '.anime-watchlist-card' : '.anime-card',
    disabled: showRenderSkeleton,
  });
  useGsapCardHover(containerRef, cardAnimationKey, {
    disabled: showRenderSkeleton || pageTab === 'watchlist' || viewMode !== 'grid',
  });
  useMediaAnimationRecovery(containerRef, cardAnimationKey, showRenderSkeleton);

  useEffect(() => {
    if (!showRenderSkeleton && pageTab === 'semua') flushListScroll();
  }, [currentPage, pageSize, viewMode, paginatedFiltered.length, showRenderSkeleton, pageTab, flushListScroll]);

  useEffect(() => {
    if (!showRenderSkeleton && pageTab === 'watchlist') flushListScroll();
  }, [watchlistCurrentPage, watchlistPageSize, paginatedWatchlist.length, showRenderSkeleton, pageTab, flushListScroll]);

  // Clamp page bila total pages berkurang (skip saat loading agar URL tidak di-reset)
  useEffect(() => {
    if (!showRenderSkeleton && totalPages > 0 && currentPage > totalPages) setCurrentPage(totalPages, true);
  }, [totalPages, currentPage, showRenderSkeleton, setCurrentPage]);

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
  }, [viewMode, pageTab, showListSkeleton, filtered.length, watchlistFiltered.length]);

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
    const data: PendingAnimeSubmitData = {
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
        logger.error('Gagal cek duplikasi:', err);
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

  return (
    <div ref={containerRef}>
      <Breadcrumb />

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
          appendSkeletonCount={watchlistPageHydration.appendSkeletonCount}
          stats={stats}
          watchlistFilter={watchlistFilter}
          currentPage={watchlistCurrentPage}
          totalPages={watchlistTotalPages}
          pageSize={watchlistPageSize}
          titleLang={currentLang}
          onFilterChange={setWatchlistFilter}
          onPageChange={(p) => { startPaginationTransition(); requestListScroll('watchlist'); setWatchlistCurrentPage(p); }}
          onPageSizeChange={(s) => { startPaginationTransition(); requestListScroll('watchlist'); setWatchlistPageSize(s); }}
          onPageTabChange={setPageTab}
          onUpdateWatchStatus={handleUpdateWatchStatus}
          onUpdateEpisode={handleUpdateEpisode}
          onEdit={openEdit}
          onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
          onView={openDetail}
          listStartRef={watchlistStartRef}
        />
      )}

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

          {showRenderSkeleton ? (
            <AnimeGridSkeleton count={pageSize === 'semua' ? 20 : Math.min(pageSize as number, 30)} />
          ) : viewMode === 'grid' ? (
            <AnimeGrid
              items={paginatedFiltered}
              appendSkeletonCount={filteredPageHydration.appendSkeletonCount}
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
              listStartRef={collectionStartRef}
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
              onPageChange={(p) => { startPaginationTransition(); requestListScroll('collection'); setCurrentPage(p); }}
              onPageSizeChange={(s) => { startPaginationTransition(); requestListScroll('collection'); setPageSize(s); }}
            />
          ) : (
            <AnimeList
              items={paginatedFiltered}
              appendSkeletonCount={filteredPageHydration.appendSkeletonCount}
              filteredCount={filtered.length}
              search={search}
              groupMap={groupMap}
              stackCounts={stackCounts}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              titleLang={currentLang}
              listRef={gridRef}
              listStartRef={collectionStartRef}
              onAdd={openAdd}
              onEdit={openEdit}
              onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
              onView={openDetail}
              onViewStack={(anime) => openStackDetail(anime.id)}
              onToggleFavorite={(anime) => toggleFavoriteMut.mutate(anime)}
              onToggleBookmark={(anime) => toggleBookmarkMut.mutate(anime)}
              onUpdateWatchStatus={handleUpdateWatchStatus}
              onPageChange={(p) => { startPaginationTransition(); requestListScroll('collection'); setCurrentPage(p); }}
              onPageSizeChange={(s) => { startPaginationTransition(); requestListScroll('collection'); setPageSize(s); }}
            />
          )}
        </>
      )}

      <MediaStackDetailModal
        open={stackDetailOpen}
        onOpenChange={(v) => { if (!coverLightbox) setStackDetailOpen(v); }}
        items={stackDetailItems}
        initialIndex={stackDetailInitIdx}
        mediaType="anime"
        movieBadgeLabel="MOVIE"
        tableName="anime"
        statusConfig={STATUS_CONFIG}
        genrePalette={GENRE_PALETTE}
        dayLabels={DAY_LABELS}
        getWatchStatus={getWatchStatus}
        extractExtra={extractExtra}
        extractAltTitles={extractAltTitles}
        formatDuration={formatDuration}
        formatDurationLong={formatDurationLong}
        WatchStatusButton={WatchStatusButton}
        AlternativeTitlesPanel={AlternativeTitlesPanel}
        onEdit={openEdit}
        onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
        onUpdateWatchStatus={handleUpdateWatchStatus}
        onCoverClick={(url, title) => setCoverLightbox({ url, title })}
      />

      <AnimeDetailDialog open={detailOpen} onOpenChange={(v) => { if (!coverLightbox) setDetailOpen(v); }}>
        <MediaDetailDialogContent
          item={detailItem}
          items={animeListForDetails}
          mediaType="anime"
          tableName="anime"
          queryKey={ANIME_QUERY_KEY}
          queryClient={queryClient}
          statusConfig={STATUS_CONFIG}
          watchStatusConfig={WATCH_STATUS_CONFIG}
          genrePalette={GENRE_PALETTE}
          dayLabels={DAY_LABELS}
          getWatchStatus={getWatchStatus}
          extractExtra={extractExtra}
          extractAltTitles={extractAltTitles}
          formatDurationLong={formatDurationLong}
          WatchStatusButton={WatchStatusButton}
          WatchedCountdown={WatchedCountdown}
          EpisodeInlineEditor={EpisodeInlineEditor}
          AlternativeTitlesPanel={AlternativeTitlesPanel}
          onClose={() => setDetailOpen(false)}
          onEdit={openEdit}
          onDelete={(item) => { setDeleteItem(item); setDeleteOpen(true); }}
          onCoverClick={(url, title) => setCoverLightbox({ url, title })}
          onUpdateWatchStatus={handleUpdateWatchStatus}
          onUpdateEpisode={handleUpdateEpisode}
        />
      </AnimeDetailDialog>

      <AnimeFormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <MediaFormDialogContent
          mediaType="anime"
          editItem={editItem}
          form={form}
          setForm={setForm}
          extraData={extraData}
          setExtraData={setExtraData}
          coverFile={coverFile}
          coverPreview={coverPreview}
          coverInputRef={coverInputRef}
          setCoverFile={setCoverFile}
          setCoverPreview={setCoverPreview}
          selectedGenres={selectedGenres}
          setSelectedGenres={setSelectedGenres}
          genreOptions={ANIME_GENRES}
          daysOfWeek={DAYS_OF_WEEK}
          parentSearch={parentSearch}
          setParentSearch={setParentSearch}
          showParentDD={showParentDD}
          setShowParentDD={setShowParentDD}
          filteredParentTitles={filteredParentTitles}
          formWatchStatus={formWatchStatus}
          setFormWatchStatus={setFormWatchStatus}
          selectedSchedule={selectedSchedule}
          setSelectedSchedule={setSelectedSchedule}
          ic={ic}
          createPending={createMut.isPending}
          updatePending={updateMut.isPending}
          uploading={uploading}
          isTranslatingSync={isTranslatingSync}
          setIsTranslatingSync={setIsTranslatingSync}
          setTranslationErrorSync={setTranslationErrorSync}
          onSubmit={handleSubmit}
          onCancel={() => setModalOpen(false)}
          AnimeExtraFields={AnimeExtraFields}
        />
      </AnimeFormDialog>

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

};

export default Anime;
