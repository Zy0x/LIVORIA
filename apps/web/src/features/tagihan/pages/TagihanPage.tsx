import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';

import { useBackGesture } from '@/hooks/useBackGesture';
import { toast } from '@/hooks/use-toast';
import { isMobile } from '@/lib/motion';
import { QUERY_KEYS } from '@/app/query-keys';

import TagihanCalculator from '../components/TagihanCalculator';
import TagihanDeleteDialog from '../components/TagihanDeleteDialog';
import TagihanDetailDialog from '../components/TagihanDetailDialog';
import TagihanFilterBar from '../components/TagihanFilterBar';
import TagihanFormDialog from '../components/TagihanFormDialog';
import TagihanHeader from '../components/TagihanHeader';
import TagihanList from '../components/TagihanList';
import TagihanQuickPayDialog from '../components/TagihanQuickPayDialog';
import TagihanStats from '../components/TagihanStats';
import TagihanTabs from '../components/TagihanTabs';
import { useQuickPay } from '../hooks/useQuickPay';
import { useTagihanFilters } from '../hooks/useTagihanFilters';
import { useTagihanList } from '../hooks/useTagihanList';
import { useTagihanMutations } from '../hooks/useTagihanMutations';
import type { SubPage, Tagihan } from '../types/tagihan.types';

const TagihanLaporan = lazy(() => import('../components/TagihanLaporan'));

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

interface TagihanRouteState {
  viewItem?: Tagihan;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Terjadi kesalahan.';
}

