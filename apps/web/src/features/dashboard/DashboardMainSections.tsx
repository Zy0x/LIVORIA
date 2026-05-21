import type { Dispatch, SetStateAction } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Receipt } from 'lucide-react';
import { CashflowChart } from './components/CashflowChart';
import type { CashflowProjectionPoint, MonthlyProfitPoint } from './components/CashflowChart';
import { DataSummary } from './components/DataSummary';
import { QuickLinks } from './components/QuickLinks';
import type { DashboardQuickLink } from './components/QuickLinks';
import { ScheduleSection } from './components/ScheduleSection';
import { TagihanBillsModal } from './components/TagihanBillsModal';
import { TagihanMonthlyAlert } from './components/TagihanMonthlyAlert';
import { TagihanStats } from './components/TagihanStats';
import { ROUTES } from '@/app/route-paths';
import type { AnimeItem, DonghuaItem, Tagihan } from '@/lib/types';
import type { DashboardSummary } from './types/dashboard-summary.types';

type ReportMode = 'tempo' | 'rentang';
type ScheduleView = 'hari-ini' | 'mingguan';

interface DashboardMainSectionsProps {
  user?: { email?: string | null } | null;
  greeting: () => string;
  quickLinks: DashboardQuickLink[];
  summaryLoading: boolean;
  dashboardSummary?: DashboardSummary;
  summaryError: boolean;
  anime: AnimeItem[];
  donghua: DonghuaItem[];
  hasTodayContent: boolean;
  hasWeeklyContent: boolean;
  scheduleView: ScheduleView;
  setScheduleView: (view: ScheduleView) => void;
  dayLabels: Record<string, string>;
  todayDay: string;
  todayItems: { anime: AnimeItem[]; donghua: DonghuaItem[] };
  openDetail: (item: AnimeItem | DonghuaItem, type: 'anime' | 'donghua') => void;
  copyLink: (url: string) => void;
  dayOrder: string[];
  weeklySchedule: Record<string, { anime: AnimeItem[]; donghua: DonghuaItem[] }>;
  tagihan: Tagihan[];
  totalActiveOrOverdue: number;
  totalLunas: number;
  totalOverdue: number;
  totalTagihanCount: number;
  totalModalTerpisah: number;
  totalModalBergulir: number;
  monthlyIncome: number;
  totalKeuntungan: number;
  totalDibayar: number;
  now: Date;
  reportMode: ReportMode;
  setReportMode: (mode: ReportMode) => void;
  urgentNow: Tagihan[];
  setBillsModalOpen: (open: boolean) => void;
  setQuickPayTarget: (tagihan: Tagihan) => void;
  dueThisMonth: Tagihan[];
  setSelectedBillIds: Dispatch<SetStateAction<Set<string>>>;
  setSelectedBill: Dispatch<SetStateAction<Tagihan | null>>;
  totalDueAmount: number;
  totalKeuntunganBulanIni: number;
  monthlyProfitData: MonthlyProfitPoint[];
  cashflowProjection: CashflowProjectionPoint[];
  fmt: (value: number) => string;
  fmtShort: (value: number) => string;
  billsModalOpen: boolean;
  selectedBillIds: Set<string>;
  selectedBill: Tagihan | null;
  toggleSelectAll: () => void;
  toggleBillSelection: (id: string) => void;
  handlePaySelected: () => void;
  handlePayAll: () => void;
  payingAll: boolean;
}

