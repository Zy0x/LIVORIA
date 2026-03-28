import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { TrendingUp, AlertTriangle, Wallet, Activity } from 'lucide-react';
import type { Tagihan } from '@/lib/types';

interface Props { data: Tagihan[] }

const fmt  = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fmtM = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
};

export default function TagihanStats({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const totalAktif   = data.filter(t => t.status === 'aktif').length;
  const totalLunas   = data.filter(t => t.status === 'lunas').length;
  const totalOverdue = data.filter(t => t.status === 'overdue').length;
  const totalAll     = data.length;

  // Exclude dana_luar from modal sendiri calculations
  const dataExclLuar = data.filter(t => t.sumber_modal !== 'dana_luar');
  const totalModal      = dataExclLuar.reduce((s, t) => s + Number(t.harga_awal),        0);
  const totalDibayar    = data.reduce((s, t) => s + Number(t.total_dibayar),     0);
  const totalKeuntungan = data.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0);
  const totalSisa       = data.reduce((s, t) => s + Number(t.sisa_hutang),       0);
  const monthlyIncome   = data.filter(t => t.status !== 'lunas').reduce((s, t) => s + Number(t.cicilan_per_bulan), 0);

  const collectRate = totalModal > 0 ? (totalDibayar / totalModal) * 100 : 0;

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(
        ref.current.querySelectorAll('.kpi-card'),
        { opacity: 0, y: 18, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.06, duration: 0.45, ease: 'power2.out' }
      );
    }
  }, [data]);

  const kpis = [
    {
      label:   'Total Tagihan',
      value:   totalAll,
      unit:    'tagihan',
      sub:     `${totalAktif} aktif · ${totalLunas} lunas`,
      icon:    Wallet,
      accent:  'hsl(var(--primary))',
      bg:      'hsl(var(--primary) / 0.06)',
      border:  'hsl(var(--primary) / 0.15)',
      progress: totalAll > 0 ? (totalLunas / totalAll) * 100 : 0,
      isCount: true,
    },
    {
      label:   'Overdue',
      value:   totalOverdue,
      unit:    'tagihan',
      sub:     totalOverdue > 0 ? `Perlu tindakan segera` : 'Semua dalam kendali',
      icon:    AlertTriangle,
      accent:  totalOverdue > 0 ? 'hsl(var(--destructive))' : 'hsl(var(--success))',
      bg:      totalOverdue > 0 ? 'hsl(var(--destructive) / 0.06)' : 'hsl(var(--success) / 0.06)',
      border:  totalOverdue > 0 ? 'hsl(var(--destructive) / 0.2)'  : 'hsl(var(--success) / 0.2)',
      progress: totalAll > 0 ? ((totalAll - totalOverdue) / totalAll) * 100 : 100,
      isCount: true,
    },
    {
      label:   'Est. Keuntungan',
      value:   totalKeuntungan,
      unit:    '',
      sub:     `Cicilan masuk: ${fmtM(totalDibayar)}`,
      icon:    TrendingUp,
      accent:  'hsl(var(--success))',
      bg:      'hsl(var(--success) / 0.06)',
      border:  'hsl(var(--success) / 0.18)',
      progress: totalModal > 0 ? Math.min(100, (totalDibayar / totalModal) * 100) : 0,
      isCount: false,
    },
    {
      label:   'Pemasukan/Bln',
      value:   monthlyIncome,
      unit:    '',
      sub:     `Collect rate: ${collectRate.toFixed(0)}%`,
      icon:    Activity,
      accent:  'hsl(var(--info))',
      bg:      'hsl(var(--info) / 0.06)',
      border:  'hsl(var(--info) / 0.18)',
      progress: collectRate,
      isCount: false,
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        const displayVal = kpi.isCount
          ? kpi.value.toString()
          : fmtM(kpi.value);

        return (
          <div
            key={i}
            className="kpi-card rounded-2xl p-4 sm:p-5 flex flex-col gap-3 border"
            style={{ background: kpi.bg, borderColor: kpi.border }}
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: kpi.accent + '22' }}
              >
                <Icon className="w-4 h-4" style={{ color: kpi.accent }} />
              </div>
              {/* Mini progress arc */}
              <svg width="36" height="36" viewBox="0 0 36 36" className="-rotate-90">
                <circle cx="18" cy="18" r="14" fill="none" strokeWidth="2.5" stroke="hsl(var(--border))" />
                <circle
                  cx="18" cy="18" r="14" fill="none" strokeWidth="2.5"
                  style={{
                    stroke: kpi.accent,
                    strokeDasharray: 2 * Math.PI * 14,
                    strokeDashoffset: 2 * Math.PI * 14 * (1 - kpi.progress / 100),
                    strokeLinecap: 'round',
                    transition: 'stroke-dashoffset 0.9s ease',
                  }}
                />
              </svg>
            </div>

            {/* Value */}
            <div>
              <p
                className="text-2xl sm:text-3xl font-bold leading-none tracking-tight"
                style={{
                  color: kpi.accent,
                  fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                  letterSpacing: '-0.03em',
                }}
              >
                {displayVal}
                {kpi.isCount && (
                  <span className="text-sm font-medium text-muted-foreground ml-1">
                    {kpi.unit}
                  </span>
                )}
              </p>
              <p className="text-xs font-semibold text-foreground mt-1">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{kpi.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}