export default function TagihanPage() {
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { data: bills = [], isLoading } = useTagihanList();
  const filters = useTagihanFilters(bills);
  const quickPay = useQuickPay();
  const { createTagihan, updateTagihan, deleteTagihan } = useTagihanMutations();

  const [subPage, setSubPage] = useState<SubPage>('tagihan');
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<Tagihan | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState<Tagihan | null>(null);
  const [viewItem, setViewItem] = useState<Tagihan | null>(null);

  useBackGesture(formOpen, () => setFormOpen(false), 'tagihan-form');
  useBackGesture(!!viewItem, () => setViewItem(null), 'tagihan-detail');
  useBackGesture(deleteOpen, () => setDeleteOpen(false), 'tagihan-delete');
  useBackGesture(!!quickPay.item, () => quickPay.close(), 'tagihan-quickpay');

  useEffect(() => {
    if (!viewItem || !bills.length) return;
    const updated = bills.find((bill) => bill.id === viewItem.id);
    if (updated && JSON.stringify(updated) !== JSON.stringify(viewItem)) setViewItem(updated);
  }, [bills, viewItem]);

  useEffect(() => {
    const state = location.state as TagihanRouteState | null;
    if (state?.viewItem) {
      const fresh = bills.find((bill) => bill.id === state.viewItem.id) || state.viewItem;
      setViewItem(fresh);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, bills]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (isMobile()) {
      gsap.fromTo(containerRef.current, { opacity: 0 }, { opacity: 1, duration: 0.25, ease: 'power2.out' });
      return;
    }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });
      tl.fromTo(containerRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, clearProps: 'all' });
      const cards = containerRef.current?.querySelectorAll('.kpi-card, .stat-card, .analytics-card');
      if (cards?.length) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 16, scale: 0.95 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.3)', clearProps: 'all' },
          '-=0.25'
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const openCreateForm = () => {
    setEditItem(null);
    setFormOpen(true);
  };

  const handleFormSubmit = (data: Partial<Tagihan>, files?: File[]) => {
    if (editItem) {
      updateTagihan.mutate({ id: editItem.id, ...data }, {
        onSuccess: (updated) => {
          setFormOpen(false);
          setEditItem(null);
          if (viewItem?.id === updated.id) setViewItem(updated);
          toast({ title: 'Berhasil', description: 'Tagihan berhasil diperbarui.' });
        },
        onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
      });
      return;
    }

    createTagihan.mutate({ data, files }, {
      onSuccess: () => {
        setFormOpen(false);
        toast({ title: 'Berhasil', description: 'Tagihan berhasil ditambahkan.' });
      },
      onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
    });
  };

  const handleDelete = () => {
    if (!deleteItem) return;
    deleteTagihan.mutate(deleteItem.id, {
      onSuccess: (_, id) => {
        setDeleteOpen(false);
        setDeleteItem(null);
        if (viewItem?.id === id) setViewItem(null);
        toast({ title: 'Berhasil', description: 'Tagihan berhasil dihapus.' });
      },
      onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
    });
  };

  const handleEditFromDetail = useCallback((item: Tagihan) => {
    setEditItem(item);
    setFormOpen(true);
  }, []);

  const handleDeleteFromDetail = useCallback((item: Tagihan) => {
    setDeleteItem(item);
    setDeleteOpen(true);
  }, []);

  const inputClass =
    'w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';

  if (viewItem) {
    const latestItem = bills.find((bill) => bill.id === viewItem.id) || viewItem;
    return (
      <div ref={containerRef}>
        <TagihanDetailDialog
          item={latestItem}
          onBack={() => setViewItem(null)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN })}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteFromDetail}
        />
        <TagihanFormDialog
          open={formOpen}
          onOpenChange={(open) => { setFormOpen(open); if (!open) setEditItem(null); }}
          editItem={editItem}
          onSubmit={handleFormSubmit}
          isPending={updateTagihan.isPending}
        />
        <TagihanDeleteDialog
          open={deleteOpen}
          item={deleteItem}
          isPending={deleteTagihan.isPending}
          detailCopy
          onOpenChange={setDeleteOpen}
          onConfirm={handleDelete}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-5">
      <TagihanHeader
        data={bills}
        onImportDone={() => queryClient.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN })}
        onAdd={openCreateForm}
      />

      <TagihanStats data={bills} />
      <TagihanTabs active={subPage} onChange={setSubPage} />

      {subPage === 'laporan' && (
        <Suspense fallback={<div className="stat-card h-64 animate-pulse" />}>
          <TagihanLaporan data={bills} onView={(item: Tagihan) => setViewItem(item)} />
        </Suspense>
      )}

      {subPage === 'kalkulator' && (
        <TagihanCalculator open={true} onOpenChange={() => setSubPage('tagihan')} allTagihan={bills} />
      )}

      {subPage === 'tagihan' && (
        <div className="space-y-4">
          <TagihanFilterBar
            bills={bills}
            inputClass={inputClass}
            search={filters.search}
            filter={filters.filter}
            debiturFilter={filters.debiturFilter}
            showDebiturDD={filters.showDebiturDD}
            debiturSearch={filters.debiturSearch}
            sortMode={filters.sortMode}
            showSortDD={filters.showSortDD}
            jenisTempo={filters.jenisTempo}
            uniqueDebiturs={filters.uniqueDebiturs}
            filteredDebiturs={filters.filteredDebiturs}
            overdueCount={filters.overdueCount}
            activeFilterCount={filters.activeFilterCount}
            setSearch={filters.setSearch}
            setFilter={filters.setFilter}
            setShowDebiturDD={filters.setShowDebiturDD}
            setDebiturSearch={filters.setDebiturSearch}
            setDebiturFilter={filters.setDebiturFilter}
            setSortMode={filters.setSortMode}
            setShowSortDD={filters.setShowSortDD}
            setJenisTempo={filters.setJenisTempo}
            toggleDebitur={filters.toggleDebitur}
          />

          <TagihanList
            data={filters.filtered}
            isLoading={isLoading}
            onEdit={(item: Tagihan) => { setEditItem(item); setFormOpen(true); }}
            onDelete={(item: Tagihan) => { setDeleteItem(item); setDeleteOpen(true); }}
            onView={(item: Tagihan) => setViewItem(item)}
            onAdd={openCreateForm}
            onQuickPay={(item: Tagihan) => quickPay.open(item)}
          />
        </div>
      )}

      <TagihanFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditItem(null); }}
        editItem={editItem}
        onSubmit={handleFormSubmit}
        isPending={createTagihan.isPending || updateTagihan.isPending}
      />

      <TagihanQuickPayDialog
        item={quickPay.item}
        amount={quickPay.amount}
        date={quickPay.date}
        note={quickPay.note}
        payFull={quickPay.payFull}
        isPending={quickPay.mutation.isPending}
        inputClass={inputClass}
        onAmountChange={quickPay.setAmount}
        onDateChange={quickPay.setDate}
        onNoteChange={quickPay.setNote}
        onPayFullChange={quickPay.setPayFull}
        onClose={quickPay.close}
        onSubmit={() => {
          const paidAmount = quickPay.amount;
          quickPay.submit({
            onSuccess: () => toast({ title: 'Pembayaran Dicatat', description: `${fmt(paidAmount)} berhasil dicatat.` }),
            onError: (error) => toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' }),
          });
        }}
      />

      <TagihanDeleteDialog
        open={deleteOpen}
        item={deleteItem}
        isPending={deleteTagihan.isPending}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}