export function DashboardMainSections(props: DashboardMainSectionsProps) {
  const {
    user, greeting, quickLinks, summaryLoading, dashboardSummary, summaryError, anime, donghua,
    hasTodayContent, hasWeeklyContent, scheduleView, setScheduleView, dayLabels, todayDay, todayItems,
    openDetail, copyLink, dayOrder, weeklySchedule, tagihan, totalActiveOrOverdue, totalLunas, totalOverdue,
    totalTagihanCount, totalModalTerpisah, totalModalBergulir, monthlyIncome, totalKeuntungan, totalDibayar,
    now, reportMode, setReportMode, urgentNow, setBillsModalOpen, setQuickPayTarget, dueThisMonth,
    setSelectedBillIds, setSelectedBill, totalDueAmount, totalKeuntunganBulanIni, monthlyProfitData, cashflowProjection,
    fmt, fmtShort, billsModalOpen, selectedBillIds, selectedBill, toggleSelectAll, toggleBillSelection,
    handlePaySelected, handlePayAll, payingAll,
  } = props;

  return (
    <>
            {/* SECTION 1: Greeting + Quick Links + Data Summary */}
            <section className="dash-section rounded-2xl bg-card border border-border/50 p-4 sm:p-5 shadow-sm">
              <h1 className="page-header">{greeting()}, {user?.email?.split('@')[0]} &#128075;</h1>
              <p className="page-subtitle mb-4">Selamat datang di LIVORIA &mdash; pusat arsip informasi pribadimu.</p>

              <QuickLinks items={quickLinks} />

              <DataSummary
                summaryLoading={summaryLoading}
                summaryError={summaryError}
                dashboardSummary={dashboardSummary}
                anime={anime}
                donghua={donghua}
              />
            </section>

            {/* SECTION 2: Jadwal Anime & Donghua */}
            <ScheduleSection
              hasTodayContent={hasTodayContent}
              hasWeeklyContent={hasWeeklyContent}
              scheduleView={scheduleView}
              setScheduleView={setScheduleView}
              dayLabels={dayLabels}
              todayDay={todayDay}
              todayItems={todayItems}
              dayOrder={dayOrder}
              weeklySchedule={weeklySchedule}
              openDetail={openDetail}
              copyLink={copyLink}
            />

            {/* SECTION 3: Tagihan */}
            {tagihan.length > 0 && (
              <section className="dash-section rounded-2xl bg-card border border-border/50 p-4 sm:p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    <h2 className="section-title">Tagihan</h2>
                  </div>
                  <Link to={ROUTES.TAGIHAN} className="text-xs text-primary font-medium hover:underline flex items-center gap-0.5">
                    Kelola <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>

                <TagihanStats
                  totalActiveOrOverdue={totalActiveOrOverdue}
                  totalLunas={totalLunas}
                  totalOverdue={totalOverdue}
                  totalTagihanCount={totalTagihanCount}
                  totalModalTerpisah={totalModalTerpisah}
                  totalModalBergulir={totalModalBergulir}
                  monthlyIncome={monthlyIncome}
                  totalKeuntungan={totalKeuntungan}
                  totalDibayar={totalDibayar}
                  fmtShort={fmtShort}
                />

                <TagihanMonthlyAlert
                  now={now}
                  reportMode={reportMode}
                  setReportMode={setReportMode}
                  urgentNow={urgentNow}
                  dueThisMonth={dueThisMonth}
                  setBillsModalOpen={setBillsModalOpen}
                  setQuickPayTarget={setQuickPayTarget}
                  setSelectedBillIds={setSelectedBillIds}
                  setSelectedBill={setSelectedBill}
                  totalDueAmount={totalDueAmount}
                  totalKeuntunganBulanIni={totalKeuntunganBulanIni}
                  fmt={fmt}
                />

                <CashflowChart
                  monthlyProfitData={monthlyProfitData}
                  cashflowProjection={cashflowProjection}
                  fmt={fmt}
                  fmtShort={fmtShort}
                />
              </section>
            )}

            <TagihanBillsModal
              open={billsModalOpen}
              onOpenChange={setBillsModalOpen}
              now={now}
              reportMode={reportMode}
              dueThisMonth={dueThisMonth}
              selectedBillIds={selectedBillIds}
              selectedBill={selectedBill}
              setSelectedBillIds={setSelectedBillIds}
              setSelectedBill={setSelectedBill}
              setQuickPayTarget={setQuickPayTarget}
              toggleSelectAll={toggleSelectAll}
              toggleBillSelection={toggleBillSelection}
              handlePaySelected={handlePaySelected}
              handlePayAll={handlePayAll}
              payingAll={payingAll}
              totalDueAmount={totalDueAmount}
              fmt={fmt}
            />
    </>
  );
}
