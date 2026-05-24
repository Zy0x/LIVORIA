import { chainComparators, compareDateDesc, compareTextAsc } from '@/shared/domain/sort-utils';
import type { ObatItem, ObatSortMode } from '../types/obat.types';

export function sortObatItems(items: ObatItem[], sortMode: ObatSortMode): ObatItem[] {
  const byCreatedDesc = (a: ObatItem, b: ObatItem) => compareDateDesc(a.created_at, b.created_at);
  const byName = (a: ObatItem, b: ObatItem) => compareTextAsc(a.name, b.name);
  const result = [...items];

  switch (sortMode) {
    case 'nama_az':
      return result.sort(chainComparators(byName, byCreatedDesc));
    case 'tipe':
      return result.sort(chainComparators((a, b) => compareTextAsc(a.type, b.type), byName, byCreatedDesc));
    case 'terbaru':
    default:
      return result.sort(chainComparators(byCreatedDesc, byName));
  }
}
