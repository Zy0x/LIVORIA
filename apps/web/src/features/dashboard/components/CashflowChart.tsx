import { lazy, Suspense } from 'react';

const DashboardCharts = lazy(() => import('@/components/dashboard/DashboardCharts'));

export interface MonthlyProfitPoint {
  [key: string]: unknown;
  name: string;
  keuntungan: number;
  cicilan: number;
}

export interface CashflowProjectionPoint {
  [key: string]: unknown;
  name: string;
  masuk: number;
}

interface CashflowChartProps {
  monthlyProfitData: MonthlyProfitPoint[];
  cashflowProjection: CashflowProjectionPoint[];
  fmt: (value: number) => string;
  fmtShort: (value: number) => string;
}

export function CashflowChart({
  monthlyProfitData,
  cashflowProjection,
  fmt,
  fmtShort,
}: CashflowChartProps) {
  return (
    <Suspense fallback={<div className="h-40 rounded-xl bg-muted/20 border border-border/50 animate-pulse" />}>
      <DashboardCharts
        monthlyProfitData={monthlyProfitData}
        cashflowProjection={cashflowProjection}
        fmt={fmt}
        fmtShort={fmtShort}
      />
    </Suspense>
  );
}
