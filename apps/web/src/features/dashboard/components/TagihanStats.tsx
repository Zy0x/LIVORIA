import { AlertTriangle, Banknote, TrendingUp, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface TagihanStatsProps {
  totalActiveOrOverdue: number;
  totalLunas: number;
  totalOverdue: number;
  totalTagihanCount: number;
  totalModalTerpisah: number;
  totalModalBergulir: number;
  monthlyIncome: number;
  totalKeuntungan: number;
  totalDibayar: number;
  fmtShort: (value: number) => string;
}

interface StatItem {
  icon: LucideIcon;
  value: string;
  sub: string;
  cssVar: string;
  bgClass: string;
  progress: number;
}

export function TagihanStats({
  totalActiveOrOverdue,
  totalLunas,
  totalOverdue,
  totalTagihanCount,
  totalModalTerpisah,
  totalModalBergulir,
  monthlyIncome,
  totalKeuntungan,
  totalDibayar,
  fmtShort,
}: TagihanStatsProps) {
  const stats: StatItem[] = [
    {
      icon: Wallet,
      value: String(totalActiveOrOverdue),
      sub: `${totalLunas} lunas`,
      cssVar: '--primary',
      bgClass: 'bg-primary/5 border-primary/10',
      progress: totalTagihanCount > 0 ? (totalLunas / totalTagihanCount) * 100 : 0,
    },
    {
      icon: AlertTriangle,
      value: String(totalOverdue),
      sub: totalOverdue > 0 ? 'Overdue!' : 'Aman \u2713',
      cssVar: totalOverdue > 0 ? '--destructive' : '--success',
      bgClass: totalOverdue > 0 ? 'bg-destructive/5 border-destructive/10' : 'bg-success/5 border-success/10',
      progress: totalTagihanCount > 0 ? ((totalTagihanCount - totalOverdue) / totalTagihanCount) * 100 : 100,
    },
    {
      icon: Banknote,
      value: fmtShort(monthlyIncome),
      sub: 'Cicilan/Bln',
      cssVar: '--info',
      bgClass: 'bg-info/5 border-info/10',
      progress: totalModalTerpisah > 0 ? Math.min(100, (monthlyIncome / totalModalTerpisah) * 100) : 60,
    },
    {
      icon: TrendingUp,
      value: fmtShort(totalKeuntungan),
      sub: `Modal: ${fmtShort(totalModalTerpisah)}${totalModalBergulir > 0 ? ` +${fmtShort(totalModalBergulir)}` : ''}`,
      cssVar: '--success',
      bgClass: 'bg-success/5 border-success/10',
      progress: totalModalTerpisah > 0 ? Math.min(100, (totalDibayar / totalModalTerpisah) * 100) : 0,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {stats.map(stat => {
        const Icon = stat.icon;
        const radius = 14;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (stat.progress / 100) * circumference;
        const color = `hsl(var(${stat.cssVar}))`;

        return (
          <div key={`${stat.value}-${stat.sub}`} className={`stat-ring flex items-center gap-2 p-2.5 rounded-xl border ${stat.bgClass}`}>
            <div className="relative w-9 h-9 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r={radius} fill="none" strokeWidth="2.5" style={{ stroke: 'hsl(var(--border))' }} />
                <circle
                  cx="18"
                  cy="18"
                  r={radius}
                  fill="none"
                  strokeWidth="2.5"
                  style={{
                    stroke: color,
                    strokeDasharray: circumference,
                    strokeDashoffset: offset,
                    strokeLinecap: 'round',
                    transition: 'stroke-dashoffset 0.8s ease',
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold font-display leading-tight">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground truncate">{stat.sub}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
