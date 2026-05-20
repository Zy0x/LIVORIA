import { useMemo, useState } from 'react';
import type { ObatFrequencyFilter, ObatItem, ObatSortMode } from '../types/obat.types';

export function useObatFilters(obatList: ObatItem[]) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [freqFilter, setFreqFilter] = useState<ObatFrequencyFilter>('all');
  const [sortMode, setSortMode] = useState<ObatSortMode>('terbaru');

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    let result = obatList.filter((obat) => {
      const matchSearch =
        obat.name.toLowerCase().includes(query) ||
        obat.type.toLowerCase().includes(query) ||
        obat.usage_info.toLowerCase().includes(query);
      const matchType = typeFilter === 'all' || obat.type === typeFilter;
      const matchFreq =
        freqFilter === 'all' ||
        (freqFilter === 'rutin' && obat.frequency.includes('sehari')) ||
        (freqFilter === 'lainnya' && !obat.frequency.includes('sehari'));

      return matchSearch && matchType && matchFreq;
    });

    switch (sortMode) {
      case 'nama_az':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'tipe':
        result = [...result].sort((a, b) => a.type.localeCompare(b.type));
        break;
    }

    return result;
  }, [obatList, search, typeFilter, freqFilter, sortMode]);

  const uniqueTypes = useMemo(() => Array.from(new Set(obatList.map((obat) => obat.type))), [obatList]);

  const activeFilterCount = [typeFilter !== 'all', freqFilter !== 'all', sortMode !== 'terbaru'].filter(Boolean).length;

  return {
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    freqFilter,
    setFreqFilter,
    sortMode,
    setSortMode,
    filtered,
    uniqueTypes,
    activeFilterCount,
  };
}
