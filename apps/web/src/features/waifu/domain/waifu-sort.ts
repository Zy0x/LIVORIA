import { chainComparators, compareDateDesc, compareTextAsc } from '@/shared/domain/sort-utils';
import type { WaifuItem, WaifuSortMode } from '../types/waifu.types';

const TIER_ORDER = { S: 0, A: 1, B: 2, C: 3 } as const;

export function sortWaifuItems(items: WaifuItem[], sortMode: WaifuSortMode): WaifuItem[] {
  const byCreatedDesc = (a: WaifuItem, b: WaifuItem) => compareDateDesc(a.created_at, b.created_at);
  const byName = (a: WaifuItem, b: WaifuItem) => compareTextAsc(a.name, b.name);
  const result = [...items];

  switch (sortMode) {
    case 'nama_az':
      return result.sort(chainComparators(byName, byCreatedDesc));
    case 'tier':
      return result.sort(chainComparators((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier], byCreatedDesc, byName));
    case 'terbaru':
    default:
      return result.sort(chainComparators(byCreatedDesc, byName));
  }
}
