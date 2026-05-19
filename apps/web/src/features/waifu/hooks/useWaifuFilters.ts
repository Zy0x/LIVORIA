import { useMemo, useState } from 'react';
import type { WaifuItem, WaifuSortMode, WaifuSourceFilter, WaifuTierFilter } from '../types/waifu.types';

const TIER_ORDER = { S: 0, A: 1, B: 2, C: 3 } as const;

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

    switch (sortMode) {
      case 'nama_az':
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'tier':
        result = [...result].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);
        break;
    }

    return result;
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
