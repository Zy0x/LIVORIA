import { useMemo, useState } from 'react';
import type { WaifuItem, WaifuSortMode, WaifuSourceFilter, WaifuTierFilter } from '../types/waifu.types';
import { sortWaifuItems } from '../domain/waifu-sort';

export function useWaifuFilters(waifuList: WaifuItem[]) {
  const [filter, setFilter] = useState<WaifuSourceFilter>('all');
  const [tierFilter, setTierFilter] = useState<WaifuTierFilter>('all');
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<WaifuSortMode>('terbaru');

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    let result = waifuList.filter((waifu) => {
      const matchFilter = filter === 'all' || waifu.source_type === filter;
      const matchSearch = waifu.name.toLowerCase().includes(query) || waifu.source.toLowerCase().includes(query);
      const matchTier = tierFilter === 'all' || waifu.tier === tierFilter;

      return matchFilter && matchSearch && matchTier;
    });

    return sortWaifuItems(result, sortMode);
  }, [waifuList, filter, search, tierFilter, sortMode]);

  const tierStats = useMemo(
    () => ({
      S: waifuList.filter((waifu) => waifu.tier === 'S').length,
      A: waifuList.filter((waifu) => waifu.tier === 'A').length,
      B: waifuList.filter((waifu) => waifu.tier === 'B').length,
      C: waifuList.filter((waifu) => waifu.tier === 'C').length,
    }),
    [waifuList],
  );

  const activeFilterCount = [filter !== 'all', tierFilter !== 'all', sortMode !== 'terbaru'].filter(Boolean).length;

  return {
    filter,
    setFilter,
    tierFilter,
    setTierFilter,
    search,
    setSearch,
    sortMode,
    setSortMode,
    filtered,
    tierStats,
    activeFilterCount,
  };
}
