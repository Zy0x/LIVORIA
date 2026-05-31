import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import gsap from 'gsap';
import { Film, Heart, NotebookPen, Pill, Receipt, Tv } from 'lucide-react';

import { QUERY_KEYS } from '@/app/query-keys';
import { ROUTES } from '@/app/route-paths';
import {
  DASHBOARD_DAY_LABELS as dayLabels,
  DASHBOARD_DAY_ORDER as dayOrder,
  DashboardMainSections,
  DashboardMediaDetailDialog,
  DashboardQuickPayModal,
  formatShortIDR as fmtShort,
  useDashboardData,
} from '@/features/dashboard';
import { useAuth } from '@/hooks/useAuth';
import { useBackGesture } from '@/hooks/useBackGesture';
import { toast } from '@/hooks/use-toast';
import { isMobile } from '@/lib/motion';
import { recordPayment } from '@/lib/supabase-service';
import { getPaymentInfo } from '@/lib/tagihan-cycle';
import type { AnimeItem, DonghuaItem, Tagihan } from '@/lib/types';

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

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
  const dashboard = useDashboardData(reportMode);

  useBackGesture(billsModalOpen, () => setBillsModalOpen(false), 'dashboard-bills');
  useBackGesture(!!detailItem, () => setDetailItem(null), 'dashboard-media-detail');
  useBackGesture(!!quickPayTarget, () => setQuickPayTarget(null), 'dashboard-quickpay');

  useEffect(() => {
    if (isMobile() || !containerRef.current) return;
    const ctx = gsap.context(() => {
      const sections = containerRef.current?.querySelectorAll('.dash-section');
      const quickLinks = containerRef.current?.querySelectorAll('.quick-link-card');
      const statCards = containerRef.current?.querySelectorAll('.stat-card, .kpi-card');
      const tl = gsap.timeline({ defaults: { ease: 'power3.out', force3D: true } });

      if (sections && sections.length > 0) {
        tl.fromTo(
          sections,
          { opacity: 0, y: 24, scale: 0.97 },
          { opacity: 1, y: 0, scale: 1, duration: 0.55, stagger: 0.1, clearProps: 'all' },
        );
      }
      if (statCards && statCards.length > 0) {
        tl.fromTo(
          statCards,
          { opacity: 0, y: 16, scale: 0.94 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.5)', clearProps: 'all' },
          '-=0.3',
        );
      }
      if (quickLinks && quickLinks.length > 0) {
        tl.fromTo(
          quickLinks,
          { opacity: 0, y: 14, scale: 0.93, rotateX: 5 },
          { opacity: 1, y: 0, scale: 1, rotateX: 0, duration: 0.45, stagger: 0.05, ease: 'back.out(1.4)', clearProps: 'all' },
          '-=0.2',
        );
      }
    }, containerRef);
    return () => ctx.revert();
  }, [dashboard.tagihan, dashboard.anime, dashboard.donghua]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Selamat Pagi';
    if (h < 17) return 'Selamat Siang';
    return 'Selamat Malam';
  };

  const quickLinks = [
    { to: ROUTES.TAGIHAN, icon: Receipt, label: 'Tagihan', cls: 'bg-primary text-primary-foreground shadow-primary/20' },
    { to: ROUTES.ANIME, icon: Tv, label: 'Anime', cls: 'bg-[hsl(217,70%,55%)] text-white shadow-[hsl(217,70%,55%)]/20' },
    { to: ROUTES.DONGHUA, icon: Film, label: 'Donghua', cls: 'bg-[hsl(160,45%,42%)] text-white shadow-[hsl(160,45%,42%)]/20' },
    { to: ROUTES.WAIFU, icon: Heart, label: 'Waifu', cls: 'bg-[hsl(340,45%,52%)] text-white shadow-[hsl(340,45%,52%)]/20' },
    { to: ROUTES.OBAT, icon: Pill, label: 'Obat', cls: 'bg-[hsl(38,70%,50%)] text-white shadow-[hsl(38,70%,50%)]/20' },
    { to: ROUTES.CATATAN, icon: NotebookPen, label: 'Catatan', cls: 'bg-[hsl(260,46%,54%)] text-white shadow-[hsl(260,46%,54%)]/20' },
  ];

  const invalidateDashboardBills = async () => {
    await qc.invalidateQueries({ queryKey: QUERY_KEYS.TAGIHAN });
    await qc.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD_SUMMARY });
  };

  const toggleBillSelection = (id: string) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedBillIds.size === dashboard.dueThisMonth.length) setSelectedBillIds(new Set());
    else setSelectedBillIds(new Set(dashboard.dueThisMonth.map((t) => t.id)));
  };

  const handlePaySelected = async () => {
    const toPay = dashboard.dueThisMonth.filter((t) => selectedBillIds.has(t.id));
    if (toPay.length === 0) return;
    setPayingAll(true);
    let count = 0;
    for (const t of toPay) {
      try {
        const info = getPaymentInfo(t, dashboard.now);
        await recordPayment(t, Number(t.cicilan_per_bulan), dashboard.now.toISOString().split('T')[0], info.note);
        count++;
      } catch {}
    }
    await invalidateDashboardBills();
    setPayingAll(false);
    setBillsModalOpen(false);
    setSelectedBillIds(new Set());
    toast({ title: 'Pembayaran Dicatat', description: `${count} tagihan berhasil dibayar.` });
  };

  const handlePayAll = async () => {
    setPayingAll(true);
    let count = 0;
    for (const t of dashboard.dueThisMonth) {
      try {
        const info = getPaymentInfo(t, dashboard.now);
        await recordPayment(t, Number(t.cicilan_per_bulan), dashboard.now.toISOString().split('T')[0], info.note);
        count++;
      } catch {}
    }
    await invalidateDashboardBills();
    setPayingAll(false);
    setBillsModalOpen(false);
    toast({ title: 'Batch Pembayaran', description: `${count} tagihan berhasil dicatat.` });
  };

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
        summaryLoading={dashboard.summaryLoading}
        dashboardSummary={dashboard.dashboardSummary}
        summaryError={dashboard.summaryError}
        anime={dashboard.anime}
        donghua={dashboard.donghua}
        hasTodayContent={dashboard.hasTodayContent}
        hasWeeklyContent={dashboard.hasWeeklyContent}
        scheduleView={scheduleView}
        setScheduleView={setScheduleView}
        dayLabels={dayLabels}
        todayDay={dashboard.todayDay}
        todayItems={dashboard.todayItems}
        openDetail={openDetail}
        copyLink={copyLink}
        dayOrder={dayOrder}
        weeklySchedule={dashboard.weeklySchedule}
        tagihan={dashboard.tagihan}
        totalActiveOrOverdue={dashboard.totalActiveOrOverdue}
        totalLunas={dashboard.totalLunas}
        totalOverdue={dashboard.totalOverdue}
        totalTagihanCount={dashboard.totalTagihanCount}
        totalModalTerpisah={dashboard.totalModalTerpisah}
        totalModalBergulir={dashboard.totalModalBergulir}
        monthlyIncome={dashboard.monthlyIncome}
        totalKeuntungan={dashboard.totalKeuntungan}
        totalDibayar={dashboard.totalDibayar}
        now={dashboard.now}
        reportMode={reportMode}
        setReportMode={setReportMode}
        urgentNow={dashboard.urgentNow}
        setBillsModalOpen={setBillsModalOpen}
        setQuickPayTarget={setQuickPayTarget}
        dueThisMonth={dashboard.dueThisMonth}
        setSelectedBillIds={setSelectedBillIds}
        setSelectedBill={setSelectedBill}
        totalDueAmount={dashboard.totalDueAmount}
        totalKeuntunganBulanIni={dashboard.totalKeuntunganBulanIni}
        monthlyProfitData={dashboard.monthlyProfitData}
        cashflowProjection={dashboard.cashflowProjection}
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

      <DashboardQuickPayModal
        item={quickPayTarget}
        onClose={() => setQuickPayTarget(null)}
        onSuccess={invalidateDashboardBills}
      />

      <DashboardMediaDetailDialog
        item={detailItem}
        type={detailType}
        onClose={() => setDetailItem(null)}
        onCopyLink={copyLink}
      />
    </div>
  );
};

export default Dashboard;
