import { lazy, Suspense, useEffect, useRef, useState, useMemo } from 'react';
import { isMobile } from '@/lib/motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
  recordPayment
} from '@/lib/supabase-service';
import {
  DASHBOARD_DAY_LABELS as dayLabels,
  DASHBOARD_DAY_ORDER as dayOrder,
  DashboardMediaScheduleCard,
  DashboardMainSections,
  DashboardQuickPayModal,
  formatShortIDR as fmtShort,
  getMediaStatusLabel as statusLabel,
  getTodayDay,
  useDashboardSummary,
} from '@/features/dashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useBackGesture } from '@/hooks/useBackGesture';
import { toast } from '@/hooks/use-toast';
import type { Tagihan, AnimeItem, DonghuaItem } from '@/lib/types';
import { openExternalUrl } from '@/lib/external';
import { ROUTES } from '@/app/route-paths';
import { QUERY_KEYS } from '@/app/query-keys';
import {
  getReminderStatus,
  getPaymentInfo,
  isTagihanDueInMonth,
  getActivePeriod,
  isTagihanOverdue,
} from '@/lib/tagihan-cycle';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n);

const DashboardCharts = lazy(() => import('@/components/dashboard/DashboardCharts'));

type ReportMode = 'tempo' | 'rentang';
type ScheduleView = 'hari-ini' | 'mingguan';

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

  const {
    data: dashboardSummary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useDashboardSummary();
  const { data: tagihan = [] } = useQuery({ queryKey: QUERY_KEYS.TAGIHAN, queryFn: tagihanService.getAll });
  const { data: anime = [] } = useQuery({ queryKey: QUERY_KEYS.ANIME, queryFn: animeService.getAll });
  const { data: donghua = [] } = useQuery({ queryKey: QUERY_KEYS.DONGHUA, queryFn: donghuaService.getAll });

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

  const totalTagihanCount = dashboardSummary?.tagihanCount ?? tagihan.length;
  const totalLunas = dashboardSummary?.tagihanLunasCount ?? tagihan.filter(t => t.status === 'lunas').length;
  const totalOverdue = tagihan.filter(t => isTagihanOverdue(t, now)).length;
  const totalActiveOrOverdue = tagihan.filter(t => t.status === 'aktif' || isTagihanOverdue(t, now)).length;

  const totalModalTerpisah = dashboardSummary?.tagihanTotalModalTerpisah ?? tagihan
    .filter(t => t.sumber_modal !== 'modal_bergulir')
    .reduce((s, t) => s + Number(t.harga_awal), 0);
  const totalModalBergulir = dashboardSummary?.tagihanTotalModalBergulir ?? tagihan
    .filter(t => t.sumber_modal === 'modal_bergulir')
    .reduce((s, t) => s + Number(t.harga_awal), 0);
  const totalDibayar = dashboardSummary?.tagihanTotalDibayar ?? tagihan.reduce((s, t) => s + Number(t.total_dibayar), 0);
  const totalKeuntungan = dashboardSummary?.tagihanTotalKeuntungan ?? tagihan.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0);
  const monthlyIncome = dashboardSummary?.tagihanMonthlyIncome ?? tagihan
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

  // GSAP entrance animation — desktop only
  useEffect(() => {
    if (isMobile() || !containerRef.current) return;
    const ctx = gsap.context(() => {
      const sections = containerRef.current?.querySelectorAll('.dash-section');
      const quickLinks = containerRef.current?.querySelectorAll('.quick-link-card');
      const statCards = containerRef.current?.querySelectorAll('.stat-card, .kpi-card');

      const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });

      if (sections && sections.length > 0) {
        tl.fromTo(sections,
          { opacity: 0, y: 24, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1, clearProps: 'all' }
        );
      }
      if (statCards && statCards.length > 0) {
        tl.fromTo(statCards,
          { opacity: 0, y: 16, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.5)', clearProps: 'all' },
          '-=0.3'
        );
      }
      if (quickLinks && quickLinks.length > 0) {
        tl.fromTo(quickLinks,
          { opacity: 0, y: 14, scale: 0.93, rotateX: 5 },
          { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.45, stagger: 0.05, ease: 'back.out(1.4)', clearProps: 'all' },
          '-=0.2'
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, [tagihan, anime, donghua]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Malam';
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
    await qc.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN });
    await qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
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
    await qc.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN });
    await qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
    setPayingAll(false);
    setBillsModalOpen(false);
    toast({ title: 'Batch Pembayaran', description: `${count} tagihan berhasil dicatat.` });
  };

  const quickLinks = [
    { to: ROUTES.TAGIHAN, icon: Receipt, label: 'Tagihan', cls: 'bg-primary text-primary-foreground shadow-primary/20' },
    { to: ROUTES.ANIME, icon: Tv, label: 'Anime', cls: 'bg-[hsl(217,70%,55%)] text-white shadow-[hsl(217,70%,55%)]/20' },
    { to: ROUTES.DONGHUA, icon: Film, label: 'Donghua', cls: 'bg-[hsl(160,45%,42%)] text-white shadow-[hsl(160,45%,42%)]/20' },
    { to: ROUTES.WAIFU, icon: Heart, label: 'Waifu', cls: 'bg-[hsl(340,45%,52%)] text-white shadow-[hsl(340,45%,52%)]/20' },
    { to: ROUTES.OBAT, icon: Pill, label: 'Obat', cls: 'bg-[hsl(38,70%,50%)] text-white shadow-[hsl(38,70%,50%)]/20' },
  ];

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({ title: 'Link disalin!', description: url });
  };

  const openDetail = (item: AnimeItem | DonghuaItem, type: 'anime' | 'donghua') => {
    setDetailItem(item);
    setDetailType(type);
  };

  return (
    <div ref={containerRef} className="space-y-5">

      <DashboardMainSections
        user={user}
        greeting={greeting}
        quickLinks={quickLinks}
        summaryLoading={summaryLoading}
        dashboardSummary={dashboardSummary}
        summaryError={summaryError}
        anime={anime}
        donghua={donghua}
        hasTodayContent={hasTodayContent}
        hasWeeklyContent={hasWeeklyContent}
        scheduleView={scheduleView}
        setScheduleView={setScheduleView}
        dayLabels={dayLabels}
        todayDay={todayDay}
        todayItems={todayItems}
        openDetail={openDetail}
        copyLink={copyLink}
        dayOrder={dayOrder}
        weeklySchedule={weeklySchedule}
        tagihan={tagihan}
        totalActiveOrOverdue={totalActiveOrOverdue}
        totalLunas={totalLunas}
        totalOverdue={totalOverdue}
        totalTagihanCount={totalTagihanCount}
        totalModalTerpisah={totalModalTerpisah}
        totalModalBergulir={totalModalBergulir}
        monthlyIncome={monthlyIncome}
        totalKeuntungan={totalKeuntungan}
        totalDibayar={totalDibayar}
        now={now}
        reportMode={reportMode}
        setReportMode={setReportMode}
        urgentNow={urgentNow}
        setBillsModalOpen={setBillsModalOpen}
        setQuickPayTarget={setQuickPayTarget}
        dueThisMonth={dueThisMonth}
        setSelectedBillIds={setSelectedBillIds}
        setSelectedBill={setSelectedBill}
        totalDueAmount={totalDueAmount}
        totalKeuntunganBulanIni={totalKeuntunganBulanIni}
        monthlyProfitData={monthlyProfitData}
        cashflowProjection={cashflowProjection}
        fmt={fmt}
        fmtShort={fmtShort}
        billsModalOpen={billsModalOpen}
        selectedBillIds={selectedBillIds}
        selectedBill={selectedBill}
        toggleSelectAll={toggleSelectAll}
        toggleBillSelection={toggleBillSelection}
        handlePaySelected={handlePaySelected}
        handlePayAll={handlePayAll}
        payingAll={payingAll}
      />

      {/* Single quick-pay modal */}
      <DashboardQuickPayModal
        item={quickPayTarget}
        onClose={() => setQuickPayTarget(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN });
          qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
        }}
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
                          onClick={() => openExternalUrl(item.streaming_url)}
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
