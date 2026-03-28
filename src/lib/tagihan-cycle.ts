/**
 * LIVORIA - Billing Cycle Utilities (v2 - Date-Based)
 *
 * Logika utama:
 * - Jadwal bulanan kini menggunakan tanggal konkret:
 *   tgl_bayar_tanggal = tanggal mulai bisa bayar (misal "2026-03-25")
 *   tgl_tempo_tanggal = tanggal jatuh tempo PERTAMA (misal "2026-04-05")
 *
 * - Dari dua tanggal tersebut, sistem menghitung pola:
 *   • dayOfMonth(bayar) → hari mulai bayar setiap bulan
 *   • dayOfMonth(tempo) → hari jatuh tempo setiap bulan
 *   • Jika tempo < bayar dalam sebulan → jendela lintas bulan (bayar bln N, tempo bln N+1)
 *
 * - Periode ke-N dihitung dari tanggal_mulai pinjaman
 * - Jika debitur belum bayar periode sebelumnya → TELAT
 *
 * Backward compatibility:
 * - Jika tgl_bayar_tanggal/tgl_tempo_tanggal tidak ada, fallback ke tgl_bayar_hari/tgl_tempo_hari (lama)
 */

import type { Tagihan } from './types';

export interface CyclePeriod {
  periodIndex: number;       // 1-based: periode ke-1, ke-2, dst
  periodMonth: number;       // 0-based month (0=Jan) - bulan "label" periode ini
  periodYear: number;
  periodLabel: string;       // "Januari 2026"
  windowStart: Date;         // tanggal mulai bisa bayar
  windowEnd: Date;           // tanggal jatuh tempo
  isPaid: boolean;           // sudah dibayar periode ini
}

// ─── Helper: hitung hari-dalam-bulan dari tanggal konkret ────────────────────

/**
 * Dari tanggal konkret (YYYY-MM-DD), ambil hari-dalam-bulan
 */
function dayOfMonth(dateStr: string): number {
  return new Date(dateStr).getDate();
}

/**
 * Apakah tempo < bayar dalam satu bulan? (jendela lintas bulan)
 * Contoh: bayar tgl 25, tempo tgl 5 → lintas bulan
 */
function isCrossMonth(bayarDay: number, tempoDay: number): boolean {
  return tempoDay < bayarDay;
}

// ─── Helper: bangun windowStart & windowEnd untuk periode ke-N ──────────────

/**
 * Hitung jendela bayar untuk periode ke-N berdasarkan:
 * - Pola hari dari tgl_bayar_tanggal & tgl_tempo_tanggal
 * - Bulan referensi = bulan period (periodYear, periodMonth)
 */
function buildWindowFromDays(
  bayarDay: number,
  tempoDay: number,
  periodYear: number,
  periodMonth: number // 0-based
): { windowStart: Date; windowEnd: Date } {
  // Clamp day ke hari terakhir bulan jika perlu
  const clampDay = (y: number, m: number, d: number): Date => {
    const lastDay = new Date(y, m + 1, 0).getDate();
    return new Date(y, m, Math.min(d, lastDay));
  };

  const windowStart = clampDay(periodYear, periodMonth, bayarDay);

  let windowEnd: Date;
  if (isCrossMonth(bayarDay, tempoDay)) {
    const nextM = periodMonth === 11 ? 0 : periodMonth + 1;
    const nextY = periodMonth === 11 ? periodYear + 1 : periodYear;
    windowEnd = clampDay(nextY, nextM, tempoDay);
  } else {
    windowEnd = clampDay(periodYear, periodMonth, tempoDay);
  }

  return { windowStart, windowEnd };
}

/**
 * Dapatkan bayarDay & tempoDay dari tagihan.
 * Prioritas: tgl_bayar_tanggal (baru) → tgl_bayar_hari (lama)
 */
