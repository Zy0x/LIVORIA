import { useMemo, useState } from 'react';

import { isTagihanOverdue } from '../domain/tagihan-cycle';
import type { FilterStatus, SortMode, Tagihan } from '../types/tagihan.types';

export function useTagihanFilters(bills: Tagihan[]) {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [search, setSearch] = useState('');
  const [debiturFilter, setDebiturFilter] = useState<string[]>([]);
  const [showDebiturDD, setShowDebiturDD] = useState(false);
  const [debiturSearch, setDebiturSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('terbaru');
  const [showSortDD, setShowSortDD] = useState(false);
  const [jenisTempo, setJenisTempo] = useState<'all' | 'bulanan' | 'berjangka'>('all');

  const today = new Date();

  const uniqueDebiturs = useMemo(
    () => Array.from(new Set(bills.map((bill) => bill.debitur_nama))).sort(),
    [bills]
  );

  const filteredDebiturs = useMemo(() => {
    if (!debiturSearch.trim()) return uniqueDebiturs;
    return uniqueDebiturs.filter((name) => name.toLowerCase().includes(debiturSearch.toLowerCase()));
  }, [uniqueDebiturs, debiturSearch]);

  const overdueCount = bills.filter((bill) => isTagihanOverdue(bill, today)).length;

  const filtered = useMemo(() => {
    let result = bills.filter((bill) => {
      const statusMatch =
        filter === 'all' || (filter === 'overdue' ? isTagihanOverdue(bill, today) : bill.status === filter);
      const queryMatch =
        bill.debitur_nama.toLowerCase().includes(search.toLowerCase()) ||
        bill.barang_nama.toLowerCase().includes(search.toLowerCase());
      const debiturMatch = debiturFilter.length === 0 || debiturFilter.includes(bill.debitur_nama);
      const jenisMatch = jenisTempo === 'all' || bill.jenis_tempo === jenisTempo;
      return statusMatch && queryMatch && debiturMatch && jenisMatch;
    });

    if (sortMode === 'sisa_terbesar') {
      result = [...result].sort((a, b) => Number(b.sisa_hutang) - Number(a.sisa_hutang));
    }
    if (sortMode === 'jatuh_tempo') {
      result = [...result].sort((a, b) => {
        const aTime = a.tanggal_jatuh_tempo ? new Date(a.tanggal_jatuh_tempo).getTime() : Infinity;
        const bTime = b.tanggal_jatuh_tempo ? new Date(b.tanggal_jatuh_tempo).getTime() : Infinity;
        return aTime - bTime;
      });
    }
    if (sortMode === 'nama_az') {
      result = [...result].sort((a, b) => a.debitur_nama.localeCompare(b.debitur_nama));
    }

    return result;
  }, [bills, filter, search, debiturFilter, jenisTempo, sortMode]);

  const toggleDebitur = (name: string) =>
    setDebiturFilter((prev) => (prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]));

  const activeFilterCount = [
    debiturFilter.length > 0,
    filter !== 'all',
    jenisTempo !== 'all',
    sortMode !== 'terbaru',
  ].filter(Boolean).length;

  return {
    filter,
    search,
    debiturFilter,
    showDebiturDD,
    debiturSearch,
    sortMode,
    showSortDD,
    jenisTempo,
    uniqueDebiturs,
    filteredDebiturs,
    overdueCount,
    filtered,
    activeFilterCount,
    setFilter,
    setSearch,
    setDebiturFilter,
    setShowDebiturDD,
    setDebiturSearch,
    setSortMode,
    setShowSortDD,
    setJenisTempo,
    toggleDebitur,
  };
}

