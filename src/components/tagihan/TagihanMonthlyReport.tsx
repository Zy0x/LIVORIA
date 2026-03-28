import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { CalendarCheck, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';
import type { Tagihan } from '@/lib/types';
import { isTagihanDueInMonth, getActivePeriod, getReminderStatus } from '@/lib/tagihan-cycle';

interface Props {
  data: Tagihan[];
  onView: (item: Tagihan) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

export default function TagihanMonthlyReport({ data, onView }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    }
  }, [data]);

  // Tagihan jatuh tempo bulan ini (mode tempo: windowEnd di bulan ini)
  const dueThisMonth = data.filter(t =>
    isTagihanDueInMonth(t, currentYear, currentMonth, 'tempo', now)
  );

  // Tagihan yang masih dalam jendela bayar bulan ini atau overdue
  const activeThisMonth = data.filter(t => {
    if (t.status === 'lunas') return false;
    const status = getReminderStatus(t, now);
    return status.level !== 'none';
  });

  const totalDueAmount = dueThisMonth.reduce((s, t) => s + Number(t.cicilan_per_bulan), 0);
  const overdueCount = data.filter(t => t.status === 'overdue').length;

  const totalKeuntunganBulanIni = dueThisMonth.reduce((s, t) => {
    return s + Number(t.keuntungan_estimasi) / t.jangka_waktu_bulan;
  }, 0);

  return (
    <div ref={ref} className="glass-card p-4 sm:p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <CalendarCheck className="w-5 h-5 text-primary" />
        <h3 className="font-display font-semibold text-sm">
          Laporan Bulanan — {monthName}
        </h3>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-lg bg-info/10 p-3 text-center">
          <Clock className="w-4 h-4 mx-auto mb-1 text-info" />
          <p className="text-[10px] text-muted-foreground">Jatuh Tempo</p>
          <p className="text-lg font-bold">{dueThisMonth.length}</p>
          <p className="text-[10px] text-muted-foreground">tagihan</p>
        </div>
        <div className="rounded-lg bg-warning/10 p-3 text-center">
          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-warning" />
          <p className="text-[10px] text-muted-foreground">Total Cicilan</p>
          <p className="text-sm font-bold">{fmt(totalDueAmount)}</p>
        </div>
        <div className="rounded-lg bg-destructive/10 p-3 text-center">
          <AlertCircle className="w-4 h-4 mx-auto mb-1 text-destructive" />
          <p className="text-[10px] text-muted-foreground">Overdue</p>
          <p className="text-lg font-bold">{overdueCount}</p>
        </div>
        <div className="rounded-lg bg-success/10 p-3 text-center">
          <TrendingUp className="w-4 h-4 mx-auto mb-1 text-success" />
          <p className="text-[10px] text-muted-foreground">Est. Keuntungan</p>
          <p className="text-sm font-bold">{fmt(Math.round(totalKeuntunganBulanIni))}</p>
        </div>
      </div>

      {/* Due bills list */}
      {dueThisMonth.length > 0 ? (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Tagihan Jatuh Tempo Bulan Ini
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {dueThisMonth.map(t => {
              const period = getActivePeriod(t, now);
              const reminder = getReminderStatus(t, now);
              return (
                <button
                  key={t.id}
                  onClick={() => onView(t)}
                  className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 hover:bg-accent transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      t.status === 'overdue' || reminder.level === 'overdue'
                        ? 'bg-destructive'
                        : reminder.level === 'critical'
                        ? 'bg-destructive'
                        : reminder.level === 'warning'
                        ? 'bg-warning'
                        : 'bg-info'
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {t.debitur_nama} — {t.barang_nama}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Ke-{period.periodIndex} ({period.periodLabel}) · Tempo{' '}
                      {period.windowEnd.toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                      {t.metode_pembayaran && ` · ${t.metode_pembayaran}`}
                    </p>
                  </div>
                  <p className="text-xs font-semibold shrink-0">
                    {fmt(Number(t.cicilan_per_bulan))}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          Tidak ada tagihan jatuh tempo bulan ini. 🎉
        </p>
      )}
    </div>
  );
}