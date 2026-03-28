import { useMemo, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { TrendingUp, Users, Banknote, BarChart3 } from 'lucide-react';
import type { Tagihan } from '@/lib/types';

interface Props { data: Tagihan[] }

const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
};

export default function TagihanAnalytics({ data }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      gsap.fromTo(ref.current.querySelectorAll('.analytics-card'),
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [data]);

  // Monthly profit data (last 6 months)
  const monthlyProfitData = useMemo(() => {
    const now = new Date();
    const months: { name: string; keuntungan: number; cicilan: number; modal: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
      const y = d.getFullYear();
      const m = d.getMonth();

      let keuntungan = 0;
      let cicilan = 0;
      let modal = 0;

      data.forEach(t => {
        const start = new Date(t.tanggal_mulai);
        const endMonth = start.getMonth() + t.jangka_waktu_bulan;
        const startDate = new Date(start.getFullYear(), start.getMonth(), 1);
        const endDate = new Date(start.getFullYear(), endMonth, 0);

        // Check if this bill is active during this month
        if (d >= startDate && d <= endDate) {
          const monthlyProfit = Number(t.keuntungan_estimasi) / t.jangka_waktu_bulan;
          keuntungan += monthlyProfit;
          cicilan += Number(t.cicilan_per_bulan);
        }

        // Capital deployed in this month
        if (start.getFullYear() === y && start.getMonth() === m) {
          modal += Number(t.harga_awal);
        }
      });

      months.push({ name: monthName, keuntungan: Math.round(keuntungan), cicilan: Math.round(cicilan), modal: Math.round(modal) });
    }
    return months;
  }, [data]);

  // Cashflow projection (next 6 months)
  const cashflowProjection = useMemo(() => {
    const now = new Date();
    const months: { name: string; masuk: number; tagihan: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });

      let masuk = 0;
      let tagihanCount = 0;

      data.forEach(t => {
        if (t.status === 'lunas') return;
        const start = new Date(t.tanggal_mulai);
        const endDate = new Date(start.getFullYear(), start.getMonth() + t.jangka_waktu_bulan, 0);
        if (d >= start && d <= endDate) {
          masuk += Number(t.cicilan_per_bulan);
          tagihanCount++;
        }
      });

      months.push({ name: monthName, masuk: Math.round(masuk), tagihan: tagihanCount });
    }
    return months;
  }, [data]);

  // Summary stats
  const activeDebtors = new Set(data.filter(t => t.status === 'aktif' || t.status === 'overdue').map(t => t.debitur_nama)).size;
  const totalActiveDebt = data.filter(t => t.status !== 'lunas').reduce((s, t) => s + Number(t.sisa_hutang), 0);
  const monthlyIncome = data.filter(t => t.status !== 'lunas').reduce((s, t) => s + Number(t.cicilan_per_bulan), 0);
  const totalEstProfit = data.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
        ))}
      </div>
    );
  };

  return (
    <div ref={ref} className="space-y-4 mb-6">
      <h3 className="font-display font-semibold text-sm flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" /> Analitik Keuangan
      </h3>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 analytics-card">
        <div className="stat-card text-center p-4">
          <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
          <p className="text-lg font-bold font-display">{activeDebtors}</p>
          <p className="text-xs text-muted-foreground">Debitur Aktif</p>
        </div>
        <div className="stat-card text-center p-4">
          <Banknote className="w-5 h-5 mx-auto mb-2 text-info" />
          <p className="text-sm font-bold font-display">{fmt(monthlyIncome)}</p>
          <p className="text-xs text-muted-foreground">Pemasukan/Bulan</p>
        </div>
        <div className="stat-card text-center p-4">
          <TrendingUp className="w-5 h-5 mx-auto mb-2 text-success" />
          <p className="text-sm font-bold font-display">{fmt(totalEstProfit)}</p>
          <p className="text-xs text-muted-foreground">Total Est. Keuntungan</p>
        </div>
        <div className="stat-card text-center p-4">
          <Banknote className="w-5 h-5 mx-auto mb-2 text-warning" />
          <p className="text-sm font-bold font-display">{fmt(totalActiveDebt)}</p>
          <p className="text-xs text-muted-foreground">Total Piutang Aktif</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Profit */}
        <div className="analytics-card glass-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Keuntungan Bulanan (6 Bulan)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyProfitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="keuntungan" name="Keuntungan" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="cicilan" name="Cicilan Masuk" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cashflow Projection */}
        <div className="analytics-card glass-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Proyeksi Cashflow (6 Bulan)</p>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflowProjection}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="masuk" name="Est. Pemasukan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
