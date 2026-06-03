import type { PageSize } from '@/components/shared/Pagination';

function pageSizeValue(size: PageSize, totalItems: number) {
  return size === 'semua' ? totalItems : size;
}

export function isPageSizeGrowth(currentSize: PageSize, nextSize: PageSize, totalItems: number) {
  return pageSizeValue(nextSize, totalItems) > pageSizeValue(currentSize, totalItems);
}
