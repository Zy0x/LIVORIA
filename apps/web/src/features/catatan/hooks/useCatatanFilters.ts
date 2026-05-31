import { useMemo, useState } from 'react';

import type { CatatanFilterMode, CatatanItem, CatatanSortMode } from '../types/catatan.types';

export function useCatatanFilters(items: CatatanItem[]) {
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<CatatanFilterMode>('all');
  const [sortMode, setSortMode] = useState<CatatanSortMode>('diperbarui');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items
      .filter((item) => {
        if (filterMode === 'pinned' && !item.is_pinned) return false;
        if (filterMode === 'with_tags' && item.tags.length === 0) return false;
        if (!q) return true;
        return [
          item.title,
          item.content,
          item.tags.join(' '),
        ].join(' ').toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
        if (sortMode === 'judul_az') return a.title.localeCompare(b.title);
        if (sortMode === 'terbaru') return Date.parse(b.created_at || '') - Date.parse(a.created_at || '');
        return Date.parse(b.updated_at || '') - Date.parse(a.updated_at || '');
      });
  }, [filterMode, items, search, sortMode]);

  const stats = useMemo(() => ({
    total: items.length,
    pinned: items.filter((item) => item.is_pinned).length,
    tagged: items.filter((item) => item.tags.length > 0).length,
  }), [items]);

  return {
    search,
    setSearch,
    filterMode,
    setFilterMode,
    sortMode,
    setSortMode,
    filtered,
    stats,
  };
}
