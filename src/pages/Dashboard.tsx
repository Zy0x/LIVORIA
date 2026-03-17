import { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import {
  Receipt, Tv, Film, Heart, Pill, TrendingUp,
  AlertTriangle, ChevronRight, CreditCard, X, CheckCircle2,
  Wallet, Banknote, ToggleLeft, ToggleRight, PlayCircle, CalendarDays,
  ExternalLink, Copy, Star, Zap, Check, Square, CheckSquare
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  tagihanService, animeService, donghuaService,
  waifuService, obatService, recordPayment
} from '@/lib/supabase-service';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBackGesture } from '@/hooks/useBackGesture';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts';
import { toast } from '@/hooks/use-toast';
import type { Tagihan, AnimeItem, DonghuaItem } from '@/lib/types';
import {
  getReminderStatus,
  getPaymentInfo,
  isTagihanDueInMonth,
  getActivePeriod,
} from '@/lib/tagihan-cycle';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);
const fmtShort = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(n);
};

type ReportMode = 'tempo' | 'rentang';
type ScheduleView = 'hari-ini' | 'mingguan';

const dayLabels: Record<string, string> = {
  senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis',
  jumat: 'Jumat', sabtu: 'Sabtu', minggu: 'Minggu',
};
const dayOrder = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
const getTodayDay = () => {
  const days = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  return days[new Date().getDay()];
};
const statusLabel = (s: string) =>
  s === 'on-going' ? 'On-Going' : s === 'completed' ? 'Selesai' : 'Direncanakan';

