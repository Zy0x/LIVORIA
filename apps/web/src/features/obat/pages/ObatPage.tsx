import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pagination } from '@/components/shared/Pagination';
import { toast } from '@/hooks/use-toast';
import { useBackGesture } from '@/hooks/useBackGesture';
import { shouldLimitMotion } from '@/lib/motion';
import { useFeaturePagination } from '@/shared/hooks/useFeaturePagination';
import { useDeferredListScroll, useScrollToListStart } from '@/shared/hooks/useScrollToListStart';
import { ROUTES } from '@/app/route-paths';
import { ObatDeleteDialog } from '../components/ObatDeleteDialog';
import { ObatDetailDialog } from '../components/ObatDetailDialog';
import { ObatFilterBar } from '../components/ObatFilterBar';
import { ObatFormDialog } from '../components/ObatFormDialog';
import { ObatHeader } from '../components/ObatHeader';
import { ObatList } from '../components/ObatList';
import { ObatStats } from '../components/ObatStats';
import { useObatFilters } from '../hooks/useObatFilters';
import { useObatList } from '../hooks/useObatList';
import { useObatMutations } from '../hooks/useObatMutations';
import { parseObatForm } from '../schemas/obat.schema';
import type { ObatItem } from '../types/obat.types';
import { EMPTY_OBAT_FORM } from '../types/obat.types';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Terjadi kesalahan.';
}

export default function ObatPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const listStartRef = useRef<HTMLDivElement>(null);
  const filterMountRef = useRef(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editItem, setEditItem] = useState<ObatItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<ObatItem | null>(null);
  const [detailItem, setDetailItem] = useState<ObatItem | null>(null);
  const [form, setForm] = useState({ ...EMPTY_OBAT_FORM });

  useBackGesture(modalOpen, () => setModalOpen(false), 'obat-form');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'obat-delete');
  useBackGesture(detailOpen, () => setDetailOpen(false), 'obat-detail');

  const { data: obatList = [], isLoading } = useObatList();
  const { createObat, updateObat, deleteObat, importObat } = useObatMutations();
  const filters = useObatFilters(obatList);
  const {
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    paginate,
    getTotalPages,
  } = useFeaturePagination(ROUTES.OBAT);
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
  }, [currentPage, filters.freqFilter, filters.search, filters.sortMode, filters.typeFilter, setCurrentPage]);

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
        const cards = containerRef.current?.querySelectorAll('.obat-card');
        if (!cards || cards.length === 0) return;

        gsap
          .timeline({ defaults: { ease: 'power3.out', force3D: true } })
          .fromTo(
            cards,
            { opacity: 0, y: 22, rotateX: 4, scale: 0.96 },
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
    setForm({ ...EMPTY_OBAT_FORM });
    setModalOpen(true);
  };

  const openEdit = (item: ObatItem) => {
    setEditItem(item);
    setForm({
      name: item.name,
      type: item.type,
      dosage: item.dosage,
      usage_info: item.usage_info,
      notes: item.notes || '',
      frequency: item.frequency,
      side_effects: item.side_effects || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = parseObatForm(form);

    if (!parsed.success) {
      toast({ title: 'Error', description: parsed.error.issues[0]?.message ?? 'Data obat tidak valid.', variant: 'destructive' });
      return;
    }

    if (editItem) {
      updateObat.mutate(
        { id: editItem.id, ...parsed.data },
        {
          onSuccess: () => {
            setModalOpen(false);
            toast({ title: 'Berhasil', description: 'Obat berhasil diperbarui.' });
          },
          onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
        },
      );
      return;
    }

    createObat.mutate(parsed.data, {
      onSuccess: () => {
        setModalOpen(false);
        toast({ title: 'Berhasil', description: 'Obat berhasil ditambahkan.' });
      },
      onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
    });
  };

  const handleImport = async (items: Partial<ObatItem>[]) => {
    try {
      await importObat.mutateAsync(items);
      toast({ title: 'Import Berhasil', description: `${items.length} obat berhasil diimpor.` });
    } catch (error) {
      toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
    }
  };

  const confirmDelete = () => {
    if (!deleteItem) return;

    deleteObat.mutate(deleteItem.id, {
      onSuccess: () => {
        setDeleteOpen(false);
        setDeleteItem(null);
        toast({ title: 'Berhasil', description: 'Obat berhasil dihapus.' });
      },
      onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
    });
  };

  return (
    <div ref={containerRef}>
      <ObatHeader obatList={obatList} onAdd={openAdd} onImport={handleImport} />
      <ObatStats obatList={obatList} />
      <ObatFilterBar
        obatList={obatList}
        search={filters.search}
        setSearch={filters.setSearch}
        typeFilter={filters.typeFilter}
        setTypeFilter={filters.setTypeFilter}
        freqFilter={filters.freqFilter}
        setFreqFilter={filters.setFreqFilter}
        sortMode={filters.sortMode}
        setSortMode={filters.setSortMode}
        uniqueTypes={filters.uniqueTypes}
        activeFilterCount={filters.activeFilterCount}
      />
      <div ref={listStartRef} data-list-start-anchor="obat-list" tabIndex={-1} className="h-px -mt-1 outline-none" />
      <ObatList
        items={paginatedItems}
        isLoading={isLoading}
        onAdd={openAdd}
        onDetail={(item) => {
          setDetailItem(item);
          setDetailOpen(true);
        }}
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

      <ObatDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        detailItem={detailItem}
        onEdit={(item) => {
          setDetailOpen(false);
          openEdit(item);
        }}
        onDelete={(item) => {
          setDetailOpen(false);
          setDeleteItem(item);
          setDeleteOpen(true);
        }}
      />
      <ObatFormDialog
        open={modalOpen}
        onOpenChange={setModalOpen}
        editItem={editItem}
        form={form}
        setForm={setForm}
        isPending={createObat.isPending || updateObat.isPending}
        onSubmit={handleSubmit}
      />
      <ObatDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deleteItem={deleteItem}
        isPending={deleteObat.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
