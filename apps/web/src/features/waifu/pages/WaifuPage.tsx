import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import { toast } from '@/hooks/use-toast';
import { useBackGesture } from '@/hooks/useBackGesture';
import { shouldLimitMotion } from '@/lib/motion';
import { useFeaturePagination } from '@/shared/hooks/useFeaturePagination';
import { useDeferredListScroll, useScrollToListStart } from '@/shared/hooks/useScrollToListStart';
import { ROUTES } from '@/app/route-paths';
import { WaifuDeleteDialog } from '../components/WaifuDeleteDialog';
import { WaifuFilterBar } from '../components/WaifuFilterBar';
import { WaifuFormDialog } from '../components/WaifuFormDialog';
import { WaifuHeader } from '../components/WaifuHeader';
import { WaifuList } from '../components/WaifuList';
import { WaifuStats } from '../components/WaifuStats';
import { useWaifuFilters } from '../hooks/useWaifuFilters';
import { useWaifuList, useWaifuSourceTitles } from '../hooks/useWaifuList';
import { useWaifuMutations } from '../hooks/useWaifuMutations';
import { useWaifuSourceOptions } from '../hooks/useWaifuSourceOptions';
import { parseWaifuForm } from '../schemas/waifu.schema';
import type { WaifuItem } from '../types/waifu.types';
import { EMPTY_WAIFU_FORM } from '../types/waifu.types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan.';
}

