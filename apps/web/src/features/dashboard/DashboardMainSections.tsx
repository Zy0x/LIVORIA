import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Banknote, CalendarDays, CheckCircle2, CheckSquare, ChevronRight, CreditCard, Film, Heart, Pill, PlayCircle, Receipt, Square, ToggleLeft, ToggleRight, TrendingUp, Tv, Wallet, X, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DashboardMediaScheduleCard } from './components/DashboardMediaScheduleCard';
import { getPaymentInfo, getReminderStatus, isTagihanOverdue } from '@/lib/tagihan-cycle';

const DashboardCharts = lazy(() => import('@/components/dashboard/DashboardCharts'));

export function DashboardMainSections(props: any) {
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
              {summaryLoading && !dashboardSummary && (
                <p className="text-[10px] text-muted-foreground mb-2">Memuat ringkasan dashboard...</p>
              )}
              {summaryError && !dashboardSummary && (
                <p className="text-[10px] text-destructive mb-2">
                  Ringkasan belum bisa dimuat. Data detail tetap ditampilkan jika tersedia.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { icon: Tv, label: 'Anime', count: dashboardSummary?.animeCount ?? anime.length, sub: `${dashboardSummary?.animeOngoingCount ?? anime.filter(a => a.status === 'on-going').length} on-going`, color: 'text-info' },
                  { icon: Film, label: 'Donghua', count: dashboardSummary?.donghuaCount ?? donghua.length, sub: `${dashboardSummary?.donghuaOngoingCount ?? donghua.filter(d => d.status === 'on-going').length} on-going`, color: 'text-success' },
                  { icon: Heart, label: 'Waifu', count: dashboardSummary?.waifuCount ?? 0, sub: `${dashboardSummary?.waifuTierSCount ?? 0} tier S`, color: 'text-primary' },
                  { icon: Pill, label: 'Obat', count: dashboardSummary?.obatCount ?? 0, sub: 'tersimpan', color: 'text-warning' },
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
                              {todayItems.anime.map(a => <DashboardMediaScheduleCard key={a.id} item={a} type="anime" onOpenDetail={openDetail} onCopyLink={copyLink} />)}
                            </div>
                          </>
                        )}
                        {todayItems.donghua.length > 0 && (
                          <div className={todayItems.anime.length > 0 ? 'mt-3' : ''}>
                            <p className="section-subtitle mb-2">Donghua</p>
                            <div className="space-y-2">
                              {todayItems.donghua.map(d => <DashboardMediaScheduleCard key={d.id} item={d} type="donghua" onOpenDetail={openDetail} onCopyLink={copyLink} />)}
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
                            {items.anime.map(a => <DashboardMediaScheduleCard key={a.id} item={a} type="anime" onOpenDetail={openDetail} onCopyLink={copyLink} />)}
                            {items.donghua.map(d => <DashboardMediaScheduleCard key={d.id} item={d} type="donghua" onOpenDetail={openDetail} onCopyLink={copyLink} />)}
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
                      value: String(totalActiveOrOverdue),
                      sub: `${totalLunas} lunas`,
                      cssVar: '--primary',
                      bgClass: 'bg-primary/5 border-primary/10',
                      progress: totalTagihanCount > 0 ? (totalLunas / totalTagihanCount) * 100 : 0,
                    },
                    {
                      icon: AlertTriangle,
                      value: String(totalOverdue),
                      sub: totalOverdue > 0 ? 'Overdue!' : 'Aman ✓',
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
                <Suspense fallback={<div className="h-40 rounded-xl bg-muted/20 border border-border/50 animate-pulse" />}>
                  <DashboardCharts
                    monthlyProfitData={monthlyProfitData}
                    cashflowProjection={cashflowProjection}
                    fmt={fmt}
                    fmtShort={fmtShort}
                  />
                </Suspense>
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
                                isTagihanOverdue(t, now)
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
    </>
  );
}
