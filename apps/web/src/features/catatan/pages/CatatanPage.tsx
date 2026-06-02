import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { ROUTES } from '@/app/route-paths';
import { Pagination } from '@/components/shared/Pagination';
import { useBackGesture } from '@/hooks/useBackGesture';
import { toast } from '@/hooks/use-toast';
import { useCardEntrance } from '@/features/media/hooks/useCardEntrance';
import { useGsapCardHover } from '@/features/media/hooks/useGsapCardHover';
import { useMobileListRenderGate } from '@/features/media/hooks/useMobileListRenderGate';
import { useFeaturePagination } from '@/shared/hooks/useFeaturePagination';
import { useDeferredListScroll, useScrollToListStart } from '@/shared/hooks/useScrollToListStart';
import { CatatanDeleteDialog } from '../components/CatatanDeleteDialog';
import { CatatanFilterBar } from '../components/CatatanFilterBar';
import { CatatanFormDialog } from '../components/CatatanFormDialog';
import { CatatanHeader } from '../components/CatatanHeader';
import { CatatanList } from '../components/CatatanList';
import { CatatanStats } from '../components/CatatanStats';
import { useCatatanFilters } from '../hooks/useCatatanFilters';
import { useCatatanList } from '../hooks/useCatatanList';
import { useCatatanMutations } from '../hooks/useCatatanMutations';
import { useCatatanRelatedOptions } from '../hooks/useCatatanRelatedOptions';
import { parseCatatanForm } from '../schemas/catatan.schema';
import { getCatatanDraftKey, supabaseCatatanDraftRepository } from '../services/catatan-draft.repository';
import { promoteCatatanDraftAssets } from '../services/catatan-asset.repository';
import type { CatatanFormValues, CatatanInput, CatatanItem, CatatanRelatedOption } from '../types/catatan.types';
import { EMPTY_CATATAN_FORM } from '../types/catatan.types';

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'Terjadi kesalahan.';

const toFormValues = (item: CatatanItem): CatatanFormValues => ({
  title: item.title,
  content: item.content,
  content_doc: item.content_doc ?? EMPTY_CATATAN_FORM.content_doc,
  tagsText: item.tags.join(', '),
  color: item.color,
  is_pinned: item.is_pinned,
  related_type: item.related_type ?? 'none',
  related_id: item.related_id ?? '',
});

const withRelatedTitle = (input: CatatanInput, options: CatatanRelatedOption[], editItem: CatatanItem | null) => {
  if (!input.related_type || !input.related_id) {
    return { ...input, related_type: null, related_id: null, related_title: null };
  }

  const selected = options.find((option) => option.type === input.related_type && option.id === input.related_id);
  const fallbackTitle =
    editItem?.related_type === input.related_type && editItem.related_id === input.related_id
      ? editItem.related_title
      : null;

  return {
    ...input,
    related_title: selected?.title || fallbackTitle || null,
  };
};

const clearSavedDraft = async (itemId: string | null) => {
  const draftKey = getCatatanDraftKey(itemId);
  window.dispatchEvent(new CustomEvent('livoria:catatan-draft-clear', { detail: { draftKey } }));
  try {
    await supabaseCatatanDraftRepository.remove(draftKey);
  } catch {
    // Draft cleanup is best-effort; saved catatan remains authoritative.
  }
};

