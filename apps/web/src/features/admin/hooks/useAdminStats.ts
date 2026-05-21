import { useCallback, useMemo, useState } from 'react';
import { Database } from 'lucide-react';

import { TABLE_CONFIG_MAP, type TableStat } from '../admin-page-helpers';
import { adminService, type AdminSession } from '../services/admin.service';

export function useAdminStats(adminSession: AdminSession | null) {
  const [tableStats, setTableStats] = useState<TableStat[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);

  const totalRecords = useMemo(
    () => tableStats.reduce((sum, table) => sum + Math.max(0, table.count), 0),
    [tableStats],
  );

  const fetchStats = useCallback(async () => {
    if (!adminSession) return;
    setStatsLoading(true);
    try {
      const { data, error } = await adminService.fetchStats(adminSession);
      if (!error && data?.counts) {
        const stats = Object.keys(data.counts).map(name => {
          const config = TABLE_CONFIG_MAP[name] || {
            label: name,
            icon: Database,
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-50 dark:bg-slate-400/15',
          };
          return { name, ...config, count: data.counts?.[name] ?? -1 };
        });
        setTableStats(stats);
      }
    } catch {
      // Keep legacy silent behavior.
    }
    setStatsLoading(false);
  }, [adminSession]);

  return {
    tableStats,
    statsLoading,
    totalRecords,
    fetchStats,
  };
}