function getBayarTempoDay(tagihan: Tagihan): { bayarDay: number; tempoDay: number } | null {
  // Baru: tanggal konkret
  if (tagihan.tgl_bayar_tanggal && tagihan.tgl_tempo_tanggal) {
    return {
      bayarDay: dayOfMonth(tagihan.tgl_bayar_tanggal),
      tempoDay: dayOfMonth(tagihan.tgl_tempo_tanggal),
    };
  }
  // Lama: hari dalam bulan saja
  if (tagihan.tgl_bayar_hari && tagihan.tgl_tempo_hari) {
    return {
      bayarDay: Number(tagihan.tgl_bayar_hari),
      tempoDay: Number(tagihan.tgl_tempo_hari),
    };
  }
  return null;
}

// ─── Core: getBillingPeriod ──────────────────────────────────────────────────

/**
 * Hitung periode ke-N berdasarkan tanggal_mulai pinjaman.
 * Bulan ke-1 = bulan dari tanggal_mulai.
 */
export function getBillingPeriod(tagihan: Tagihan, periodIndex: number): CyclePeriod {
  const start = new Date(tagihan.tanggal_mulai);

  // Untuk jadwal bulanan dengan tanggal konkret, gunakan bulan dari tgl_bayar_tanggal
  // sebagai referensi, BUKAN dari tanggal_mulai (akad).
  // Karena pembayaran pertama biasanya di bulan setelah akad.
  const days = getBayarTempoDay(tagihan);
  let periodMonth: number;
  let periodYear: number;

  if (tagihan.jenis_tempo === 'bulanan' && tagihan.tgl_bayar_tanggal && days) {
    // Gunakan bulan dari tgl_bayar_tanggal sebagai periode 1
    const firstPayDate = new Date(tagihan.tgl_bayar_tanggal);
    const rawMonth = firstPayDate.getMonth() + (periodIndex - 1);
    periodMonth = ((rawMonth % 12) + 12) % 12;
    periodYear = firstPayDate.getFullYear() + Math.floor(rawMonth / 12);
  } else {
    const rawMonth = start.getMonth() + periodIndex - 1;
    periodMonth = ((rawMonth % 12) + 12) % 12;
    periodYear = start.getFullYear() + Math.floor(rawMonth / 12);
  }

  const periodLabel = new Date(periodYear, periodMonth, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  let windowStart: Date;
  let windowEnd: Date;

  if (tagihan.jenis_tempo === 'bulanan' && days) {
    const { windowStart: ws, windowEnd: we } = buildWindowFromDays(
      days.bayarDay,
      days.tempoDay,
      periodYear,
      periodMonth
    );
    windowStart = ws;
    windowEnd = we;
  } else if (tagihan.tanggal_jatuh_tempo) {
    windowEnd = new Date(tagihan.tanggal_jatuh_tempo);
    windowStart = tagihan.tanggal_mulai_bayar
      ? new Date(tagihan.tanggal_mulai_bayar)
      : new Date(tagihan.tanggal_mulai);
  } else {
    windowStart = new Date(tagihan.tanggal_mulai);
    windowEnd = new Date(tagihan.tanggal_mulai);
    windowEnd.setMonth(windowEnd.getMonth() + periodIndex);
  }

  const cicilan = Number(tagihan.cicilan_per_bulan);
  const paidCount = cicilan > 0 ? Math.floor(Number(tagihan.total_dibayar) / cicilan) : 0;
  const isPaid = tagihan.status === 'lunas' || paidCount >= periodIndex;

  return {
    periodIndex,
    periodMonth,
    periodYear,
    periodLabel,
    windowStart,
    windowEnd,
    isPaid,
  };
}

/**
 * Hitung periode kalender saat ini berdasarkan tanggal hari ini.
 * N = selisih bulan antara tanggal_mulai dan hari ini + 1
 */
export function getCurrentPeriodIndex(tagihan: Tagihan, today: Date = new Date()): number {
  // Jika ada tgl_bayar_tanggal, gunakan itu sebagai referensi bulan pertama
  const refDate = tagihan.tgl_bayar_tanggal
    ? new Date(tagihan.tgl_bayar_tanggal)
    : new Date(tagihan.tanggal_mulai);
  const diffMonths =
    (today.getFullYear() - refDate.getFullYear()) * 12 +
    (today.getMonth() - refDate.getMonth());
  return Math.max(1, diffMonths + 1);
}

/**
 * Dapatkan periode aktif (belum dibayar, paling awal) untuk tagihan.
 *
 * Periode aktif = periode pertama yang BELUM dibayar.
 * BUKAN berdasarkan kalender. Jika debitur mengedit/batalkan pembayaran,
 * periode aktif akan mundur ke periode yang belum terbayar.
 */
export function getActivePeriod(tagihan: Tagihan, today: Date = new Date()): CyclePeriod {
  const cicilan = Number(tagihan.cicilan_per_bulan);
  const paidCount = cicilan > 0 ? Math.floor(Number(tagihan.total_dibayar) / cicilan) : 0;

  const nextUnpaidIndex = paidCount + 1;
  const activePeriodIndex = Math.min(nextUnpaidIndex, tagihan.jangka_waktu_bulan);

  return getBillingPeriod(tagihan, activePeriodIndex);
}

// ─── Reminder status ─────────────────────────────────────────────────────────

export type ReminderLevel = 'none' | 'info' | 'warning' | 'critical' | 'overdue';

export interface ReminderStatus {
  level: ReminderLevel;
  message: string;
  period: CyclePeriod | null;
  nextPeriod: CyclePeriod | null;
}

export function getReminderStatus(tagihan: Tagihan, today: Date = new Date()): ReminderStatus {
  // ── Tagihan lunas → tidak perlu reminder ──────────────────────────────────
  if (tagihan.status === 'lunas') {
    return { level: 'none', message: '', period: null, nextPeriod: null };
  }

  const cicilan = Number(tagihan.cicilan_per_bulan);
  const paidCount = cicilan > 0 ? Math.floor(Number(tagihan.total_dibayar) / cicilan) : 0;
  const totalPeriods = tagihan.jangka_waktu_bulan;

  // ── Semua cicilan sudah terbayar meski status bukan 'lunas' ──────────────
  // (edge case: misalnya status 'aktif' tapi pembayaran sudah klop)
  if (paidCount >= totalPeriods) {
    return { level: 'none', message: 'Semua cicilan sudah lunas.', period: null, nextPeriod: null };
  }

  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const activePeriod = getActivePeriod(tagihan, today);

  // ── Periode melebihi jangka waktu → selesai ───────────────────────────────
  if (activePeriod.periodIndex > totalPeriods) {
    return { level: 'none', message: 'Tagihan sudah selesai.', period: activePeriod, nextPeriod: null };
  }

  const windowStartDate = new Date(
    activePeriod.windowStart.getFullYear(),
    activePeriod.windowStart.getMonth(),
    activePeriod.windowStart.getDate()
  );
  const windowEndDate = new Date(
    activePeriod.windowEnd.getFullYear(),
    activePeriod.windowEnd.getMonth(),
    activePeriod.windowEnd.getDate()
  );

  const inWindow = todayDate >= windowStartDate && todayDate <= windowEndDate;
  const isOverdue = todayDate > windowEndDate && !activePeriod.isPaid;
  const isDueToday = todayDate.getTime() === windowEndDate.getTime();
  const daysToEnd = Math.ceil((windowEndDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

  const nextPeriodIndex = activePeriod.periodIndex + 1;
  const nextPeriod = nextPeriodIndex <= totalPeriods
    ? getBillingPeriod(tagihan, nextPeriodIndex)
    : null;

  const currentCalendarPeriod = getCurrentPeriodIndex(tagihan, today);
  const lateMonths = Math.max(0, currentCalendarPeriod - activePeriod.periodIndex);
  const latePrefix = lateMonths > 0 ? `[TELAT ${lateMonths} bulan] ` : '';

  // ── Periode aktif sudah dibayar ───────────────────────────────────────────
  if (activePeriod.isPaid) {
    // Sudah tidak ada periode berikutnya
    if (!nextPeriod) {
      return { level: 'none', message: 'Semua tagihan lunas.', period: activePeriod, nextPeriod: null };
    }

    const nextWindowStart = new Date(
      nextPeriod.windowStart.getFullYear(),
      nextPeriod.windowStart.getMonth(),
      nextPeriod.windowStart.getDate()
    );

    // Belum masuk jendela bayar berikutnya → hanya info ringan
    if (todayDate < nextWindowStart) {
      return {
        level: 'info',
        message: `Cicilan ${activePeriod.periodLabel} sudah dibayar. Periode berikutnya (${nextPeriod.periodLabel}): bayar mulai ${nextPeriod.windowStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        period: activePeriod,
        nextPeriod,
      };
    }

    // Sudah masuk jendela bayar berikutnya → tidak perlu reminder lagi di sini
    // (akan ditangani oleh iterasi berikutnya saat activePeriod bergeser ke nextPeriod)
    return { level: 'none', message: '', period: activePeriod, nextPeriod };
  }

  // ── Periode belum dibayar & sudah melewati jatuh tempo ───────────────────
  if (isOverdue) {
    const daysLate = Math.ceil((todayDate.getTime() - windowEndDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      level: 'overdue',
      message: `${latePrefix}Tagihan ${activePeriod.periodLabel} sudah melewati jatuh tempo ${daysLate} hari! Jatuh tempo: ${windowEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
      period: activePeriod,
      nextPeriod,
    };
  }

  // ── Periode belum dibayar & masih dalam jendela ───────────────────────────
  if (inWindow) {
    if (isDueToday) {
      return {
        level: 'critical',
        message: `${latePrefix}HARI INI adalah jatuh tempo cicilan ${activePeriod.periodLabel}! Pastikan pembayaran diterima sebelum akhir hari.`,
        period: activePeriod,
        nextPeriod,
      };
    }
    if (daysToEnd <= 2) {
      return {
        level: 'critical',
        message: `${latePrefix}Jatuh tempo cicilan ${activePeriod.periodLabel} dalam ${daysToEnd} hari (${windowEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}). Segera ingatkan debitur.`,
        period: activePeriod,
        nextPeriod,
      };
    }
    if (daysToEnd <= 5) {
      return {
        level: 'warning',
        message: `${latePrefix}Cicilan ${activePeriod.periodLabel} jatuh tempo ${daysToEnd} hari lagi (${windowEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}). Rentang bayar: ${windowStartDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })} — ${windowEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
        period: activePeriod,
        nextPeriod,
      };
    }
    return {
      level: 'warning',
      message: `${latePrefix}Dalam rentang pembayaran cicilan ${activePeriod.periodLabel}. Jatuh tempo: ${windowEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} (${daysToEnd} hari lagi).`,
      period: activePeriod,
      nextPeriod,
    };
  }

  // ── Periode belum dibayar & belum masuk jendela ───────────────────────────
  return {
    level: 'info',
    message: `${latePrefix}Cicilan ${activePeriod.periodLabel} belum masuk jendela pembayaran. Mulai bayar: ${windowStartDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} s/d ${windowEndDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`,
    period: activePeriod,
    nextPeriod,
  };
}

/**
 * Cek apakah tagihan perlu ditampilkan di laporan bulan tertentu.
 */
export function isTagihanDueInMonth(
  tagihan: Tagihan,
  year: number,
  month: number,
  mode: 'tempo' | 'rentang' = 'tempo',
  today: Date = new Date()
): boolean {
  if (tagihan.status === 'lunas') return false;

  const cicilan = Number(tagihan.cicilan_per_bulan);
  const paidCount = cicilan > 0 ? Math.floor(Number(tagihan.total_dibayar) / cicilan) : 0;
  if (paidCount >= tagihan.jangka_waktu_bulan) return false;

  const activePeriod = getActivePeriod(tagihan, today);
  if (activePeriod.isPaid) return false;
  if (activePeriod.periodIndex > tagihan.jangka_waktu_bulan) return false;

  const windowEnd = activePeriod.windowEnd;
  const windowStart = activePeriod.windowStart;

  if (mode === 'tempo') {
    // Tangkap jika windowEnd di bulan ini ATAU windowStart di bulan ini
    // (untuk kasus jendela lintas bulan, misal bayar 15 Mar → tempo 5 Apr)
    const windowEndInMonth = windowEnd.getFullYear() === year && windowEnd.getMonth() === month;
    const windowStartInMonth = windowStart.getFullYear() === year && windowStart.getMonth() === month;
    return windowEndInMonth || windowStartInMonth;
  } else {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);
    return windowStart <= monthEnd && windowEnd >= monthStart;
  }
}

/**
 * Keterangan otomatis untuk pencatatan pembayaran.
 */
export function getPaymentNote(tagihan: Tagihan, today: Date = new Date()): string {
  const activePeriod = getActivePeriod(tagihan, today);
  const currentCalendar = getCurrentPeriodIndex(tagihan, today);
  const lateMonths = Math.max(0, currentCalendar - activePeriod.periodIndex);
  const lateTag = lateMonths > 0 ? ' (telat)' : '';
  return `Cicilan bulan ke-${activePeriod.periodIndex} (${activePeriod.periodLabel})${lateTag}`;
}

/**
 * Info lengkap untuk modal pembayaran.
 */
export function getPaymentInfo(tagihan: Tagihan, today: Date = new Date()) {
  const activePeriod = getActivePeriod(tagihan, today);
  const cicilan = Number(tagihan.cicilan_per_bulan);
  const paidCount = cicilan > 0 ? Math.floor(Number(tagihan.total_dibayar) / cicilan) : 0;
  const currentCalendar = getCurrentPeriodIndex(tagihan, today);
  const lateMonths = Math.max(0, currentCalendar - activePeriod.periodIndex);

  return {
    period: activePeriod,
    paidCount,
    nextPaymentIndex: activePeriod.periodIndex,
    windowStart: activePeriod.windowStart,
    windowEnd: activePeriod.windowEnd,
    periodLabel: activePeriod.periodLabel,
    note: getPaymentNote(tagihan, today),
    isLate: lateMonths > 0,
    lateMonths,
    currentCalendarPeriod: currentCalendar,
  };
}

// ─── Helper: format tanggal jadwal untuk display ─────────────────────────────

/**
 * Tampilkan info jadwal bulanan dari tagihan (untuk UI).
 * Mengembalikan string seperti "Bayar tgl 25 — Tempo tgl 5 (lintas bulan)"
 */
export function formatJadwalBulanan(tagihan: Tagihan): string | null {
  if (tagihan.jenis_tempo !== 'bulanan') return null;

  const days = getBayarTempoDay(tagihan);
  if (!days) return null;

  const { bayarDay, tempoDay } = days;
  const cross = isCrossMonth(bayarDay, tempoDay);

  return `Bayar tgl ${bayarDay} — Tempo tgl ${tempoDay}${cross ? ' (lintas bulan)' : ''}`;
}

/**
 * Dari tagihan, kembalikan tanggal mulai bayar bulan depan (untuk preview UI).
 * Berguna untuk menampilkan "Periode berikutnya mulai..."
 */
export function getNextWindowStart(tagihan: Tagihan, today: Date = new Date()): Date | null {
  const days = getBayarTempoDay(tagihan);
  if (!days || tagihan.jenis_tempo !== 'bulanan') return null;

  const cicilan = Number(tagihan.cicilan_per_bulan);
  const paidCount = cicilan > 0 ? Math.floor(Number(tagihan.total_dibayar) / cicilan) : 0;
  const nextIndex = paidCount + 1;

  const period = getBillingPeriod(tagihan, nextIndex);
  return period.windowStart;
}