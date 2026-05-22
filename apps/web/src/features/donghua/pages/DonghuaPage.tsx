import { useEffect, useRef, useState, useMemo, useCallback, Suspense, lazy } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import { dur } from '@/lib/motion';
import {
  Plus, ImageIcon, Layers, Star,
  ExternalLink, Copy, Eye, Edit2,
  Trash2, Clock,
  Bookmark, Heart, ChevronLeft, ChevronRight,
  CalendarClock, Building2, Film, BookmarkPlus, CheckCircle, PlayCircle,
  Bookmark as BookmarkIcon, Minus,
} from 'lucide-react';
import { openExternalUrl } from '@/lib/external';
import type { DonghuaItem } from '@/lib/types';
import { DONGHUA_GENRES, DAYS_OF_WEEK } from '@/lib/genres';
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
import { useScrollToListStart } from '@/shared/hooks/useScrollToListStart';
import { useMediaPageEntrance } from '@/features/media/hooks/useMediaPageEntrance';
import { logger } from '@/lib/logger';
import { useDonghuaFilters } from '@/features/donghua/hooks/useDonghuaFilters';
import { useDonghuaList, DONGHUA_QUERY_KEY } from '@/features/donghua/hooks/useDonghuaList';
import { useDonghuaMutations } from '@/features/donghua/hooks/useDonghuaMutations';
import { useDonghuaPagination } from '@/features/donghua/hooks/useDonghuaPagination';
import { useDonghuaWatchlist } from '@/features/donghua/hooks/useDonghuaWatchlist';
import { getDonghuaWatchStatus } from '@/features/donghua/domain/watch-status';
import { DonghuaBulkImportDialog } from '@/features/donghua/components/DonghuaBulkImportDialog';
import { DonghuaDeleteDialog } from '@/features/donghua/components/DonghuaDeleteDialog';
import { DonghuaDetailDialog } from '@/features/donghua/components/DonghuaDetailDialog';
import { DonghuaFilterBar } from '@/features/donghua/components/DonghuaFilterBar';
import { DonghuaFormDialog } from '@/features/donghua/components/DonghuaFormDialog';
import { DonghuaGrid } from '@/features/donghua/components/DonghuaGrid';
import { DonghuaHeader } from '@/features/donghua/components/DonghuaHeader';
import { DonghuaList } from '@/features/donghua/components/DonghuaList';
import { DonghuaToolbar } from '@/features/donghua/components/DonghuaToolbar';
import { DonghuaWatchlist } from '@/features/donghua/components/DonghuaWatchlist';
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
} from '@/features/donghua/components/DonghuaCard';
// ─── Types ─────────────────────────────────────────────────────────────────────
type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';
type ViewMode = 'grid' | 'list';
type PageTab = 'semua' | 'watchlist';
type PendingDonghuaSubmitData = Partial<DonghuaItem>;
// ─── Helpers ─────────────────────────────────────────────────────────────────
const Donghua = () => {
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
  const [stackDetailItems, setStackDetailItems] = useState<DonghuaItem[]>([]);
  const [stackDetailInitIdx, setStackDetailInitIdx] = useState(0);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<DonghuaItem | null>(null);
  const [editItem, setEditItem] = useState<DonghuaItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<DonghuaItem | null>(null);
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
  const [duplicateConflicts, setDuplicateConflicts] = useState<DonghuaItem[]>([]);
  const [pendingSubmitData, setPendingSubmitData] = useState<PendingDonghuaSubmitData | null>(null);
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
  const { currentLang, setLang: setTitleLang } = useTitleLanguage('donghua');
  useBackGesture(modalOpen, () => setModalOpen(false), 'donghua-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'donghua-delete');
  useBackGesture(stackDetailOpen, () => setStackDetailOpen(false), 'donghua-stack-detail');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'donghua-detail');
  // useWatchedAutoRemove dipasang di App.tsx (GlobalEffects) — tidak perlu di sini lagi
  const { data: donghuaList = [], isLoading } = useDonghuaList();
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
  } = useDonghuaPagination();
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
  } = useDonghuaFilters(donghuaList, currentLang);
  const {
    watchlistFilter,
    setWatchlistFilter,
    watchlistItems,
    watchlistFiltered,
    stats,
  } = useDonghuaWatchlist(donghuaList);
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
  } = useDonghuaMutations({
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

  useMediaPageEntrance(containerRef, 'donghua', isLoading);

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

  const toggleGroupSelection = useCallback((donghua: DonghuaItem) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      const group = groupMap[donghua.id] || [donghua];
      const isSelected = next.has(donghua.id);
      group.forEach(it => isSelected ? next.delete(it.id) : next.add(it.id));
      return next;
    });
  }, [groupMap]);

  const handleUpdateWatchStatus = useCallback((item: DonghuaItem, newStatus: WatchStatus) => {
    updateWatchStatusMut.mutate({ item, newStatus });
  }, [updateWatchStatusMut]);

  const handleUpdateEpisode = useCallback((item: DonghuaItem, watched: number, total?: number) => {
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

  const openEdit = (item: DonghuaItem) => {
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

  const openDetail = (item: DonghuaItem) => { setDetailItem(item); setDetailOpen(true); };

  const openStackDetail = (representativeId: string, clickedItem?: DonghuaItem) => {
    const items = groupMap[representativeId];
    if (!items) return;
    const initIdx = clickedItem ? items.findIndex(it => it.id === clickedItem.id) : items.length - 1;
    setStackDetailItems(items);
    setStackDetailInitIdx(Math.max(0, initIdx));
    setStackDetailOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data: PendingDonghuaSubmitData = {
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
    donghuaList.filter(a => !a.is_movie).forEach(a => keys.add((a.parent_title || a.title).trim()));
    if (editItem) keys.delete(editItem.title.trim());
    return Array.from(keys).sort();
  }, [donghuaList, editItem]);

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

      <DonghuaHeader
        donghuaList={donghuaList}
        stats={stats}
        watchlistCount={watchlistItems.length}
        currentLang={currentLang}
        onLangChange={setTitleLang}
        onOpenBulkImport={() => setBulkImportOpen(true)}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: DONGHUA_QUERY_KEY })}
        onAdd={openAdd}
      />

      <DonghuaToolbar
        pageTab={pageTab}
        watchlistCount={watchlistItems.length}
        onPageTabChange={setPageTab}
      />

      {pageTab === 'watchlist' && (
        <DonghuaWatchlist
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

      {pageTab === 'semua' && (
        <>
          <DonghuaFilterBar
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

          <div ref={collectionStartRef} className="h-px -mt-1" aria-hidden="true" />
          {isLoading ? (
            <AnimeGridSkeleton count={pageSize === 'semua' ? 18 : Math.min(pageSize as number, 18)} />
          ) : viewMode === 'grid' ? (
            <DonghuaGrid
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
              onViewStack={(donghua) => openStackDetail(donghua.id)}
              onToggleFavorite={(donghua) => toggleFavoriteMut.mutate(donghua)}
              onToggleBookmark={(donghua) => toggleBookmarkMut.mutate(donghua)}
              onUpdateWatchStatus={handleUpdateWatchStatus}
              onPageChange={(p) => { setCurrentPage(p); scrollToListStart('collection'); }}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); scrollToListStart('collection'); }}
            />
          ) : (
            <DonghuaList
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
              onViewStack={(donghua) => openStackDetail(donghua.id)}
              onToggleFavorite={(donghua) => toggleFavoriteMut.mutate(donghua)}
              onToggleBookmark={(donghua) => toggleBookmarkMut.mutate(donghua)}
              onUpdateWatchStatus={handleUpdateWatchStatus}
              onPageChange={(p) => { setCurrentPage(p); scrollToListStart('collection'); }}
              onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); scrollToListStart('collection'); }}
            />
          )}
        </>
      )}

      <MediaStackDetailModal
        open={stackDetailOpen}
        onOpenChange={(v) => { if (!coverLightbox) setStackDetailOpen(v); }}
        items={stackDetailItems}
        initialIndex={stackDetailInitIdx}
        mediaType="donghua"
        movieBadgeLabel="FILM"
        tableName="donghua"
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

      <DonghuaDetailDialog open={detailOpen} onOpenChange={(v) => { if (!coverLightbox) setDetailOpen(v); }}>
        <MediaDetailDialogContent
          item={detailItem}
          items={donghuaList}
          mediaType="donghua"
          tableName="donghua"
          queryKey={DONGHUA_QUERY_KEY}
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
      </DonghuaDetailDialog>

      <DonghuaFormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <MediaFormDialogContent
          mediaType="donghua"
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
          genreOptions={DONGHUA_GENRES}
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
      </DonghuaFormDialog>

      <DonghuaDeleteDialog
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

      <DonghuaBulkImportDialog
        open={bulkImportOpen}
        onOpenChange={setBulkImportOpen}
        onImportComplete={() => queryClient.invalidateQueries({ queryKey: DONGHUA_QUERY_KEY })}
      />

      <Suspense fallback={<LoadingState label="Memuat pemeriksaan duplikat..." />}>
        <DuplicateConfirmationModal
        open={duplicateModalOpen}
        onOpenChange={setDuplicateModalOpen}
        onConfirm={handleConfirmDuplicate}
        onCancel={() => { setDuplicateModalOpen(false); setPendingSubmitData(null); }}
        newItem={pendingSubmitData || {}}
        existingItems={duplicateConflicts}
        mediaType="donghua"
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

export default Donghua;
