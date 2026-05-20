import { useMemo, useState } from 'react';
import type { WaifuSourceTitle } from '../types/waifu.types';

export function useWaifuSourceOptions(sourceTitles: WaifuSourceTitle[]) {
  const [sourceSearch, setSourceSearch] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);

  const filteredSources = useMemo(() => {
    if (!sourceSearch.trim()) return sourceTitles;
    const query = sourceSearch.toLowerCase();
    return sourceTitles.filter((source) => source.title.toLowerCase().includes(query));
  }, [sourceTitles, sourceSearch]);

  return {
    sourceSearch,
    setSourceSearch,
    showSourceDropdown,
    setShowSourceDropdown,
    filteredSources,
  };
}
