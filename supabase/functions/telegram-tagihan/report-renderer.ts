import { htmlEscape } from './telegram-helpers.ts'

function fmt(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(value).replace(/\u00a0/g, ' ')
}

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

function dateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addDays(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function sameDate(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate()
  return new Date(year, month, Math.min(Math.max(day, 1), lastDay))
}

function getPaidCount(t: any) {
  const cicilan = safeNumber(t.cicilan_per_bulan)
  const totalPeriods = Math.max(1, safeNumber(t.jangka_waktu_bulan))
  if (cicilan <= 0) return 0
  return Math.min(totalPeriods, Math.max(0, Math.floor(safeNumber(t.total_dibayar) / cicilan)))
}

function isEffectivelyPaidOff(t: any) {
  const totalHutang = safeNumber(t.total_hutang)
  const totalDibayar = safeNumber(t.total_dibayar)
  const totalPeriods = Math.max(1, safeNumber(t.jangka_waktu_bulan))

  return t.status === 'lunas'
    || (totalHutang > 0 && totalDibayar >= totalHutang)
    || (totalHutang > 0 && safeNumber(t.sisa_hutang) <= 0)
    || getPaidCount(t) >= totalPeriods
}

function getBayarTempoDays(t: any) {
  if (t.tgl_bayar_tanggal && t.tgl_tempo_tanggal) {
    return {
      bayarDay: new Date(t.tgl_bayar_tanggal).getDate(),
      tempoDay: new Date(t.tgl_tempo_tanggal).getDate(),
    }
  }
  if (t.tgl_bayar_hari && t.tgl_tempo_hari) {
    return {
      bayarDay: Number(t.tgl_bayar_hari),
      tempoDay: Number(t.tgl_tempo_hari),
    }
  }
  return null
}

function buildMonthlyWindow(t: any, periodIndex: number) {
  const days = getBayarTempoDays(t)
  if (!days) return null

  const firstPayDate = t.tgl_bayar_tanggal ? new Date(t.tgl_bayar_tanggal) : new Date(t.tanggal_mulai)
  const rawMonth = firstPayDate.getMonth() + (periodIndex - 1)
  const periodMonth = ((rawMonth % 12) + 12) % 12
  const periodYear = firstPayDate.getFullYear() + Math.floor(rawMonth / 12)
  const windowStart = clampDay(periodYear, periodMonth, days.bayarDay)
  const crossesMonth = days.tempoDay < days.bayarDay
  const tempoMonth = crossesMonth ? periodMonth + 1 : periodMonth
  const windowEnd = clampDay(
    periodYear + Math.floor(tempoMonth / 12),
    ((tempoMonth % 12) + 12) % 12,
    days.tempoDay,
  )

  return { windowStart, windowEnd }
}

function getBillingPeriod(t: any, periodIndex: number) {
  if (t.jenis_tempo === 'bulanan' && getBayarTempoDays(t)) {
    return buildMonthlyWindow(t, periodIndex)
  }

  const start = t.tanggal_mulai ? new Date(t.tanggal_mulai) : new Date()
  if (t.tanggal_jatuh_tempo) {
    return {
      windowStart: t.tanggal_mulai_bayar ? new Date(t.tanggal_mulai_bayar) : start,
      windowEnd: new Date(t.tanggal_jatuh_tempo),
    }
  }

  return {
    windowStart: start,
    windowEnd: new Date(start.getFullYear(), start.getMonth() + periodIndex, start.getDate()),
  }
}

function getActivePayment(t: any, today: Date) {
  if (t.status === 'ditunda' || isEffectivelyPaidOff(t)) return null
  const totalPeriods = Math.max(1, safeNumber(t.jangka_waktu_bulan))
  const paidCount = getPaidCount(t)
  const nextIdx = Math.min(paidCount + 1, totalPeriods)
  const period = getBillingPeriod(t, nextIdx)
  if (!period) return null

  const windowStart = dateOnly(period.windowStart)
  const windowEnd = dateOnly(period.windowEnd)
  const todayDate = dateOnly(today)

  return {
    item: t,
    nextIdx,
    windowStart,
    windowEnd,
    isOverdue: todayDate > windowEnd,
  }
}

function isActiveInCurrentMonth(active: ReturnType<typeof getActivePayment>, today: Date) {
  if (!active) return false
  if (active.isOverdue) return true
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return active.windowStart <= monthEnd && active.windowEnd >= monthStart
}

const TAGIHAN_REPORT_SELECT_COLUMNS = [
  'id',
  'user_id',
  'debitur_nama',
  'barang_nama',
  'status',
  'harga_awal',
  'cicilan_per_bulan',
  'jangka_waktu_bulan',
  'tanggal_mulai',
  'tanggal_jatuh_tempo',
  'total_dibayar',
  'total_hutang',
  'sisa_hutang',
  'keuntungan_estimasi',
  'catatan',
  'sumber_modal',
  'jenis_tempo',
  'tgl_bayar_tanggal',
  'tgl_tempo_tanggal',
  'tgl_bayar_hari',
  'tgl_tempo_hari',
].join(',')

export async function generateReport(supabase: any, userId: string, type: string, reminderDays = 3): Promise<string> {
  const now = new Date()
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const { data: tagihan } = await supabase.from('tagihan').select(TAGIHAN_REPORT_SELECT_COLUMNS).eq('user_id', userId)
  if (!tagihan || tagihan.length === 0) return '📋 Tidak ada tagihan yang terdaftar.'

  const fmtCurrency = (value: number) => fmt(Number.isFinite(value) ? value : 0)
  const fmtDate = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  if (type === '/info-laporan' || type === '/laporan_detail') {
    const openTagihan = tagihan.filter((t: any) => t.status !== 'ditunda' && !isEffectivelyPaidOff(t))
    const monthlyActive = openTagihan
      .map((t: any) => getActivePayment(t, now))
      .filter((active: any) => isActiveInCurrentMonth(active, now))
      .map((active: any) => ({ ...active.item, _nextIdx: active.nextIdx, _we: active.windowEnd, _isOverdue: active.isOverdue }))
    const aktif = openTagihan.filter((t: any) => t.status === 'aktif')
    const lunas = tagihan.filter((t: any) => isEffectivelyPaidOff(t))
    const overdue = openTagihan.filter((t: any) => getActivePayment(t, now)?.isOverdue)
    const totalSisa = openTagihan.reduce((sum: number, t: any) => sum + safeNumber(t.sisa_hutang), 0)
    const monthlyIncome = monthlyActive.reduce((sum: number, t: any) => sum + safeNumber(t.cicilan_per_bulan), 0)

    if (monthlyActive.length === 0) {
      return `✅ Tidak ada tagihan aktif untuk bulan ${monthName}.`
    }

    if (type === '/info-laporan') {
      return `📊 <b>Ringkasan Laporan — ${monthName}</b>\n\n` +
        `📋 <b>Status:</b> ${aktif.length} Aktif | ${overdue.length} Overdue\n` +
        `💰 <b>Total Piutang:</b> ${fmtCurrency(totalSisa)}\n` +
        `📈 <b>Cicilan/Bulan:</b> ${fmtCurrency(monthlyIncome)}\n\n` +
        `💡 Gunakan <code>/laporan detail</code> untuk rincian.`
    }

    let msg = `📊 <b>Laporan Tagihan — ${monthName}</b>\n\n`
    msg += `📋 <b>Ringkasan:</b>\n`
    msg += `├ Total Tagihan: ${tagihan.length}\n`
    msg += `├ Aktif: ${aktif.length} | Lunas: ${lunas.length} | Overdue: ${overdue.length}\n`
    msg += `└ Total Piutang: ${fmtCurrency(totalSisa)}\n\n`
    msg += `💰 <b>Cicilan Masuk/Bulan:</b> ${fmtCurrency(monthlyIncome)}\n\n`

    const exclLuar = openTagihan.filter((t: any) => t.sumber_modal !== 'dana_luar')
    const totalModal = exclLuar.reduce((sum: number, t: any) => sum + safeNumber(t.harga_awal), 0)
    const totalDibayar = tagihan.reduce((sum: number, t: any) => sum + safeNumber(t.total_dibayar), 0)
    const totalKeuntungan = openTagihan.reduce((sum: number, t: any) => sum + safeNumber(t.keuntungan_estimasi), 0)

    msg += `📈 <b>Modal & Profit</b>\n`
    msg += `├ Total Modal: ${fmtCurrency(totalModal)}\n`
    msg += `├ Total Terkumpul: ${fmtCurrency(totalDibayar)}\n`
    msg += `└ Est. Keuntungan: ${fmtCurrency(totalKeuntungan)}\n\n`

    const grouped: Record<string, any[]> = {}
    monthlyActive.forEach((t: any) => {
      const key = String(t.debitur_nama || 'Tanpa nama')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    })

    if (Object.keys(grouped).length > 0) {
      msg += `📦 <b>Daftar Piutang Aktif</b>\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `\n👤 <b>${htmlEscape(debitur)}</b>\n`
        items.forEach((t: any) => {
          msg += `├ ${htmlEscape(t.barang_nama)} - ${fmtCurrency(safeNumber(t.sisa_hutang))}\n`
        })
      }
    }
    return msg
  }

  if (type === '/info-tempo' || type === '/jatuh_tempo_detail' || type === '/jatuh_tempo_cron') {
    const todayDate = dateOnly(now)
    const urgentNow: any[] = []

    tagihan.forEach((t: any) => {
      const active = getActivePayment(t, now)
      if (!active) return

      if (type === '/jatuh_tempo_cron') {
        const targetDate = addDays(todayDate, reminderDays)
        const isTarget = sameDate(active.windowEnd, targetDate)
        if (isTarget || active.isOverdue) {
          urgentNow.push({ ...t, _nextIdx: active.nextIdx, _we: active.windowEnd, _isOverdue: active.isOverdue })
        }
      } else if (todayDate >= addDays(active.windowEnd, -7) || active.isOverdue) {
        urgentNow.push({ ...t, _nextIdx: active.nextIdx, _we: active.windowEnd, _isOverdue: active.isOverdue })
      }
    })

    if (urgentNow.length === 0) return '✅ Tidak ada tagihan jatuh tempo dekat ini.'

    const grouped: Record<string, any[]> = {}
    urgentNow.forEach((t: any) => {
      const key = String(t.debitur_nama || 'Tanpa nama')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    })

    if (type === '/info-tempo') {
      let msg = `📋 <b>Ringkasan Jatuh Tempo</b>\n📅 ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `👤 <b>${htmlEscape(debitur)}</b>\n`
        let subtotal = 0
        items.forEach((t: any) => {
          const cicilan = safeNumber(t.cicilan_per_bulan)
          subtotal += cicilan
          const labelCicilan = safeNumber(t.jangka_waktu_bulan) > 1 ? ` (Ke-${t._nextIdx})` : ''
          const warning = t._isOverdue ? ' ⚠️' : ''
          msg += `├ ${htmlEscape(t.barang_nama)}${labelCicilan} - ${fmtCurrency(cicilan)}${warning}\n`
        })
        msg += `└ <b>Total: ${fmtCurrency(subtotal)}</b>\n\n`
      }
      const totalAll = urgentNow.reduce((sum, t) => sum + safeNumber(t.cicilan_per_bulan), 0)
      msg += `💰 <b>TOTAL TAGIHAN: ${fmtCurrency(totalAll)}</b>`
      return msg
    }

    const title = type === '/jatuh_tempo_cron' ? '⏰ <b>Reminder Jatuh Tempo</b>' : '📋 <b>Detail Jatuh Tempo</b>'
    let msg = `${title}\n📅 ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n`
    for (const [debitur, items] of Object.entries(grouped)) {
      msg += `👤 <b>${htmlEscape(debitur)}</b>\n`
      items.forEach((t: any) => {
        const cicilan = safeNumber(t.cicilan_per_bulan)
        const totalHutang = safeNumber(t.total_hutang)
        const totalDibayar = safeNumber(t.total_dibayar)
        const progress = totalHutang > 0 ? Math.round((totalDibayar / totalHutang) * 100) : 0
        const labelCicilan = safeNumber(t.jangka_waktu_bulan) > 1 ? `Cicilan ke-${t._nextIdx} dari ${t.jangka_waktu_bulan} bulan` : 'Pembayaran tunggal'
        msg += `├ <b>${htmlEscape(t.barang_nama)}</b>\n`
        msg += `│ ${labelCicilan}\n`
        msg += `│ Jumlah: ${fmtCurrency(cicilan)}\n`
        msg += `│ Tempo: ${fmtDate(t._we)}${t._isOverdue ? ' ⚠️' : ''}\n`
        msg += `│ Progress: ${progress}% (${fmtCurrency(totalDibayar)}/${fmtCurrency(totalHutang)})\n`
        msg += `│ Sisa: ${fmtCurrency(safeNumber(t.sisa_hutang))}\n`
        if (t.catatan) msg += `│ Catatan: ${htmlEscape(t.catatan)}\n`
      })
      const subtotal = items.reduce((sum, t) => sum + safeNumber(t.cicilan_per_bulan), 0)
      msg += `└ <b>Subtotal: ${fmtCurrency(subtotal)}</b>\n\n`
    }
    return msg
  }

  if (type === '/info-overdue' || type === '/overdue_detail') {
    const overdue = tagihan
      .map((t: any) => getActivePayment(t, now))
      .filter((active: any) => active?.isOverdue)
      .map((active: any) => ({ ...active.item, _nextIdx: active.nextIdx, _we: active.windowEnd, _isOverdue: active.isOverdue }))
    if (overdue.length === 0) return '✅ Tidak ada tagihan overdue.'

    const grouped: Record<string, any[]> = {}
    overdue.forEach((t: any) => {
      const key = String(t.debitur_nama || 'Tanpa nama')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    })

    if (type === '/info-overdue') {
      let msg = `⚠️ <b>Ringkasan Overdue (${overdue.length})</b>\n\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `👤 <b>${htmlEscape(debitur)}</b>\n`
        items.forEach((t: any) => {
          msg += `├ ${htmlEscape(t.barang_nama)} - ${fmtCurrency(safeNumber(t.sisa_hutang))} ⚠️\n`
        })
        msg += '\n'
      }
      return `${msg}💡 Gunakan <code>/overdue detail</code> untuk rincian.`
    }

    let msg = `⚠️ <b>Detail Tagihan Overdue</b>\n\n`
    for (const [debitur, items] of Object.entries(grouped)) {
      msg += `👤 <b>${htmlEscape(debitur)}</b>\n`
      items.forEach((t: any) => {
        msg += `├ <b>${htmlEscape(t.barang_nama)}</b>\n`
        msg += `│ Sisa hutang: ${fmtCurrency(safeNumber(t.sisa_hutang))}\n`
        msg += `│ Cicilan/bulan: ${fmtCurrency(safeNumber(t.cicilan_per_bulan))}\n`
        msg += `│ Total hutang: ${fmtCurrency(safeNumber(t.total_hutang))}\n`
        if (t.catatan) msg += `│ Catatan: ${htmlEscape(t.catatan)}\n`
      })
      msg += '\n'
    }
    return msg
  }

  return 'Tipe tidak dikenali.'
}