export default function WaifuPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const listStartRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const filterMountRef = useRef(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<WaifuItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<WaifuItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_WAIFU_FORM });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');

  useBackGesture(modalOpen, () => setModalOpen(false), 'waifu-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'waifu-delete');

  const { data: waifuList = [], isLoading } = useWaifuList();
  const { data: sourceTitles = [] } = useWaifuSourceTitles();
  const { createWaifu, updateWaifu, deleteWaifu, importWaifu } = useWaifuMutations();
  const filters = useWaifuFilters(waifuList);
  const sourceOptions = useWaifuSourceOptions(sourceTitles);
  const {
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    paginate,
    getTotalPages,
  } = useFeaturePagination(ROUTES.WAIFU);
  const scrollTargets = useMemo(() => ({ collection: listStartRef }), []);
  const scrollToListStart = useScrollToListStart(scrollTargets);
  const { requestListScroll, flushListScroll } = useDeferredListScroll(scrollToListStart);
  const totalPages = useMemo(
    () => getTotalPages(filters.filtered.length, pageSize),
    [filters.filtered.length, getTotalPages, pageSize],
  );
  const paginatedItems = useMemo(
    () => paginate(filters.filtered, currentPage, pageSize),
    [currentPage, filters.filtered, pageSize, paginate],
  );

  useEffect(() => {
    if (filterMountRef.current) {
      filterMountRef.current = false;
      return;
    }
    if (currentPage !== 1) setCurrentPage(1, true);
  }, [currentPage, filters.filter, filters.search, filters.sortMode, filters.tierFilter, setCurrentPage]);

  useEffect(() => {
    if (!isLoading && totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages, true);
    }
  }, [currentPage, isLoading, setCurrentPage, totalPages]);

  useEffect(() => {
    if (!isLoading) flushListScroll();
  }, [currentPage, pageSize, paginatedItems.length, isLoading, flushListScroll]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (shouldLimitMotion()) return;
    let context: { revert: () => void } | undefined;
    let cancelled = false;

    void import('gsap').then(({ default: gsap }) => {
      if (cancelled || !containerRef.current) return;
      context = gsap.context(() => {
        const cards = containerRef.current?.querySelectorAll('.media-card');
        if (!cards || cards.length === 0) return;

        gsap
          .timeline({ defaults: { ease: 'power3.out', force3D: true } })
          .fromTo(
            cards,
            { opacity: 0, y: 22, rotateX: 5, scale: 0.95 },
            { opacity: 1, y: 0, rotateX: 0, scale: 1, stagger: 0.05, duration: 0.5, ease: 'back.out(1.3)', clearProps: 'all' },
          );
      }, containerRef);
    });

    return () => {
      cancelled = true;
      context?.revert();
    };
  }, [paginatedItems]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_WAIFU_FORM });
    setImageFile(null);
    setImagePreview('');
    sourceOptions.setSourceSearch('');
    setModalOpen(true);
  };

  const openEdit = (item: WaifuItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      source: item.source,
      source_type: item.source_type,
      tier: item.tier,
      image_url: item.image_url || '',
      notes: item.notes || '',
    });
    setImagePreview(item.image_url || '');
    setImageFile(null);
    sourceOptions.setSourceSearch(item.source || '');
    setModalOpen(true);
  };

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseWaifuForm(form);

    if (!parsed.success) {
      toast({ title: 'Error', description: parsed.error.issues[0]?.message ?? 'Data waifu tidak valid.', variant: 'destructive' });
      return;
    }

    if (editItem) {
      updateWaifu.mutate(
        { id: editItem.id, ...parsed.data, imageFile },
        {
          onSuccess: () => {
            setModalOpen(false);
            setImageFile(null);
            setImagePreview('');
            toast({ title: 'Berhasil', description: 'Waifu berhasil diperbarui.' });
          },
          onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
        },
      );
      return;
    }

    createWaifu.mutate(
      { ...parsed.data, imageFile },
      {
        onSuccess: () => {
          setModalOpen(false);
          setImageFile(null);
          setImagePreview('');
          toast({ title: 'Berhasil', description: 'Waifu berhasil ditambahkan.' });
        },
        onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
      },
    );
  };

  const handleImport = async (items: Partial<WaifuItem>[]) => {
    try {
      await importWaifu.mutateAsync(items);
      toast({ title: 'Import Berhasil', description: `${items.length} waifu berhasil diimpor.` });
    } catch (error) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const confirmDelete = () => {
    if (!deleteItem) return;

    deleteWaifu.mutate(deleteItem.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setDeleteItem(null);
        toast({ title: 'Berhasil', description: 'Waifu berhasil dihapus.' });
      },
      onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
    });
  };

  const isPending = createWaifu.isPending || updateWaifu.isPending;
  const isUploading = Boolean(imageFile) && isPending;

  return (
    <div ref={containerRef}>
      <WaifuHeader waifuList={waifuList} onAdd={openAdd} onImport={handleImport} />
      <WaifuStats tierStats={filters.tierStats} tierFilter={filters.tierFilter} onTierFilterChange={filters.setTierFilter} />
      <WaifuFilterBar
        waifuList={waifuList}
        filter={filters.filter}
        setFilter={filters.setFilter}
        tierFilter={filters.tierFilter}
        setTierFilter={filters.setTierFilter}
        search={filters.search}
        setSearch={filters.setSearch}
        sortMode={filters.sortMode}
        setSortMode={filters.setSortMode}
        activeFilterCount={filters.activeFilterCount}
      />
      <div ref={listStartRef} data-list-start-anchor="waifu-list" tabIndex={-1} className="h-px -mt-1 outline-none" />
      <WaifuList
        items={paginatedItems}
        isLoading={isLoading}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(item) => {
          setDeleteItem(item);
          setDeleteOpen(true);
        }}
      />
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalItems={filters.filtered.length}
        onPageChange={(page) => {
          requestListScroll('collection');
          setCurrentPage(page);
        }}
        onPageSizeChange={(size) => {
          requestListScroll('collection');
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      <WaifuFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        editItem={editItem}
        form={form}
        setForm={setForm}
        imageInputRef={imageInputRef}
        imagePreview={imagePreview}
        setImagePreview={setImagePreview}
        setImageFile={setImageFile}
        sourceSearch={sourceOptions.sourceSearch}
        setSourceSearch={sourceOptions.setSourceSearch}
        showSourceDropdown={sourceOptions.showSourceDropdown}
        setShowSourceDropdown={sourceOptions.setShowSourceDropdown}
        filteredSources={sourceOptions.filteredSources}
        isPending={isPending}
        isUploading={isUploading}
        onImageSelect={handleImageSelect}
        onSubmit={handleSubmit}
      />
      <WaifuDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deleteItem={deleteItem}
        isPending={deleteWaifu.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
