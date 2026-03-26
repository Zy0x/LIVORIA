import { useEffect, useRef, useMemo, useState } from 'react';
import gsap from 'gsap';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Banknote, BarChart3,
  CalendarCheck, CheckCircle2, Wallet,
  ChevronRight, Activity, Target, Award,
  CreditCard, AlertTriangle,
} from 'lucide-react';
import type { Tagihan } from '@/lib/types';
import { isTagihanDueInMonth, getReminderStatus } from '@/lib/tagihan-cycle';
import TagihanCalendar from '@/components/tagihan/TagihanCalendar';

interface Props {
  data: Tagihan[];
  onView: (item: Tagihan) => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const fmtShort = (n: number) => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`;
  if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n));
};

const CHART_COLORS = {
  primary:     'hsl(155, 30%, 26%)',
  success:     'hsl(152, 56%, 38%)',
  warning:     'hsl(35, 90%, 48%)',
  info:        'hsl(214, 88%, 58%)',
  destructive: 'hsl(0, 70%, 50%)',
};

export default function TagihanLaporan({ data, onView }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [calendarItems, setCalendarItems] = useState<Tagihan[]>([]);
  const [calendarDate,  setCalendarDate]  = useState<string | null>(null);

  const now          = new Date();
  const currentMonth = now.getMonth();
  const currentYear  = now.getFullYear();
  const monthName    = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  /* ─── GSAP entrance ──────────────────────────────────────────── */
  useEffect(() => {
    if (!ref.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('.laporan-hero',
        { opacity: 0, y: -16 },
        { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
      );
      gsap.fromTo('.laporan-kpi',
        { opacity: 0, y: 28, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.07, duration: 0.5, ease: 'back.out(1.4)', delay: 0.18 }
      );
      gsap.fromTo('.laporan-section',
        { opacity: 0, y: 18 },
        { opacity: 1, y: 0, stagger: 0.1, duration: 0.45, ease: 'power2.out', delay: 0.38 }
      );
    }, ref);
    return () => ctx.revert();
  }, [data]);

  /* ─── Core stats ─────────────────────────────────────────────── */
  const totalAktif     = data.filter(t => t.status === 'aktif').length;
  const totalLunas     = data.filter(t => t.status === 'lunas').length;
  const totalOverdue   = data.filter(t => t.status === 'overdue').length;
  const totalDitunda   = data.filter(t => t.status === 'ditunda').length;

  const totalModal      = data.reduce((s, t) => s + Number(t.harga_awal), 0);
  const totalDibayar    = data.reduce((s, t) => s + Number(t.total_dibayar), 0);
  const totalKeuntungan = data.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0);
  const totalSisa       = data.reduce((s, t) => s + Number(t.sisa_hutang), 0);
  const monthlyIncome   = data
    .filter(t => t.status !== 'lunas')
    .reduce((s, t) => s + Number(t.cicilan_per_bulan), 0);

  const collectRate    = totalModal > 0 ? (totalDibayar    / totalModal) * 100 : 0;
  const keuntunganRate = totalModal > 0 ? (totalKeuntungan / totalModal) * 100 : 0;

  /* ─── This-month due ─────────────────────────────────────────── */
  const dueThisMonth = useMemo(() =>
    data.filter(t => {
      if (t.status === 'lunas') return false;
      if (isTagihanDueInMonth(t, currentYear, currentMonth, 'tempo', now)) return true;
      const reminder = getReminderStatus(t, now);
      if (reminder.level === 'none') return false;
      const period = reminder.period;
      if (!period) return false;
      const ws = period.windowStart;
      return ws.getFullYear() === currentYear && ws.getMonth() === currentMonth;
    }),
    [data, currentMonth, currentYear]
  );

  const totalDueAmount      = dueThisMonth.reduce((s, t) => s + Number(t.cicilan_per_bulan), 0);
  const keuntunganBulanIni  = dueThisMonth.reduce(
    (s, t) => s + Number(t.keuntungan_estimasi) / t.jangka_waktu_bulan, 0
  );

  /* ─── 6-month trend ──────────────────────────────────────────── */
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, idx) => {
      const i  = 5 - idx;
      const d  = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth();
      const name = d.toLocaleDateString('id-ID', { month: 'short' });
      let keuntungan = 0, cicilan = 0, modal = 0;
      data.forEach(t => {
        const start   = new Date(t.tanggal_mulai);
        const endDate = new Date(start.getFullYear(), start.getMonth() + t.jangka_waktu_bulan, 0);
        const dStart  = new Date(start.getFullYear(), start.getMonth(), 1);
        if (d >= dStart && d <= endDate) {
          keuntungan += Number(t.keuntungan_estimasi) / t.jangka_waktu_bulan;
          cicilan    += Number(t.cicilan_per_bulan);
        }
        if (start.getFullYear() === yr && start.getMonth() === mo) modal += Number(t.harga_awal);
      });
      return { name, keuntungan: Math.round(keuntungan), cicilan: Math.round(cicilan), modal: Math.round(modal) };
    });
  }, [data]);

  /* ─── Cashflow projection ────────────────────────────────────── */
  const cashflow = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d    = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const name = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      let masuk  = 0;
      data.forEach(t => {
        if (t.status === 'lunas') return;
        const start   = new Date(t.tanggal_mulai);
        const endDate = new Date(start.getFullYear(), start.getMonth() + t.jangka_waktu_bulan, 0);
        if (d >= start && d <= endDate) masuk += Number(t.cicilan_per_bulan);
      });
      return { name, masuk: Math.round(masuk) };
    }),
    [data]
  );

  /* ─── Status distribution ────────────────────────────────────── */
  const statusDist = [
    { name: 'Aktif',   value: totalAktif,   color: CHART_COLORS.info        },
    { name: 'Lunas',   value: totalLunas,   color: CHART_COLORS.success     },
    { name: 'Overdue', value: totalOverdue, color: CHART_COLORS.destructive },
    { name: 'Ditunda', value: totalDitunda, color: CHART_COLORS.warning     },
  ].filter(s => s.value > 0);

  /* ─── Top debtors ────────────────────────────────────────────── */
  const topDebtors = useMemo(() => {
    const map = new Map<string, number>();
    data.filter(t => t.status !== 'lunas')
      .forEach(t => map.set(t.debitur_nama, (map.get(t.debitur_nama) || 0) + Number(t.sisa_hutang)));
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, sisa]) => ({ name, sisa }));
  }, [data]);

  /* ─── Custom tooltip ─────────────────────────────────────────── */
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border/80 rounded-xl shadow-xl p-3 text-xs min-w-[120px]">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: p.color }} />
              <span className="text-muted-foreground">{p.name}</span>
            </span>
            <span className="font-semibold tabular-nums">{fmtShort(p.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  /* ─── KPI config ─────────────────────────────────────────────── */
  const kpis = [
    {
      label:   'Total Piutang',
      value:   fmtShort(totalSisa),
      sub:     `dari ${data.length} tagihan`,
      icon:    Wallet,
      color:   'hsl(var(--primary))',
      bgClass: 'bg-primary/8 border-primary/15',
      trend:   null as null | 'up' | 'down',
    },
    {
      label:   'Cicilan / Bulan',
      value:   fmtShort(monthlyIncome),
      sub:     `${data.filter(t => t.status !== 'lunas').length} tagihan aktif`,
      icon:    Banknote,
      color:   'hsl(var(--info))',
      bgClass: 'bg-info/8 border-info/15',
      trend:   null as null | 'up' | 'down',
    },
    {
      label:   'Est. Keuntungan',
      value:   fmtShort(totalKeuntungan),
      sub:     `${keuntunganRate.toFixed(1)}% dari modal`,
      icon:    TrendingUp,
      color:   'hsl(var(--success))',
      bgClass: 'bg-success/8 border-success/15',
      trend:   'up' as const,
    },
    {
      label:   'Collect Rate',
      value:   `${collectRate.toFixed(1)}%`,
      sub:     `${fmtShort(totalDibayar)} terkumpul`,
      icon:    Target,
      color:   collectRate >= 50 ? 'hsl(var(--success))' : 'hsl(var(--warning))',
      bgClass: collectRate >= 50 ? 'bg-success/8 border-success/15' : 'bg-warning/8 border-warning/15',
      trend:   (collectRate >= 50 ? 'up' : 'down') as 'up' | 'down',
    },
  ];

  /* ─── Empty state ────────────────────────────────────────────── */
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Belum ada data tagihan untuk dilaporkan.</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="space-y-5 sm:space-y-6">

      {/* ══ HERO HEADER ════════════════════════════════════════════════════ */}
      <div className="laporan-hero relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6">
        <div className="pointer-events-none absolute -top-6 -right-6 w-52 h-52 rounded-full bg-primary/6 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 w-36 h-36 rounded-full bg-info/6 blur-2xl" />

        <div className="relative flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-[0.12em]">
                Laporan Keuangan
              </span>
            </div>
            <h2
              className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight"
              style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif", letterSpacing: '-0.03em' }}
            >
              {monthName}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {dueThisMonth.length} tagihan jatuh tempo ·{' '}
              <span className="font-semibold text-foreground">{fmtShort(totalDueAmount)}</span> cicilan masuk ·{' '}
              <span className="font-semibold text-success">+{fmtShort(Math.round(keuntunganBulanIni))}</span> est. keuntungan
            </p>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            {totalOverdue > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" />{totalOverdue} Overdue
              </div>
            )}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-semibold">
              <CheckCircle2 className="w-3 h-3" />{totalLunas} Lunas
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-info/10 border border-info/20 text-info text-xs font-semibold">
              <Activity className="w-3 h-3" />{totalAktif} Aktif
            </div>
          </div>
        </div>
      </div>

      {/* ══ KPI CARDS ══════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div
              key={i}
              className={`laporan-kpi relative overflow-hidden rounded-2xl border p-4 sm:p-5 ${kpi.bgClass}`}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: kpi.color + '22' }}
                >
                  <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                </div>
                {kpi.trend && (
                  <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    kpi.trend === 'up' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
                  }`}>
                    {kpi.trend === 'up'
                      ? <TrendingUp  className="w-2.5 h-2.5" />
                      : <TrendingDown className="w-2.5 h-2.5" />
                    }
                  </div>
                )}
              </div>
              <p
                className="text-xl sm:text-2xl font-bold leading-none"
                style={{
                  color: kpi.color,
                  fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
                  letterSpacing: '-0.03em',
                }}
              >
                {kpi.value}
              </p>
              <p className="text-xs font-semibold text-foreground mt-1.5">{kpi.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* ══ CHART ROW 1: Area trend + Pie ══════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        <div className="laporan-section lg:col-span-2 rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Tren Cicilan & Keuntungan</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">6 bulan terakhir</p>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-primary inline-block" /> Cicilan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 rounded-full bg-success inline-block" /> Keuntungan
              </span>
            </div>
          </div>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyTrend} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="lapGradCicilan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
                  </linearGradient>
                  <linearGradient id="lapGradUntung" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={CHART_COLORS.success} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={42} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="cicilan" name="Cicilan" stroke={CHART_COLORS.primary} strokeWidth={2.5} fill="url(#lapGradCicilan)" dot={{ r: 3, fill: CHART_COLORS.primary, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="keuntungan" name="Keuntungan" stroke={CHART_COLORS.success} strokeWidth={2.5} fill="url(#lapGradUntung)" dot={{ r: 3, fill: CHART_COLORS.success, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="laporan-section rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Distribusi Status</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">{data.length} total tagihan</p>
          </div>
          <div className="h-36 sm:h-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius="52%" outerRadius="78%" paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {statusDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,.1)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {statusDist.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-muted-foreground">{s.name}</span>
                </span>
                <span className="font-bold tabular-nums">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ CHART ROW 2: Cashflow + Top debtors ════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">

        <div className="laporan-section rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Proyeksi Cashflow</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">6 bulan ke depan</p>
            </div>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-info/10 text-info border border-info/15">
              Estimasi
            </span>
          </div>
          <div className="h-44 sm:h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashflow} margin={{ top: 5, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" axisLine={false} tickLine={false} />
                <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={42} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="masuk" name="Est. Masuk" fill={CHART_COLORS.primary} radius={[6, 6, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="laporan-section rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-foreground">Piutang Terbesar</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Top 5 sisa hutang aktif</p>
          </div>
          {topDebtors.length === 0 ? (
            <div className="flex items-center justify-center h-40">
              <p className="text-xs text-muted-foreground">Semua tagihan sudah lunas 🎉</p>
            </div>
          ) : (
            <div className="space-y-4">
              {topDebtors.map((d, i) => {
                const maxSisa = topDebtors[0].sisa;
                const pct     = maxSisa > 0 ? (d.sisa / maxSisa) * 100 : 0;
                const rankColors = [
                  CHART_COLORS.destructive,
                  CHART_COLORS.warning,
                  CHART_COLORS.primary,
                  CHART_COLORS.info,
                  CHART_COLORS.success,
                ];
                const c = rankColors[i];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 text-white"
                          style={{ background: c }}
                        >
                          {i + 1}
                        </span>
                        <span className="text-xs font-medium text-foreground truncate">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums shrink-0 ml-2" style={{ color: c }}>
                        {fmtShort(d.sisa)}
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ CALENDAR + DUE LIST ════════════════════════════════════════════ */}
      <div className="laporan-section grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2">
          <TagihanCalendar
            data={data}
            onSelectDate={(d, items) => { setCalendarDate(d); setCalendarItems(items); }}
          />
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-4 shrink-0">
            <CalendarCheck className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground leading-tight">
                {calendarDate
                  ? new Date(calendarDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                  : `Jatuh Tempo — ${now.toLocaleDateString('id-ID', { month: 'short' })}`
                }
              </h3>
              <p className="text-[11px] text-muted-foreground">
                {calendarDate ? 'Tagihan pada tanggal ini' : `${dueThisMonth.length} tagihan bulan ini`}
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-1 max-h-64 overflow-y-auto pr-0.5">
            {(calendarDate ? calendarItems : dueThisMonth).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-success/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">
                  {calendarDate ? 'Tidak ada tagihan hari ini' : 'Tidak ada tagihan jatuh tempo 🎉'}
                </p>
              </div>
            ) : (
              (calendarDate ? calendarItems : dueThisMonth).map(t => {
                const reminder  = getReminderStatus(t, now);
                const isUrgent  = reminder.level === 'critical' || reminder.level === 'overdue';
                const isWarning = reminder.level === 'warning';
                return (
                  <button
                    key={t.id}
                    onClick={() => onView(t)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-muted/50 transition-colors group border border-transparent hover:border-border/50 active:scale-[0.99]"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      isUrgent  ? 'bg-destructive animate-pulse' :
                      isWarning ? 'bg-warning' : 'bg-info'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.debitur_nama}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{t.barang_nama}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <p className="text-xs font-bold tabular-nums">{fmtShort(Number(t.cicilan_per_bulan))}</p>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ══ PERFORMANCE SUMMARY ══════════════════════════════════════════════ */}
      <div className="laporan-section rounded-2xl border border-border/60 bg-card p-4 sm:p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <Award className="w-4 h-4 text-warning" />
          <h3 className="text-sm font-semibold text-foreground">Ringkasan Performa</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Total Modal Keluar',    value: fmt(totalModal),      icon: Wallet,    color: 'text-primary', bg: 'bg-primary/8' },
            { label: 'Total Terkumpul',       value: fmt(totalDibayar),    icon: CreditCard, color: 'text-success', bg: 'bg-success/8' },
            { label: 'Est. Total Keuntungan', value: fmt(totalKeuntungan), icon: TrendingUp, color: 'text-info',    bg: 'bg-info/8'    },
            { label: 'Sisa Piutang',          value: fmt(totalSisa),       icon: Banknote,   color: 'text-warning', bg: 'bg-warning/8' },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className={`rounded-xl ${s.bg} p-3 sm:p-4`}>
                <Icon className={`w-4 h-4 ${s.color} mb-2`} />
                <p
                  className={`text-xs sm:text-sm font-bold ${s.color} leading-tight`}
                  style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}
                >
                  {s.value}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{s.label}</p>
              </div>
            );
          })}
        </div>
        <div className="pt-4 border-t border-border/50">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold text-foreground">Collection Progress</span>
            <span className="font-bold text-foreground tabular-nums">{collectRate.toFixed(1)}%</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min(100, collectRate)}%`,
                background: 'linear-gradient(to right, hsl(var(--primary)), hsl(var(--success)))',
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>{fmt(totalDibayar)} terkumpul</span>
            <span>{fmt(totalModal)} total modal</span>
          </div>
        </div>
      </div>

    </div>
  );
}