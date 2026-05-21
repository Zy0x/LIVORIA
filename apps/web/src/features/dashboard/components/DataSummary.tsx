import { Film, Heart, Pill, Tv } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { AnimeItem, DonghuaItem } from '@/lib/types';
import type { DashboardSummary } from '../types/dashboard-summary.types';

interface DataSummaryProps {
  summaryLoading: boolean;
  summaryError: boolean;
  dashboardSummary?: DashboardSummary;
  anime: AnimeItem[];
  donghua: DonghuaItem[];
}

interface SummaryMetric {
  icon: LucideIcon;
  label: string;
  count: number;
  sub: string;
  color: string;
}

export function DataSummary({
  summaryLoading,
  summaryError,
  dashboardSummary,
  anime,
  donghua,
}: DataSummaryProps) {
  const metrics: SummaryMetric[] = [
    {
      icon: Tv,
      label: 'Anime',
      count: dashboardSummary?.animeCount ?? anime.length,
      sub: `${dashboardSummary?.animeOngoingCount ?? anime.filter(item => item.status === 'on-going').length} on-going`,
      color: 'text-info',
    },
    {
      icon: Film,
      label: 'Donghua',
      count: dashboardSummary?.donghuaCount ?? donghua.length,
      sub: `${dashboardSummary?.donghuaOngoingCount ?? donghua.filter(item => item.status === 'on-going').length} on-going`,
      color: 'text-success',
    },
    {
      icon: Heart,
      label: 'Waifu',
      count: dashboardSummary?.waifuCount ?? 0,
      sub: `${dashboardSummary?.waifuTierSCount ?? 0} tier S`,
      color: 'text-primary',
    },
    {
      icon: Pill,
      label: 'Obat',
      count: dashboardSummary?.obatCount ?? 0,
      sub: 'tersimpan',
      color: 'text-warning',
    },
  ];

  return (
    <>
      <p className="section-subtitle mb-2.5">Ringkasan Data</p>
      {summaryLoading && !dashboardSummary && (
        <p className="text-[10px] text-muted-foreground mb-2">Memuat ringkasan dashboard...</p>
      )}
      {summaryError && !dashboardSummary && (
        <p className="text-[10px] text-destructive mb-2">
          Ringkasan belum bisa dimuat. Data detail tetap ditampilkan jika tersedia.
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {metrics.map(metric => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/40">
              <Icon className={`w-4 h-4 ${metric.color} shrink-0`} />
              <div className="min-w-0">
                <p className="text-sm font-bold font-display leading-tight">{metric.count}</p>
                <p className="text-[10px] text-muted-foreground truncate">{metric.label} &middot; {metric.sub}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