export default function CatatanPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const listStartRef = useRef<HTMLDivElement>(null);
  const filterMountRef = useRef(true);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState<CatatanItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<CatatanItem | null>(null);
  const [form, setForm] = useState<CatatanFormValues>({ ...EMPTY_CATATAN_FORM });

  useBackGesture(formOpen, () => setFormOpen(false), 'catatan-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'catatan-delete');

  const { data: items = [], isLoading } = useCatatanList();
  const { data: relatedOptions = [], isLoading: relatedOptionsLoading } = useCatatanRelatedOptions();
  const { createCatatan, updateCatatan, deleteCatatan, importCatatan } = useCatatanMutations();
  const filters = useCatatanFilters(items);
  const { pageSize, setPageSize, currentPage, setCurrentPage, paginate, getTotalPages } = useFeaturePagination(ROUTES.CATATAN);
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
  }, [currentPage, filters.filterMode, filters.search, filters.sortMode, setCurrentPage]);

  useEffect(() => {
    if (!isLoading && totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages, true);
    }
  }, [currentPage, isLoading, setCurrentPage, totalPages]);

  const cardAnimationKey = useMemo(
    () => [currentPage, pageSize, paginatedItems.map((item) => item.id).join('|')].join(':'),
    [currentPage, pageSize, paginatedItems],
  );
  const mobileListReady = useMobileListRenderGate(cardAnimationKey, isLoading);
  const showRenderSkeleton = isLoading || !mobileListReady;

  useEffect(() => {
    if (!showRenderSkeleton) flushListScroll();
  }, [currentPage, flushListScroll, pageSize, paginatedItems.length, showRenderSkeleton]);

  useCardEntrance(containerRef, cardAnimationKey, {
    selector: '.catatan-card',
    disabled: showRenderSkeleton,
    duration: 0.45,
    stagger: 0.04,
    ease: 'power2.out',
  });
  useGsapCardHover(containerRef, cardAnimationKey, {
    selector: '.catatan-card',
    disabled: showRenderSkeleton,
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...EMPTY_CATATAN_FORM });
    setFormOpen(true);
  };

  const openEdit = (item: CatatanItem) => {
    setEditItem(item);
    setForm(toFormValues(item));
    setFormOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseCatatanForm(form);

    if (parsed.success === false) {
      toast({
        title: 'Catatan tidak valid',
        description: parsed.error.issues[0]?.message ?? 'Periksa kembali catatan.',
        variant: 'destructive',
      });
      return;
    }

    const input = withRelatedTitle(parsed.data, relatedOptions, editItem);

    if (editItem) {
      updateCatatan.mutate(
        { id: editItem.id, ...input },
        {
          onSuccess: () => {
            void clearSavedDraft(editItem.id);
            setFormOpen(false);
            toast({ title: 'Berhasil', description: 'Catatan berhasil diperbarui.' });
          },
          onError: (error) => toast({ title: 'Gagal', description: getErrorMessage(error), variant: 'destructive' }),
        },
      );
      return;
    }

    createCatatan.mutate(input, {
      onSuccess: (created) => {
        void promoteCatatanDraftAssets(getCatatanDraftKey(null), created.id);
        void clearSavedDraft(null);
        setFormOpen(false);
        toast({ title: 'Berhasil', description: 'Catatan berhasil ditambahkan.' });
      },
      onError: (error) => toast({ title: 'Gagal', description: getErrorMessage(error), variant: 'destructive' }),
    });
  };

  const handleImport = async (rows: Partial<CatatanItem>[]) => {
    try {
      await importCatatan.mutateAsync(rows);
      toast({ title: 'Import Berhasil', description: `${rows.length} catatan berhasil diimpor.` });
    } catch (error) {
      toast({ title: 'Import Gagal', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const confirmDelete = () => {
    if (!deleteItem) return;
    deleteCatatan.mutate(deleteItem.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setDeleteItem(null);
        toast({ title: 'Berhasil', description: 'Catatan berhasil dihapus.' });
      },
      onError: (error) => toast({ title: 'Gagal', description: getErrorMessage(error), variant: 'destructive' }),
    });
  };

  return (
    <div ref={containerRef}>
      <CatatanHeader items={items} onAdd={openAdd} onImport={handleImport} />
      <CatatanStats {...filters.stats} />
      <CatatanFilterBar
        search={filters.search}
        onSearchChange={filters.setSearch}
        filterMode={filters.filterMode}
        onFilterModeChange={filters.setFilterMode}
        sortMode={filters.sortMode}
        onSortModeChange={filters.setSortMode}
        total={filters.stats.total}
        pinned={filters.stats.pinned}
        tagged={filters.stats.tagged}
        linked={filters.stats.linked}
      />
      <div ref={listStartRef} data-list-start-anchor="catatan-list" tabIndex={-1} className="h-px -mt-1 outline-none" />
      <CatatanList
        items={paginatedItems}
        isLoading={showRenderSkeleton}
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

      <CatatanFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editItem={editItem}
        form={form}
        setForm={setForm}
        relatedOptions={relatedOptions}
        relatedOptionsLoading={relatedOptionsLoading}
        isPending={createCatatan.isPending || updateCatatan.isPending}
        onSubmit={handleSubmit}
      />
      <CatatanDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={deleteItem}
        isPending={deleteCatatan.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
