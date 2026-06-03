import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PageSize } from '@/components/shared/Pagination';
import { runAfterPaginationFeedback } from './useScrollToListStart';

export function useFeaturePagination(basePath: `/${string}`, defaultPageSize: PageSize = 20) {
  const navigate = useNavigate();
  const location = useLocation();
  const { pageParam } = useParams<{ pageParam?: string }>();
  const pageSize = useMemo(() => parsePageSize(new URLSearchParams(location.search).get('size')) ?? defaultPageSize, [defaultPageSize, location.search]);

  const currentPage = useMemo(() => {
    if (!pageParam || !pageParam.startsWith('page=')) return 1;
    const page = Number.parseInt(pageParam.split('=')[1], 10);
    return Number.isNaN(page) ? 1 : Math.max(1, page);
  }, [pageParam]);

  const setCurrentPage = useCallback((page: number, replace = false) => {
    const safePage = Math.max(1, Math.floor(page));
    const search = location.search || '';
    const target = safePage === 1 ? `${basePath}${search}` : `${basePath}/page=${safePage}${search}`;
    runAfterPaginationFeedback(() => navigate(target, { replace }));
  }, [basePath, location.search, navigate]);

  const setPageSize = useCallback((size: PageSize) => {
    const params = new URLSearchParams(location.search);
    if (size === defaultPageSize) {
      params.delete('size');
    } else {
      params.set('size', String(size));
    }
    const search = params.toString();
    navigate({
      pathname: basePath,
      search: search ? `?${search}` : '',
    }, { replace: true });
  }, [basePath, defaultPageSize, location.search, navigate]);

  const paginate = useCallback(<T,>(items: T[], page: number, size: PageSize): T[] => {
    if (size === 'semua') return items;
    const start = (page - 1) * size;
    return items.slice(start, start + size);
  }, []);

  const getTotalPages = useCallback((totalItems: number, size: PageSize): number => {
    if (size === 'semua') return 1;
    return Math.max(1, Math.ceil(totalItems / size));
  }, []);

  return {
    pageSize,
    setPageSize,
    currentPage,
    setCurrentPage,
    paginate,
    getTotalPages,
  };
}

function parsePageSize(value: string | null): PageSize | null {
  if (value === 'semua') return 'semua';
  const numeric = Number(value);
  return numeric === 20 || numeric === 30 || numeric === 50 || numeric === 100 || numeric === 500 || numeric === 1000
    ? numeric
    : null;
}
