import { Activity, BarChart3, Database, RefreshCw, Table2 } from 'lucide-react';

import type { TableStat } from '../admin-page-helpers';

interface DatabaseStatsPanelProps {
  tableStats: TableStat[];
  totalRecords: number;
  statsLoading: boolean;
  onRefresh: () => void;
}

export function DatabaseStatsPanel({
  tableStats,
  totalRecords,
  statsLoading,
  onRefresh,
}: DatabaseStatsPanelProps) {
  return (
    <>
      <div className="admin-card grid grid-cols-1 gap-3 sm:grid-cols-3 mb-5">
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-1 shadow-sm">
          <Database className="w-5 h-5 text-primary" />
          <span className="text-2xl font-bold text-foreground">{statsLoading ? '...' : totalRecords}</span>
          <span className="text-[10px] font-semibold text-muted-foreground">Total Record</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-1 shadow-sm">
          <Table2 className="w-5 h-5 text-info" />
          <span className="text-2xl font-bold text-foreground">{tableStats.length}</span>
          <span className="text-[10px] font-semibold text-muted-foreground">Total Tabel</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 flex flex-col items-center gap-1 shadow-sm">
          <Activity className="w-5 h-5 text-success" />
          <span className="text-2xl font-bold text-success">Online</span>
          <span className="text-[10px] font-semibold text-muted-foreground">Status DB</span>
        </div>
      </div>

      <div className="admin-card mb-5 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />Statistik Per Tabel
          </h2>
          <button
            onClick={onRefresh}
            disabled={statsLoading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-medium hover:bg-accent transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />Refresh
          </button>
        </div>
        {statsLoading && tableStats.length === 0 ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </div>
        ) : tableStats.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center">
            <p className="text-sm font-semibold text-foreground">Statistik belum tersedia.</p>
            <p className="mt-1 text-xs text-muted-foreground">Tekan Refresh setelah sesi admin valid atau setelah Edge Function selesai diperbarui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {tableStats.map(table => (
              <div key={table.name} className={`admin-card rounded-xl border border-border p-3 flex flex-col items-center gap-1.5 ${table.bg}`}>
                <table.icon className={`w-4 h-4 ${table.color}`} />
                <span className={`text-xl font-bold ${table.color}`}>{table.count === -1 ? '...' : table.count.toLocaleString('id-ID')}</span>
                <span className="text-[9px] font-semibold text-muted-foreground text-center leading-tight">{table.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
