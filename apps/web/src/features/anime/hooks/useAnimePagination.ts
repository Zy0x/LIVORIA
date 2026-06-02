import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PageSize } from '@/components/shared/Pagination';
import { ROUTES } from '@/app/route-paths';
import { runAfterPaginationFeedback } from '@/shared/hooks/useScrollToListStart';

export function useAnimePagination() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pageParam } = useParams<{ pageParam?: string }>();
  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [watchlistPageSize, setWatchlistPageSize] = useState<PageSize>(20);

  const currentPage = useMemo(() => {
    if (!pageParam || !pageParam.startsWith('page=')) return 1;
    const page = parseInt(pageParam.split('=')[1]);
    return isNaN(page) ? 1 : page;
  }, [pageParam]);

  const watchlistCurrentPage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const page = parseInt(params.get('wpage') || '1');
    return isNaN(page) ? 1 : page;
  }, [location.search]);

  const setCurrentPage = useCallback((page: number, replace = false) => {
    const search = location.search || '';
    const safePage = Math.max(1, Math.floor(page));
    const target = safePage === 1 ? `${ROUTES.ANIME}${search}` : `${ROUTES.ANIME}/page=${safePage}${search}`;
    runAfterPaginationFeedback(() => navigate(target, { replace }));
  }, [navigate, location.search]);

  const setWatchlistCurrentPage = useCallback((page: number) => {
    const params = new URLSearchParams(location.search);
    if (page === 1) {
      params.delete('wpage');
    } else {
      params.set('wpage', String(page));
    }
    const search = params.toString();
    runAfterPaginationFeedback(() => {
      navigate({
        pathname: location.pathname,
        search: search ? `?${search}` : '',
      }, { replace: true });
    });
  }, [navigate, location.pathname, location.search]);

  const paginate = useCallback(<T,>(items: T[], page: number, size: PageSize): T[] => {
    if (size === 'semua') return items;
    const start = (page - 1) * (size as number);
    return items.slice(start, start + (size as number));
  }, []);

  const getTotalPages = useCallback((totalItems: number, size: PageSize): number => {
    if (size === 'semua') return 1;
    return Math.max(1, Math.ceil(totalItems / (size as number)));
  }, []);

  return {
    pageSize,
    setPageSize,
    watchlistPageSize,
    setWatchlistPageSize,
    currentPage,
    watchlistCurrentPage,
    setCurrentPage,
    setWatchlistCurrentPage,
    paginate,
    getTotalPages,
  };
}
