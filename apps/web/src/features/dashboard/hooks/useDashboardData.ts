import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/app/query-keys';
import { animeService, donghuaService, tagihanService } from '@/lib/supabase-service';
import {
  getReminderStatus,
  isTagihanDueInMonth,
  isTagihanOverdue,
} from '@/lib/tagihan-cycle';
import type { AnimeItem, DonghuaItem } from '@/lib/types';
import { DASHBOARD_DAY_ORDER, getTodayDay } from '../domain/dashboard-display';
import { useDashboardSummary } from './useDashboardSummary';

type ReportMode = 'tempo' | 'rentang';

export function useDashboardData(reportMode: ReportMode) {
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

  const dueThisMonthTempo = useMemo(
    () => tagihan.filter((t) => {
      if (t.status === 'lunas') return false;
      if (isTagihanDueInMonth(t, currentYear, currentMonth, 'tempo', now)) return true;
      const reminder = getReminderStatus(t, now);
      if (reminder.level === 'none') return false;
      const period = reminder.period;
      if (!period) return false;
      const windowStart = period.windowStart;
      return windowStart.getFullYear() === currentYear && windowStart.getMonth() === currentMonth;
    }),
    [tagihan, currentMonth, currentYear],
  );

  const dueThisMonthRentang = useMemo(
    () => tagihan.filter((t) => isTagihanDueInMonth(t, currentYear, currentMonth, 'rentang', now)),
    [tagihan, currentMonth, currentYear],
  );

  const dueThisMonth = reportMode === 'tempo' ? dueThisMonthTempo : dueThisMonthRentang;

  const urgentNow = useMemo(
    () => tagihan.filter((t) => {
      if (t.status === 'lunas' || t.status === 'ditunda') return false;
      const status = getReminderStatus(t, now);
      return status.level === 'critical' || status.level === 'warning' || status.level === 'overdue';
    }),
    [tagihan],
  );

  const weeklySchedule = useMemo(() => {
    const schedule: Record<string, { anime: AnimeItem[]; donghua: DonghuaItem[] }> = {};
    DASHBOARD_DAY_ORDER.forEach((day) => {
      schedule[day] = { anime: [], donghua: [] };
    });

    anime.filter((a) => a.status === 'on-going' && a.schedule).forEach((a) => {
      a.schedule.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).forEach((day) => {
        if (schedule[day]) schedule[day].anime.push(a);
      });
    });
    donghua.filter((d) => d.status === 'on-going' && d.schedule).forEach((d) => {
      d.schedule.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).forEach((day) => {
        if (schedule[day]) schedule[day].donghua.push(d);
      });
    });
    return schedule;
  }, [anime, donghua]);

  const todayItems = weeklySchedule[todayDay] || { anime: [], donghua: [] };
  const hasTodayContent = todayItems.anime.length > 0 || todayItems.donghua.length > 0;
  const hasWeeklyContent = Object.values(weeklySchedule).some((s) => s.anime.length > 0 || s.donghua.length > 0);

  const monthlyProfitData = useMemo(() => {
    const months: { name: string; keuntungan: number; cicilan: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = d.toLocaleDateString('id-ID', { month: 'short' });
      let keuntungan = 0;
      let cicilan = 0;
      tagihan.forEach((t) => {
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
      tagihan.forEach((t) => {
        if (t.status === 'lunas') return;
        const start = new Date(t.tanggal_mulai);
        const endDate = new Date(start.getFullYear(), start.getMonth() + t.jangka_waktu_bulan, 0);
        if (d >= start && d <= endDate) masuk += Number(t.cicilan_per_bulan);
      });
      months.push({ name: monthName, masuk: Math.round(masuk) });
    }
    return months;
  }, [tagihan]);

  const totals = {
    totalTagihanCount: dashboardSummary?.tagihanCount ?? tagihan.length,
    totalLunas: dashboardSummary?.tagihanLunasCount ?? tagihan.filter((t) => t.status === 'lunas').length,
    totalOverdue: tagihan.filter((t) => isTagihanOverdue(t, now)).length,
    totalActiveOrOverdue: tagihan.filter((t) => t.status === 'aktif' || isTagihanOverdue(t, now)).length,
    totalModalTerpisah: dashboardSummary?.tagihanTotalModalTerpisah ?? tagihan
      .filter((t) => t.sumber_modal !== 'modal_bergulir')
      .reduce((s, t) => s + Number(t.harga_awal), 0),
    totalModalBergulir: dashboardSummary?.tagihanTotalModalBergulir ?? tagihan
      .filter((t) => t.sumber_modal === 'modal_bergulir')
      .reduce((s, t) => s + Number(t.harga_awal), 0),
    totalDibayar: dashboardSummary?.tagihanTotalDibayar ?? tagihan.reduce((s, t) => s + Number(t.total_dibayar), 0),
    totalKeuntungan: dashboardSummary?.tagihanTotalKeuntungan ?? tagihan.reduce((s, t) => s + Number(t.keuntungan_estimasi), 0),
    monthlyIncome: dashboardSummary?.tagihanMonthlyIncome ?? tagihan
      .filter((t) => t.status !== 'lunas')
      .reduce((s, t) => s + Number(t.cicilan_per_bulan), 0),
    totalDueAmount: dueThisMonth.reduce((s, t) => s + Number(t.cicilan_per_bulan), 0),
    totalKeuntunganBulanIni: dueThisMonth.reduce(
      (s, t) => s + Number(t.keuntungan_estimasi) / t.jangka_waktu_bulan,
      0,
    ),
  };

  return {
    dashboardSummary,
    summaryLoading,
    summaryError,
    tagihan,
    anime,
    donghua,
    now,
    todayDay,
    dueThisMonth,
    urgentNow,
    weeklySchedule,
    todayItems,
    hasTodayContent,
    hasWeeklyContent,
    monthlyProfitData,
    cashflowProjection,
    ...totals,
  };
}
