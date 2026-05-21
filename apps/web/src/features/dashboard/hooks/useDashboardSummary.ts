import { useQuery } from '@tanstack/react-query';
import { dashboardSummaryRepository } from '../services/dashboard-summary.repository';
import { QUERY_KEYS } from '@/app/query-keys';

export const DASHBOARD_SUMMARY_QUERY_KEY = QUERY_KEYS.DASHBOARD_SUMMARY;

export function useDashboardSummary() {
  return useQuery({
    queryKey: DASHBOARD_SUMMARY_QUERY_KEY,
    queryFn: () => dashboardSummaryRepository.getSummary(),
    throwOnError: false,
  });
}
