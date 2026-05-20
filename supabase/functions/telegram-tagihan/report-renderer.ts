import { htmlEscape } from './telegram-helpers.ts'

function fmt(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    currency: 'IDR',
    minimumFractionDigits: 0,
    style: 'currency',
  }).format(value)
}

function safeNumber(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0
}

export async function generateReport(supabase: any, userId: string, type: string, reminderDays = 3): Promise<string> {
  const now = new Date()
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const { data: tagihan } = await supabase.from('tagihan').select('*').eq('user_id', userId)
  if (!tagihan || tagihan.length === 0) return 'Tidak ada tagihan.'

  const fmtCurrency = (value: number) => fmt(Number.isFinite(value) ? value : 0)
  const fmtDate = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  if (type === '/info-laporan' || type === '/laporan_detail') {
    const aktif = tagihan.filter((t: any) => t.status === 'aktif')
    const lunas = tagihan.filter((t: any) => t.status === 'lunas')
    const overdue = tagihan.filter((t: any) => t.status === 'overdue')
    const totalSisa = tagihan.reduce((sum: number, t: any) => sum + safeNumber(t.sisa_hutang), 0)
    const monthlyIncome = tagihan.filter((t: any) => t.status !== 'lunas').reduce((sum: number, t: any) => sum + safeNumber(t.cicilan_per_bulan), 0)

    if (type === '/info-laporan') {
      return `<b>Ringkasan Laporan - ${monthName}</b>\n\n` +
        `Status: ${aktif.length} Aktif | ${overdue.length} Overdue\n` +
        `Total Piutang: ${fmtCurrency(totalSisa)}\n` +
        `Cicilan/Bulan: ${fmtCurrency(monthlyIncome)}\n\n` +
        `Gunakan <code>/laporan detail</code> untuk rincian.`
    }

    let msg = `<b>Detail Laporan - ${monthName}</b>\n\n`
    msg += `<b>Ringkasan</b>\n`
    msg += `- Total: ${tagihan.length}\n`
    msg += `- Aktif: ${aktif.length} | Lunas: ${lunas.length} | Overdue: ${overdue.length}\n`
    msg += `- Total Piutang: ${fmtCurrency(totalSisa)}\n\n`
    msg += `<b>Cicilan Masuk/Bulan:</b> ${fmtCurrency(monthlyIncome)}\n\n`

    const exclLuar = tagihan.filter((t: any) => t.sumber_modal !== 'dana_luar')
    const totalModal = exclLuar.reduce((sum: number, t: any) => sum + safeNumber(t.harga_awal), 0)
    const totalDibayar = tagihan.reduce((sum: number, t: any) => sum + safeNumber(t.total_dibayar), 0)
    const totalKeuntungan = tagihan.reduce((sum: number, t: any) => sum + safeNumber(t.keuntungan_estimasi), 0)

    msg += `<b>Modal & Profit</b>\n`
    msg += `- Total Modal: ${fmtCurrency(totalModal)}\n`
    msg += `- Total Terkumpul: ${fmtCurrency(totalDibayar)}\n`
    msg += `- Est. Keuntungan: ${fmtCurrency(totalKeuntungan)}\n\n`

    const grouped: Record<string, any[]> = {}
    tagihan.filter((t: any) => t.status !== 'lunas').forEach((t: any) => {
      const key = String(t.debitur_nama || 'Tanpa nama')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    })

    if (Object.keys(grouped).length > 0) {
      msg += `<b>Daftar Piutang Aktif</b>\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `\n<b>${htmlEscape(debitur)}</b>\n`
        items.forEach((t: any) => {
          msg += `- ${htmlEscape(t.barang_nama)}: ${fmtCurrency(safeNumber(t.sisa_hutang))}\n`
        })
      }
    }
    return msg
  }

  if (type === '/info-tempo' || type === '/jatuh_tempo_detail' || type === '/jatuh_tempo_cron') {
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const urgentNow: any[] = []

    tagihan.forEach((t: any) => {
      if (t.status === 'lunas' || t.status === 'ditunda') return
      const cicilan = safeNumber(t.cicilan_per_bulan)
      const paidCount = cicilan > 0 ? Math.floor(safeNumber(t.total_dibayar) / cicilan) : 0
      const nextIdx = paidCount + 1
      let windowEnd: Date

      if (t.jenis_tempo === 'bulanan' && (t.tgl_bayar_tanggal || t.tgl_bayar_hari)) {
        const tempoDay = t.tgl_tempo_tanggal ? new Date(t.tgl_tempo_tanggal).getDate() : Number(t.tgl_tempo_hari)
        const start = t.tgl_bayar_tanggal ? new Date(t.tgl_bayar_tanggal) : new Date(t.tanggal_mulai)
        const periodDate = new Date(start.getFullYear(), start.getMonth() + (nextIdx - 1), 1)
        const lastDay = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate()
        windowEnd = new Date(periodDate.getFullYear(), periodDate.getMonth(), Math.min(tempoDay, lastDay))
      } else {
        windowEnd = t.tanggal_jatuh_tempo ? new Date(t.tanggal_jatuh_tempo) : new Date(new Date(t.tanggal_mulai).setMonth(new Date(t.tanggal_mulai).getMonth() + nextIdx))
      }

      const isOverdue = todayDate > windowEnd
      if (type === '/jatuh_tempo_cron') {
        const targetDate = new Date(todayDate.getTime() + (86_400_000 * reminderDays))
        const isTarget = windowEnd.getFullYear() === targetDate.getFullYear() && windowEnd.getMonth() === targetDate.getMonth() && windowEnd.getDate() === targetDate.getDate()
        if (isTarget || isOverdue) urgentNow.push({ ...t, _nextIdx: nextIdx, _we: windowEnd, _isOverdue: isOverdue })
      } else if (todayDate >= new Date(windowEnd.getTime() - (86_400_000 * 7)) || isOverdue) {
        urgentNow.push({ ...t, _nextIdx: nextIdx, _we: windowEnd, _isOverdue: isOverdue })
      }
    })

    if (urgentNow.length === 0) return 'Tidak ada tagihan jatuh tempo dekat ini.'

    const grouped: Record<string, any[]> = {}
    urgentNow.forEach((t: any) => {
      const key = String(t.debitur_nama || 'Tanpa nama')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    })

    if (type === '/info-tempo') {
      let msg = `<b>Ringkasan Jatuh Tempo</b>\n${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `<b>${htmlEscape(debitur)}</b>\n`
        let subtotal = 0
        items.forEach((t: any) => {
          const cicilan = safeNumber(t.cicilan_per_bulan)
          subtotal += cicilan
          const labelCicilan = safeNumber(t.jangka_waktu_bulan) > 1 ? ` (Ke-${t._nextIdx})` : ''
          msg += `- ${htmlEscape(t.barang_nama)}${labelCicilan}: ${fmtCurrency(cicilan)}${t._isOverdue ? ' - OVERDUE' : ''}\n`
        })
        msg += `Total: ${fmtCurrency(subtotal)}\n\n`
      }
      const totalAll = urgentNow.reduce((sum, t) => sum + safeNumber(t.cicilan_per_bulan), 0)
      msg += `<b>Total tagihan: ${fmtCurrency(totalAll)}</b>\n\nGunakan <code>/tempo detail</code> untuk rincian.`
      return msg
    }

    const title = type === '/jatuh_tempo_cron' ? '<b>Reminder Jatuh Tempo</b>' : '<b>Detail Jatuh Tempo</b>'
    let msg = `${title}\n${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n`
    for (const [debitur, items] of Object.entries(grouped)) {
      msg += `<b>${htmlEscape(debitur)}</b>\n`
      items.forEach((t: any) => {
        const cicilan = safeNumber(t.cicilan_per_bulan)
        const totalHutang = safeNumber(t.total_hutang)
        const totalDibayar = safeNumber(t.total_dibayar)
        const progress = totalHutang > 0 ? Math.round((totalDibayar / totalHutang) * 100) : 0
        const labelCicilan = safeNumber(t.jangka_waktu_bulan) > 1 ? `Cicilan ke-${t._nextIdx} dari ${t.jangka_waktu_bulan} bulan` : 'Pembayaran tunggal'
        msg += `- <b>${htmlEscape(t.barang_nama)}</b>\n`
        msg += `  ${labelCicilan}\n`
        msg += `  Jumlah: ${fmtCurrency(cicilan)}\n`
        msg += `  Tempo: ${fmtDate(t._we)}${t._isOverdue ? ' - OVERDUE' : ''}\n`
        msg += `  Progress: ${progress}% (${fmtCurrency(totalDibayar)}/${fmtCurrency(totalHutang)})\n`
        msg += `  Sisa: ${fmtCurrency(safeNumber(t.sisa_hutang))}\n`
        if (t.catatan) msg += `  Catatan: ${htmlEscape(t.catatan)}\n`
      })
      const subtotal = items.reduce((sum, t) => sum + safeNumber(t.cicilan_per_bulan), 0)
      msg += `Subtotal: ${fmtCurrency(subtotal)}\n\n`
    }
    return msg
  }

  if (type === '/info-overdue' || type === '/overdue_detail') {
    const overdue = tagihan.filter((t: any) => t.status === 'overdue')
    if (overdue.length === 0) return 'Tidak ada tagihan overdue.'

    const grouped: Record<string, any[]> = {}
    overdue.forEach((t: any) => {
      const key = String(t.debitur_nama || 'Tanpa nama')
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    })

    if (type === '/info-overdue') {
      let msg = '<b>Ringkasan Overdue</b>\n\n'
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `<b>${htmlEscape(debitur)}</b>\n`
        items.forEach((t: any) => {
          msg += `- ${htmlEscape(t.barang_nama)}: ${fmtCurrency(safeNumber(t.sisa_hutang))}\n`
        })
        msg += '\n'
      }
      return `${msg}Gunakan <code>/overdue detail</code> untuk rincian.`
    }

    let msg = '<b>Detail Tagihan Overdue</b>\n\n'
    for (const [debitur, items] of Object.entries(grouped)) {
      msg += `<b>${htmlEscape(debitur)}</b>\n`
      items.forEach((t: any) => {
        msg += `- <b>${htmlEscape(t.barang_nama)}</b>\n`
        msg += `  Sisa hutang: ${fmtCurrency(safeNumber(t.sisa_hutang))}\n`
        msg += `  Cicilan/bulan: ${fmtCurrency(safeNumber(t.cicilan_per_bulan))}\n`
        msg += `  Total hutang: ${fmtCurrency(safeNumber(t.total_hutang))}\n`
        if (t.catatan) msg += `  Catatan: ${htmlEscape(t.catatan)}\n`
      })
      msg += '\n'
    }
    return msg
  }

  return 'Tipe tidak dikenali.'
}
