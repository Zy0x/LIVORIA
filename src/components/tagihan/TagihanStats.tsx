import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Wallet, AlertTriangle, TrendingUp, CircleDollarSign } from 'lucide-react';
import type { Tagihan } from '@/lib/types';

interface Props { data: Tagihan[] }

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

export default function TagihanStats({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const totalAktif = data.filter(t => t.status === 'aktif').length;
  const totalLunas = data.filter(t => t.status === 'lunas').length;
  const totalOverdue = data.filter(t => t.status === 'overdue').length;
  const totalModalKeluar = data.reduce((s, t) => s + Number(t.harga_awal), 0);
  const totalDibayar = data.reduce((s, t) => s + Number(t.total_dibayar), 0);
  const totalKeuntungan = data.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0);
  const totalSisaHutang = data.reduce((s, t) => s + Number(t.sisa_hutang), 0);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current.querySelectorAll('.stat-ring'),
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, stagger: 0.08, duration: 0.5, ease: 'back.out(1.4)' }
      );
    }
  }, [data]);

  const stats = [
    {
      label: 'Total Tagihan',
      value: `${totalAktif + totalLunas + totalOverdue}`,
      sub: `${totalAktif} aktif · ${totalLunas} lunas`,
      icon: Wallet,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      progress: data.length > 0 ? (totalLunas / data.length) * 100 : 0,
      progressColor: 'stroke-primary',
    },
    {
      label: 'Overdue',
      value: `${totalOverdue}`,
      sub: totalOverdue > 0 ? 'Perlu segera ditindak' : 'Semua aman',
      icon: AlertTriangle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      progress: data.length > 0 ? (totalOverdue / data.length) * 100 : 0,
      progressColor: 'stroke-destructive',
    },
    {
      label: 'Keuntungan Estimasi',
      value: fmt(totalKeuntungan),
      sub: `Modal masuk: ${fmt(totalDibayar)}`,
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
      progress: totalKeuntungan > 0 && totalModalKeluar > 0 ? Math.min(100, (totalDibayar / totalModalKeluar) * 100) : 0,
      progressColor: 'stroke-success',
    },
    {
      label: 'Modal Keluar',
      value: fmt(totalModalKeluar),
      sub: `Sisa piutang: ${fmt(totalSisaHutang)}`,
      icon: CircleDollarSign,
      color: 'text-info',
      bgColor: 'bg-info/10',
      progress: totalModalKeluar > 0 ? Math.min(100, (totalDibayar / totalModalKeluar) * 100) : 0,
      progressColor: 'stroke-info',
    },
  ];

  return (
    <div ref={ref} className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
      {stats.map((s, i) => {
        const Icon = s.icon;
        const circumference = 2 * Math.PI * 28;
        const offset = circumference - (s.progress / 100) * circumference;
        return (
          <div key={i} className="stat-card stat-ring flex flex-col items-center text-center p-4 sm:p-5 relative overflow-hidden">
            {/* Mini ring */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" className="stroke-muted/30" />
                <circle cx="32" cy="32" r="28" fill="none" strokeWidth="4" className={s.progressColor}
                  strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center ${s.bgColor} rounded-full m-2`}>
                <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${s.color}`} />
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mb-1">{s.label}</p>
            <p className="text-base sm:text-lg font-bold font-display">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{s.sub}</p>
          </div>
        );
      })}
    </div>
  );
}