// ─── Quick Pay Modal ────────────────────────────────────────────────────────
const QuickPayModal: React.FC<{
  item: Tagihan | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ item, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');
  const [payFull, setPayFull] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);

  const payMut = useMutation({
    mutationFn: () => recordPayment(item!, amount, payDate, note),
    onSuccess: () => {
      onSuccess();
      onClose();
      toast({ title: 'Pembayaran Dicatat', description: `${fmt(amount)} berhasil dicatat.` });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  useEffect(() => {
    if (!item) return;
    const today = new Date();
    const info = getPaymentInfo(item, today);
    setPayFull(false);
    setAmount(Number(item.cicilan_per_bulan));
    setPayDate(new Date().toISOString().split('T')[0]);
    setNote(info.note);
  }, [item]);

  useEffect(() => {
    if (!item) return;
    setAmount(payFull ? Number(item.sisa_hutang) : Number(item.cicilan_per_bulan));
  }, [payFull, item]);

  if (!item) return null;
  const today = new Date();
  const info = getPaymentInfo(item, today);
  const ic = 'w-full px-3 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all';

  return (
    <Dialog open={!!item} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2 text-base">
            <CreditCard className="w-5 h-5 text-primary" /> Catat Pembayaran
          </DialogTitle>
          <DialogDescription className="text-xs">
            {item.debitur_nama} — {item.barang_nama}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {/* Periode info */}
          <div className="rounded-xl bg-info/5 border border-info/20 p-3 space-y-1">
            <p className="text-xs font-semibold text-info">
              Cicilan ke-{info.period.periodIndex} · {info.period.periodLabel}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Jendela: {info.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              {' '}—{' '}
              {info.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Sudah dibayar: {info.paidCount}x dari {item.jangka_waktu_bulan} bulan
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPayFull(false)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${
                !payFull
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              Cicilan ({fmt(Number(item.cicilan_per_bulan))})
            </button>
            <button
              type="button"
              onClick={() => setPayFull(true)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${
                payFull
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent'
              }`}
            >
              Lunasi Semua
            </button>
          </div>

          <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sisa hutang</span>
              <span className="font-semibold">{fmt(Number(item.sisa_hutang))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Sudah dibayar</span>
              <span className="font-semibold text-success">{fmt(Number(item.total_dibayar))}</span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Jumlah Bayar</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount ? amount.toLocaleString('id-ID') : ''}
                onChange={e => {
                  const v = e.target.value.replace(/\./g, '').replace(/[^0-9]/g, '');
                  setAmount(Number(v) || 0);
                }}
                className={`${ic} pl-10`}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tanggal Bayar</label>
            <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={ic} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Keterangan</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className={ic}
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-muted text-muted-foreground hover:bg-accent transition-all min-h-[44px]"
            >
              Batal
            </button>
            <button
              onClick={() => payMut.mutate()}
              disabled={payMut.isPending || amount <= 0}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 min-h-[44px]"
            >
              {payMut.isPending ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const [billsModalOpen, setBillsModalOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Tagihan | null>(null);
  const [reportMode, setReportMode] = useState<ReportMode>('tempo');
  const [scheduleView, setScheduleView] = useState<ScheduleView>('hari-ini');
  const [detailItem, setDetailItem] = useState<AnimeItem | DonghuaItem | null>(null);
  const [detailType, setDetailType] = useState<'anime' | 'donghua'>('anime');
  const [quickPayTarget, setQuickPayTarget] = useState<Tagihan | null>(null);
  const [payingAll, setPayingAll] = useState(false);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());

  useBackGesture(billsModalOpen, () => setBillsModalOpen(false), 'dashboard-bills');
  useBackGesture(!!detailItem, () => setDetailItem(null), 'dashboard-media-detail');
  useBackGesture(!!quickPayTarget, () => setQuickPayTarget(null), 'dashboard-quickpay');

  const { data: tagihan = [] } = useQuery({ queryKey: ['tagihan'], queryFn: tagihanService.getAll });
  const { data: anime = [] } = useQuery({ queryKey: ['anime'], queryFn: animeService.getAll });
  const { data: donghua = [] } = useQuery({ queryKey: ['donghua'], queryFn: donghuaService.getAll });
  const { data: waifu = [] } = useQuery({ queryKey: ['waifu'], queryFn: waifuService.getAll });
  const { data: obat = [] } = useQuery({ queryKey: ['obat'], queryFn: obatService.getAll });

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const todayDay = getTodayDay();

  // ── Tagihan jatuh tempo bulan ini ──────────────────────────────────────────
  // Mode 'tempo': windowEnd periode aktif jatuh di bulan ini
  const dueThisMonthTempo = useMemo(() =>
    tagihan.filter(t => {
      if (t.status === 'lunas') return false;
      // Cek via isTagihanDueInMonth (windowEnd di bulan ini)
      if (isTagihanDueInMonth(t, currentYear, currentMonth, 'tempo', now)) return true;
      // JUGA tangkap: tagihan yang windowStart ada di bulan ini (window lintas bulan)
      // agar konsisten dengan urgentNow yang pakai getReminderStatus
      const reminder = getReminderStatus(t, now);
      if (reminder.level === 'none') return false;
      const period = reminder.period;
      if (!period) return false;
      const windowStart = period.windowStart;
      return windowStart.getFullYear() === currentYear && windowStart.getMonth() === currentMonth;
    }),
  [tagihan, currentMonth, currentYear]);

  const dueThisMonthRentang = useMemo(() =>
    tagihan.filter(t => isTagihanDueInMonth(t, currentYear, currentMonth, 'rentang', now)),
  [tagihan, currentMonth, currentYear]);

  const dueThisMonth = reportMode === 'tempo' ? dueThisMonthTempo : dueThisMonthRentang;

  // ── Tagihan yang perlu peringatan SEKARANG (dalam jendela bayar atau overdue) ──
  const urgentNow = useMemo(() =>
    tagihan.filter(t => {
      if (t.status === 'lunas' || t.status === 'ditunda') return false;
      const status = getReminderStatus(t, now);
      return status.level === 'critical' || status.level === 'warning' || status.level === 'overdue';
    }),
  [tagihan]);

  const totalAktif = tagihan.filter(t => t.status === 'aktif').length;
  const totalLunas = tagihan.filter(t => t.status === 'lunas').length;
  const totalOverdue = tagihan.filter(t => t.status === 'overdue').length;

  const totalModalTerpisah = tagihan
    .filter(t => t.sumber_modal !== 'modal_bergulir')
    .reduce((s, t) => s + Number(t.harga_awal), 0);
  const totalModalBergulir = tagihan
    .filter(t => t.sumber_modal === 'modal_bergulir')
    .reduce((s, t) => s + Number(t.harga_awal), 0);
  const totalDibayar = tagihan.reduce((s, t) => s + Number(t.total_dibayar), 0);
  const totalKeuntungan = tagihan.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0);
  const monthlyIncome = tagihan
    .filter(t => t.status !== 'lunas')
    .reduce((s, t) => s + Number(t.cicilan_per_bulan), 0);
  const totalDueAmount = dueThisMonth.reduce((s, t) => s + Number(t.cicilan_per_bulan), 0);
  const totalKeuntunganBulanIni = dueThisMonth.reduce(
    (s, t) => s + Number(t.keuntungan_estimasi) / t.jangka_waktu_bulan,
    0
  );

  const weeklySchedule = useMemo(() => {
    const schedule: Record<string, { anime: AnimeItem[]; donghua: DonghuaItem[] }> = {};
    dayOrder.forEach(day => { schedule[day] = { anime: [], donghua: [] }; });
    anime.filter(a => a.status === 'on-going' && a.schedule).forEach(a => {
      a.schedule.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).forEach(day => {
        if (schedule[day]) schedule[day].anime.push(a);
      });
    });
    donghua.filter(d => d.status === 'on-going' && d.schedule).forEach(d => {
      d.schedule.split(',').map(s => s.trim().toLowerCase()).filter(Boolean).forEach(day => {
        if (schedule[day]) schedule[day].donghua.push(d);
      });
    });
    return schedule;
  }, [anime, donghua]);

  const todayItems = weeklySchedule[todayDay] || { anime: [], donghua: [] };
  const hasTodayContent = todayItems.anime.length > 0 || todayItems.donghua.length > 0;
  const hasWeeklyContent = Object.values(weeklySchedule).some(
    s => s.anime.length > 0 || s.donghua.length > 0
  );

  const monthlyProfitData = useMemo(() => {
    const months: { name: string; keuntungan: number; cicilan: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
      let keuntungan = 0, cicilan = 0;
      tagihan.forEach(t => {
        const start = new Date(t.tanggal_mulai);
        const endDate = new Date(start.getFullYear(), start.getMonth() + t.jangka_waktu_bulan, 0);
        if (d >= new Date(start.getFullYear(), start.getMonth(), 1) && d <= endDate) {
          keuntungan += Number(t.keuntungan_estimasi) / t.jangka_waktu_bulan;
          cicilan += Number(t.cicilan_per_bulan);
        }
      });
      months.push({ name: monthName, keuntungan: Math.round(keuntungan), cicilan: Math.round(cicilan) });
    }
    return months;
  }, [tagihan]);

  const cashflowProjection = useMemo(() => {
    const months: { name: string; masuk: number }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
      let masuk = 0;
      tagihan.forEach(t => {
        if (t.status === 'lunas') return;
        const start = new Date(t.tanggal_mulai);
        const endDate = new Date(start.getFullYear(), start.getMonth() + t.jangka_waktu_bulan, 0);
        if (d >= start && d <= endDate) masuk += Number(t.cicilan_per_bulan);
      });
      months.push({ name: monthName, masuk: Math.round(masuk) });
    }
    return months;
  }, [tagihan]);

  useEffect(() => {
    if (!containerRef.current) return;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.fromTo(
      containerRef.current.querySelectorAll('.dash-section'),
      { opacity: 0, y: 30, scale: 0.98 },
      { opacity: 1, y: 0, scale: 1, stagger: 0.08, duration: 0.6 }
    );
    tl.fromTo(
      containerRef.current.querySelectorAll('.quick-link-card'),
      { opacity: 0, scale: 0.8, y: 12 },
      { opacity: 1, scale: 1, y: 0, stagger: 0.06, duration: 0.45, ease: 'back.out(1.7)' },
      '-=0.35'
    );
    tl.fromTo(
      containerRef.current.querySelectorAll('.stat-ring'),
      { scale: 0.7, opacity: 0 },
      { scale: 1, opacity: 1, stagger: 0.05, duration: 0.45, ease: 'back.out(1.4)' },
      '-=0.25'
    );
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  };

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

  // ── Multi-select bill payment ──────────────────────────────────────────────
  const toggleBillSelection = (id: string) => {
    setSelectedBillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBillIds.size === dueThisMonth.length) setSelectedBillIds(new Set());
    else setSelectedBillIds(new Set(dueThisMonth.map(t => t.id)));
  };

  const handlePaySelected = async () => {
    const toPay = dueThisMonth.filter(t => selectedBillIds.has(t.id));
    if (toPay.length === 0) return;
    setPayingAll(true);
    let count = 0;
    for (const t of toPay) {
      try {
        const info = getPaymentInfo(t, now);
        await recordPayment(t, Number(t.cicilan_per_bulan), now.toISOString().split('T')[0], info.note);
        count++;
      } catch {}
    }
    await qc.invalidateQueries({ queryKey: ['tagihan'] });
    setPayingAll(false);
    setBillsModalOpen(false);
    setSelectedBillIds(new Set());
    toast({ title: 'Pembayaran Dicatat', description: `${count} tagihan berhasil dibayar.` });
  };

  const handlePayAll = async () => {
    setPayingAll(true);
    let count = 0;
    for (const t of dueThisMonth) {
      try {
        const info = getPaymentInfo(t, now);
        await recordPayment(t, Number(t.cicilan_per_bulan), now.toISOString().split('T')[0], info.note);
        count++;
      } catch {}
    }
    await qc.invalidateQueries({ queryKey: ['tagihan'] });
    setPayingAll(false);
    setBillsModalOpen(false);
    toast({ title: 'Batch Pembayaran', description: `${count} tagihan berhasil dicatat.` });
  };

  const quickLinks = [
    { to: '/tagihan', icon: Receipt, label: 'Tagihan', cls: 'bg-primary text-primary-foreground shadow-primary/20' },
    { to: '/anime', icon: Tv, label: 'Anime', cls: 'bg-[hsl(217,70%,55%)] text-white shadow-[hsl(217,70%,55%)]/20' },
    { to: '/donghua', icon: Film, label: 'Donghua', cls: 'bg-[hsl(160,45%,42%)] text-white shadow-[hsl(160,45%,42%)]/20' },
    { to: '/waifu', icon: Heart, label: 'Waifu', cls: 'bg-[hsl(340,45%,52%)] text-white shadow-[hsl(340,45%,52%)]/20' },
    { to: '/obat', icon: Pill, label: 'Obat', cls: 'bg-[hsl(38,70%,50%)] text-white shadow-[hsl(38,70%,50%)]/20' },
  ];

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link disalin!', description: url });
  };

  const openDetail = (item: AnimeItem | DonghuaItem, type: 'anime' | 'donghua') => {
    setDetailItem(item);
    setDetailType(type);
  };

  const renderMediaScheduleCard = (item: AnimeItem | DonghuaItem, type: 'anime' | 'donghua') => {
    const Icon = type === 'anime' ? Tv : Film;
    const colorClass = type === 'anime' ? 'text-info' : 'text-success';
    const hasKnownEps = item.episodes !== undefined && item.episodes > 0;
    const watched = item.episodes_watched || 0;
    const progress = hasKnownEps ? Math.min(100, (watched / item.episodes) * 100) : 0;

    return (
      <div
        key={item.id}
        className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
        onClick={() => openDetail(item, type)}
      >
        <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
          {item.cover_url ? (
            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Icon className="w-4 h-4 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-foreground truncate">{item.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${colorClass}`}>
              <Icon className="w-2.5 h-2.5" />{type === 'anime' ? 'Anime' : 'Donghua'}
            </span>
            {hasKnownEps ? (
              <span className="text-[10px] text-muted-foreground">Ep {watched}/{item.episodes}</span>
            ) : watched > 0 ? (
              <span className="text-[10px] text-muted-foreground">{watched} ep</span>
            ) : null}
          </div>
          {hasKnownEps && (
            <div className="h-1 bg-muted rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          {item.streaming_url && (
            <>
              <button
                onClick={e => { e.stopPropagation(); window.open(item.streaming_url, '_blank', 'noopener'); }}
                className="p-2 rounded-lg bg-info/10 text-info hover:bg-info/20 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); copyLink(item.streaming_url); }}
                className="p-2 rounded-lg bg-muted text-muted-foreground hover:bg-accent transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-5">

      {/* ═══════ SECTION 1: Greeting + Quick Links + Data Summary ═══════ */}
      <section className="dash-section rounded-2xl bg-card border border-border/50 p-4 sm:p-5 shadow-sm">
        <h1 className="page-header">{greeting()}, {user?.email?.split('@')[0]} 👋</h1>
        <p className="page-subtitle mb-4">Selamat datang di LIVORIA — pusat arsip informasi pribadimu.</p>

        <p className="section-subtitle mb-2.5">Akses Cepat</p>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {quickLinks.map(({ to, icon: Icon, label, cls }) => (
            <Link
              key={to}
              to={to}
              className={`quick-link-card flex flex-col items-center gap-1.5 p-2.5 sm:p-3 rounded-2xl ${cls} shadow-lg hover:scale-105 hover:-translate-y-0.5 transition-all duration-200`}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[10px] sm:text-xs font-bold leading-none">{label}</span>
            </Link>
          ))}
        </div>

        <p className="section-subtitle mb-2.5">Ringkasan Data</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { icon: Tv, label: 'Anime', count: anime.length, sub: `${anime.filter(a => a.status === 'on-going').length} on-going`, color: 'text-info' },
            { icon: Film, label: 'Donghua', count: donghua.length, sub: `${donghua.filter(d => d.status === 'on-going').length} on-going`, color: 'text-success' },
            { icon: Heart, label: 'Waifu', count: waifu.length, sub: `${waifu.filter(w => w.tier === 'S').length} tier S`, color: 'text-primary' },
            { icon: Pill, label: 'Obat', count: obat.length, sub: 'tersimpan', color: 'text-warning' },
          ].map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/40">
                <Icon className={`w-4 h-4 ${m.color} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold font-display leading-tight">{m.count}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{m.label} · {m.sub}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════ SECTION 2: Jadwal Anime & Donghua ═══════ */}
      {(hasTodayContent || hasWeeklyContent) && (
        <section className="dash-section rounded-2xl bg-card border border-border/50 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-info" />
              <h2 className="section-title">Jadwal Tayang</h2>
            </div>
            <div className="flex gap-1">
              {(['hari-ini', 'mingguan'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setScheduleView(v)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all min-h-[36px] ${
                    scheduleView === v
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {v === 'hari-ini' ? 'Hari Ini' : 'Mingguan'}
                </button>
              ))}
            </div>
          </div>

          {scheduleView === 'hari-ini' ? (
            <div>
              <p className="text-xs text-muted-foreground mb-3">
                {dayLabels[todayDay]} —{' '}
                {hasTodayContent
                  ? `${todayItems.anime.length + todayItems.donghua.length} judul tayang hari ini`
                  : 'Tidak ada jadwal hari ini'}
              </p>
              {hasTodayContent ? (
                <div className="space-y-2">
                  {todayItems.anime.length > 0 && (
                    <>
                      <p className="section-subtitle mb-2">Anime</p>
                      <div className="space-y-2">
                        {todayItems.anime.map(a => renderMediaScheduleCard(a, 'anime'))}
                      </div>
                    </>
                  )}
                  {todayItems.donghua.length > 0 && (
                    <div className={todayItems.anime.length > 0 ? 'mt-3' : ''}>
                      <p className="section-subtitle mb-2">Donghua</p>
                      <div className="space-y-2">
                        {todayItems.donghua.map(d => renderMediaScheduleCard(d, 'donghua'))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <PlayCircle className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Tidak ada anime/donghua tayang hari ini.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {dayOrder.map(day => {
                const items = weeklySchedule[day];
                const total = items.anime.length + items.donghua.length;
                if (total === 0) return null;
                const isToday = day === todayDay;
                return (
                  <div
                    key={day}
                    className={`rounded-xl p-3 ${
                      isToday
                        ? 'bg-primary/5 border border-primary/20'
                        : 'bg-muted/30 border border-border/50'
                    }`}
                  >
                    <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                      {dayLabels[day]}{isToday && ' (Hari Ini)'}
                    </p>
                    <div className="space-y-1.5">
                      {items.anime.map(a => renderMediaScheduleCard(a, 'anime'))}
                      {items.donghua.map(d => renderMediaScheduleCard(d, 'donghua'))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ═══════ SECTION 3: Tagihan ═══════ */}
      {tagihan.length > 0 && (
        <section className="dash-section rounded-2xl bg-card border border-border/50 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <h2 className="section-title">Tagihan</h2>
            </div>
            <Link to="/tagihan" className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
              Kelola <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Compact stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              {
                icon: Wallet,
                value: String(totalAktif + totalOverdue),
                sub: `${totalLunas} lunas`,
                cssVar: '--primary',
                bgClass: 'bg-primary/5 border-primary/10',
                progress: tagihan.length > 0 ? (totalLunas / tagihan.length) * 100 : 0,
              },
              {
                icon: AlertTriangle,
                value: String(totalOverdue),
                sub: totalOverdue > 0 ? 'Overdue!' : 'Aman ✓',
                cssVar: totalOverdue > 0 ? '--destructive' : '--success',
                bgClass: totalOverdue > 0 ? 'bg-destructive/5 border-destructive/10' : 'bg-success/5 border-success/10',
                progress: tagihan.length > 0 ? ((tagihan.length - totalOverdue) / tagihan.length) * 100 : 100,
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
            ].map((s, i) => {
              const Icon = s.icon;
              const r = 14;
              const circ = 2 * Math.PI * r;
              const off = circ - (s.progress / 100) * circ;
              const clr = `hsl(var(${s.cssVar}))`;
              return (
                <div key={i} className={`stat-ring flex items-center gap-2 p-2.5 rounded-xl border ${s.bgClass}`}>
                  <div className="relative w-9 h-9 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="2.5" style={{ stroke: 'hsl(var(--border))' }} />
                      <circle
                        cx="18" cy="18" r={r} fill="none" strokeWidth="2.5"
                        style={{
                          stroke: clr,
                          strokeDasharray: circ,
                          strokeDashoffset: off,
                          strokeLinecap: 'round',
                          transition: 'stroke-dashoffset 0.8s ease',
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5" style={{ color: clr }} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold font-display leading-tight">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Monthly alert */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="section-subtitle">
                Bulan {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </p>
              <button
                onClick={() => setReportMode(reportMode === 'tempo' ? 'rentang' : 'tempo')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-[10px] font-medium text-muted-foreground hover:bg-accent transition-colors min-h-[32px]"
              >
                {reportMode === 'tempo'
                  ? <ToggleLeft className="w-3 h-3" />
                  : <ToggleRight className="w-3 h-3 text-primary" />}
                {reportMode === 'tempo' ? 'Jatuh Tempo' : 'Rentang Bayar'}
              </button>
            </div>

            {/* Peringatan tagihan yang butuh tindakan SEKARANG */}
            {urgentNow.length > 0 && (
              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {urgentNow.length} tagihan perlu perhatian sekarang
                </p>
                <div className="space-y-1.5">
                  {urgentNow.slice(0, 4).map(t => {
                    const status = getReminderStatus(t, now);
                    return (
                      <div key={t.id} className="flex items-center gap-2 rounded-lg bg-background/60 border border-destructive/10 px-2.5 py-2">
                        <button
                          className="flex-1 min-w-0 text-left"
                          onClick={() => setBillsModalOpen(true)}
                        >
                          <p className="text-xs font-semibold truncate">{t.debitur_nama} — {t.barang_nama}</p>
                          <p className={`text-[10px] truncate font-medium ${
                            status.level === 'overdue' || status.level === 'critical'
                              ? 'text-destructive'
                              : 'text-warning'
                          }`}>
                            {status.message.substring(0, 55)}{status.message.length > 55 ? '...' : ''}
                          </p>
                        </button>
                        <button
                          onClick={() => setQuickPayTarget(t)}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-semibold hover:opacity-90 transition-all min-h-[32px]"
                        >
                          <CreditCard className="w-3 h-3" /> Bayar
                        </button>
                      </div>
                    );
                  })}
                </div>
                {urgentNow.length > 4 && (
                  <button
                    onClick={() => setBillsModalOpen(true)}
                    className="text-[10px] text-primary font-medium hover:underline mt-1"
                  >
                    +{urgentNow.length - 4} tagihan lainnya — lihat semua
                  </button>
                )}
              </div>
            )}

            {dueThisMonth.length > 0 ? (
              <button
                onClick={() => {
                  setBillsModalOpen(true);
                  setSelectedBillIds(new Set());
                  setSelectedBill(null);
                }}
                className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl bg-warning/10 border border-warning/20 hover:bg-warning/15 transition-colors min-h-[56px]"
              >
                <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {dueThisMonth.length} tagihan · {fmt(totalDueAmount)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {reportMode === 'tempo' ? 'Jatuh tempo' : 'Rentang bayar'} bulan ini ·
                    Est. keuntungan: {fmt(Math.round(totalKeuntunganBulanIni))} — Klik untuk detail
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-center">
                <p className="text-xs text-muted-foreground">
                  Tidak ada tagihan jatuh tempo bulan ini 🎉
                </p>
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-border/50">
            <div className="rounded-xl bg-muted/20 border border-border/50 p-4">
              <p className="section-subtitle mb-3">Keuntungan & Cicilan (6 Bln)</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyProfitData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={44} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="keuntungan" name="Keuntungan" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 2.5 }} />
                    <Line type="monotone" dataKey="cicilan" name="Cicilan" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2.5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-xl bg-muted/20 border border-border/50 p-4">
              <p className="section-subtitle mb-3">Proyeksi Cashflow (6 Bln ke Depan)</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cashflowProjection}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" width={44} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="masuk" name="Est. Pemasukan" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════ Bills Detail Modal ═══════ */}
      <Dialog
        open={billsModalOpen}
        onOpenChange={v => {
          setBillsModalOpen(v);
          if (!v) { setSelectedBillIds(new Set()); setSelectedBill(null); }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[calc(100vh-2rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Tagihan{' '}
              {now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </DialogTitle>
            <DialogDescription>
              {dueThisMonth.length} tagihan ·{' '}
              {reportMode === 'tempo' ? 'Mode Jatuh Tempo' : 'Mode Rentang Bayar'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mt-2 mb-1">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline min-h-[36px]"
            >
              {selectedBillIds.size === dueThisMonth.length
                ? <CheckSquare className="w-4 h-4" />
                : <Square className="w-4 h-4" />}
              {selectedBillIds.size === dueThisMonth.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
            </button>
            {selectedBillIds.size > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {selectedBillIds.size} dipilih ·{' '}
                {fmt(dueThisMonth.filter(t => selectedBillIds.has(t.id)).reduce((s, t) => s + Number(t.cicilan_per_bulan), 0))}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {dueThisMonth.map(t => {
              const isSelected = selectedBillIds.has(t.id);
              const isExpanded = selectedBill?.id === t.id;
              const info = getPaymentInfo(t, now);
              const reminderStatus = getReminderStatus(t, now);
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border overflow-hidden transition-all ${
                    isSelected ? 'border-primary/40 bg-primary/5' : 'border-border'
                  }`}
                >
                  {isExpanded ? (
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold">{t.debitur_nama}</p>
                        <button
                          onClick={() => setSelectedBill(null)}
                          className="p-1 rounded hover:bg-muted"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Barang:</span>
                          <p className="font-medium">{t.barang_nama}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Cicilan/Bulan:</span>
                          <p className="font-medium">{fmt(Number(t.cicilan_per_bulan))}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sisa Hutang:</span>
                          <p className="font-medium">{fmt(Number(t.sisa_hutang))}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sudah dibayar:</span>
                          <p className="font-medium">{info.paidCount}x cicilan</p>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground">
                            Cicilan ke-{info.period.periodIndex} ({info.period.periodLabel}):
                          </span>
                          <p className="font-medium text-info">
                            {info.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {' '}—{' '}
                            {info.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        {reminderStatus.level !== 'none' && (
                          <div className="col-span-2">
                            <p className={`text-[11px] font-medium leading-relaxed ${
                              reminderStatus.level === 'critical' || reminderStatus.level === 'overdue'
                                ? 'text-destructive'
                                : reminderStatus.level === 'warning'
                                ? 'text-warning'
                                : 'text-info'
                            }`}>
                              {reminderStatus.message}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="pt-2 border-t border-border">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Dibayar: {fmt(Number(t.total_dibayar))}</span>
                          <span>Total: {fmt(Number(t.total_hutang))}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (Number(t.total_dibayar) / Number(t.total_hutang)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => {
                            setSelectedBill(null);
                            setTimeout(() => setQuickPayTarget(t), 150);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-all min-h-[44px]"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Catat Bayar
                        </button>
                        <Link
                          to="/tagihan"
                          state={{ viewItem: t }}
                          onClick={() => setBillsModalOpen(false)}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-medium hover:bg-accent transition-all min-h-[44px]"
                        >
                          Detail <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleBillSelection(t.id)}
                        className="pl-3 py-3 shrink-0 min-w-[36px] min-h-[44px] flex items-center justify-center"
                      >
                        {isSelected
                          ? <CheckSquare className="w-4.5 h-4.5 text-primary" />
                          : <Square className="w-4.5 h-4.5 text-muted-foreground" />}
                      </button>
                      <button
                        onClick={() => setSelectedBill(t)}
                        className="flex-1 text-left flex items-center gap-3 p-3 pl-0 hover:bg-muted/30 transition-colors min-h-[56px]"
                      >
                        <div className={`w-2 h-2 rounded-full shrink-0 ${
                          t.status === 'overdue'
                            ? 'bg-destructive'
                            : getReminderStatus(t, now).level === 'critical'
                            ? 'bg-destructive'
                            : getReminderStatus(t, now).level === 'warning'
                            ? 'bg-warning'
                            : 'bg-info'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.debitur_nama} — {t.barang_nama}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Ke-{info.period.periodIndex} · {info.period.periodLabel} ·
                            Tempo {info.windowEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <p className="text-xs font-semibold shrink-0">
                          {fmt(Number(t.cicilan_per_bulan))}
                        </p>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {dueThisMonth.length > 0 && (
            <div className="pt-3 border-t border-border mt-2 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total cicilan bulan ini:</span>
                <span className="font-bold">{fmt(totalDueAmount)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handlePaySelected}
                  disabled={payingAll || selectedBillIds.size === 0}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-all disabled:opacity-40 min-h-[44px]"
                >
                  <Zap className="w-3.5 h-3.5" />
                  {selectedBillIds.size > 0 ? `Bayar ${selectedBillIds.size} Terpilih` : 'Pilih dulu'}
                </button>
                <button
                  onClick={handlePayAll}
                  disabled={payingAll}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-all disabled:opacity-50 min-h-[44px]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {payingAll ? 'Memproses...' : `Bayar Semua (${dueThisMonth.length})`}
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">
                Pilih tagihan dengan checkbox, lalu tekan "Bayar Terpilih". Atau bayar semua sekaligus.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Single quick-pay modal */}
      <QuickPayModal
        item={quickPayTarget}
        onClose={() => setQuickPayTarget(null)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['tagihan'] })}
      />

      {/* ═══════ Media Detail Modal ═══════ */}
      <Dialog open={!!detailItem} onOpenChange={v => { if (!v) setDetailItem(null); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          {detailItem && (() => {
            const item = detailItem;
            const type = detailType;
            const Icon = type === 'anime' ? Tv : Film;
            const genreArr = item.genre ? item.genre.split(',').map(g => g.trim()).filter(Boolean) : [];
            const scheduleArr = item.schedule ? item.schedule.split(',').map(s => s.trim()).filter(Boolean) : [];
            const hasKnownEps = item.episodes !== undefined && item.episodes > 0;
            const watched = item.episodes_watched || 0;
            const progress = hasKnownEps ? Math.min(100, (watched / item.episodes) * 100) : 0;
            const dayNameMap: Record<string, string> = {
              senin: 'Senin', selasa: 'Selasa', rabu: 'Rabu', kamis: 'Kamis',
              jumat: 'Jumat', sabtu: 'Sabtu', minggu: 'Minggu',
            };
            const genreColorMap: Record<string, string> = {
              'Action': 'bg-destructive/15 text-destructive', 'Adventure': 'bg-success/15 text-success',
              'Comedy': 'bg-pastel-yellow text-warning', 'Drama': 'bg-pastel-purple text-primary',
              'Fantasy': 'bg-pastel-blue text-info', 'Romance': 'bg-pastel-pink text-destructive',
              'Sci-Fi': 'bg-info/15 text-info', 'Slice of Life': 'bg-pastel-green text-success',
              'Supernatural': 'bg-pastel-purple text-primary', 'Martial Arts': 'bg-pastel-orange text-warning',
              'Cultivation': 'bg-pastel-green text-success', 'Isekai': 'bg-success/15 text-success',
            };
            const getGenreColor = (g: string) => genreColorMap[g] || 'bg-muted text-muted-foreground';

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-base sm:text-lg leading-tight">
                    {item.title}
                  </DialogTitle>
                  <DialogDescription className="text-xs sm:text-sm">
                    {statusLabel(item.status)}
                    {item.season && item.season > 0 ? ` · Season ${item.season}` : ''}
                    {item.cour ? ` · ${item.cour}` : ''}
                    {' · '}
                    <span className={type === 'anime' ? 'text-info' : 'text-success'}>
                      {type === 'anime' ? 'Anime' : 'Donghua'}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  {item.cover_url && (
                    <div className="w-full max-w-[160px] mx-auto aspect-[2/3] rounded-xl overflow-hidden border border-border">
                      <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="rounded-xl border border-border p-3 space-y-2">
                    <span className="section-subtitle block">Statistik</span>
                    <div className="grid grid-cols-2 gap-3">
                      {item.rating > 0 && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <span className="text-[10px] text-muted-foreground block mb-1">Rating</span>
                          <span className="flex items-center gap-1 text-sm font-bold">
                            <Star className="w-4 h-4 text-warning fill-current" /> {item.rating}/10
                          </span>
                        </div>
                      )}
                      <div className="rounded-lg bg-muted/50 p-3">
                        <span className="text-[10px] text-muted-foreground block mb-1">Episode</span>
                        {hasKnownEps ? (
                          <>
                            <span className="text-sm font-bold">{watched}/{item.episodes}</span>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                            </div>
                          </>
                        ) : watched > 0 ? (
                          <span className="text-sm font-bold">{watched} ep ditonton</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Belum diketahui</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {genreArr.length > 0 && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-2">Genre</span>
                      <div className="flex flex-wrap gap-1.5">
                        {genreArr.map(g => (
                          <span key={g} className={`px-2 py-0.5 rounded-lg text-xs font-medium ${getGenreColor(g)}`}>
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {scheduleArr.length > 0 && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-2">Jadwal Tayang</span>
                      <div className="flex flex-wrap gap-1.5">
                        {scheduleArr.map(day => (
                          <span key={day} className="px-2.5 py-1 rounded-lg bg-info/10 text-info text-xs font-medium">
                            {dayNameMap[day] || day}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {item.streaming_url && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-2">Link Streaming</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => window.open(item.streaming_url, '_blank', 'noopener')}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-info/10 text-info text-xs font-medium hover:bg-info/20 transition-colors min-h-[44px]"
                        >
                          <ExternalLink className="w-3.5 h-3.5" /> Buka Link
                        </button>
                        <button
                          onClick={() => copyLink(item.streaming_url)}
                          className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs hover:bg-accent transition-colors min-h-[44px]"
                        >
                          <Copy className="w-3.5 h-3.5" /> Salin
                        </button>
                      </div>
                    </div>
                  )}
                  {item.synopsis && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-1.5">Sinopsis</span>
                      <p className="text-sm leading-relaxed">{item.synopsis}</p>
                    </div>
                  )}
                  {item.notes && (
                    <div className="rounded-xl border border-border p-3">
                      <span className="section-subtitle block mb-1.5">Catatan</span>
                      <p className="text-sm leading-relaxed">{item.notes}</p>
                    </div>
                  )}
                  <Link
                    to={`/${type}`}
                    onClick={() => setDetailItem(null)}
                    className="flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all min-h-[44px]"
                  >
                    <Icon className="w-4 h-4" />
                    Buka halaman {type === 'anime' ? 'Anime' : 'Donghua'}
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;