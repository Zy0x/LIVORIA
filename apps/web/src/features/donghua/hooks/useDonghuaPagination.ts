import { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { PageSize } from '@/components/shared/Pagination';
import { ROUTES } from '@/app/route-paths';
import { runAfterPaginationFeedback } from '@/shared/hooks/useScrollToListStart';

function parsePageSize(value: string | null): PageSize | null {
  if (value === 'semua') return 'semua';
  const numeric = Number(value);
  return numeric === 20 || numeric === 30 || numeric === 50 || numeric === 100 || numeric === 500 || numeric === 1000
    ? numeric
    : null;
}

function updatePageSizeParam(params: URLSearchParams, key: string, size: PageSize, defaultSize: PageSize) {
  if (size === defaultSize) {
    params.delete(key);
  } else {
    params.set(key, String(size));
  }
}

export function useDonghuaPagination() {
  const navigate = useNavigate();
  const location = useLocation();
  const { pageParam } = useParams<{ pageParam?: string }>();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const pageSize = parsePageSize(params.get('size')) ?? 20;
  const watchlistPageSize = parsePageSize(params.get('wsize')) ?? 20;

  const currentPage = useMemo(() => {
    if (!pageParam || !pageParam.startsWith('page=')) return 1;
    const page = parseInt(pageParam.split('=')[1]);
    return isNaN(page) ? 1 : Math.max(1, page);
  }, [pageParam]);

  const watchlistCurrentPage = useMemo(() => {
    const page = parseInt(params.get('wpage') || '1');
    return isNaN(page) ? 1 : Math.max(1, page);
  }, [params]);

  const setPageSize = useCallback((size: PageSize) => {
    const nextParams = new URLSearchParams(location.search);
    updatePageSizeParam(nextParams, 'size', size, 20);
    const search = nextParams.toString();
    navigate({
      pathname: ROUTES.DONGHUA,
      search: search ? `?${search}` : '',
    }, { replace: true });
  }, [location.search, navigate]);

  const setWatchlistPageSize = useCallback((size: PageSize) => {
    const nextParams = new URLSearchParams(location.search);
    updatePageSizeParam(nextParams, 'wsize', size, 20);
    nextParams.delete('wpage');
    const search = nextParams.toString();
    navigate({
      pathname: location.pathname,
      search: search ? `?${search}` : '',
    }, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const setCurrentPage = useCallback((page: number, replace = false) => {
    const search = location.search || '';
    const safePage = Math.max(1, Math.floor(page));
    const target = safePage === 1 ? `${ROUTES.DONGHUA}${search}` : `${ROUTES.DONGHUA}/page=${safePage}${search}`;
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
