/**
 * telegram-tagihan — LIVORIA Edge Function
 *
 * Telegram Bot untuk notifikasi tagihan:
 * - /start: Registrasi chat_id
 * - /help: Bantuan
 * - /status: Status koneksi
 * - /tempo [detail]: Ringkasan/Detail jatuh tempo (Grup Debitur)
 * - /laporan [detail]: Ringkasan/Detail laporan bulanan
 * - /overdue [detail]: Ringkasan/Detail tagihan overdue
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TELEGRAM_API = 'https://api.telegram.org/bot'

async function sendMessage(token: string, chatId: number | string, text: string, parseMode = 'HTML') {
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  })
  return res.json()
}

function fmt(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')

    if (!BOT_TOKEN) {
      return new Response(JSON.stringify({ error: 'TELEGRAM_BOT_TOKEN not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const body = await req.json()

    if (body.message) {
      const msg = body.message
      const chatId = msg.chat.id
      const text = (msg.text || '').trim()
      const parts = text.split(' ')
      const command = parts[0].toLowerCase()
      const arg = parts[1]?.toLowerCase()

      if (command === '/start') {
        const { data: existing } = await supabase.from('telegram_subscriptions').select('id').eq('chat_id', chatId).single()
        if (existing) {
          await sendMessage(BOT_TOKEN, chatId, `✅ <b>Sudah Terdaftar!</b>\n\nChat ID: <code>${chatId}</code>\nGunakan /help untuk melihat perintah.`)
        } else {
          await sendMessage(BOT_TOKEN, chatId, `👋 <b>Selamat Datang di LIVORIA Bot!</b>\n\nChat ID: <code>${chatId}</code>\n\n📋 <b>Cara Menghubungkan:</b>\n1. Buka aplikasi LIVORIA\n2. Ke <b>Pengaturan</b>\n3. Masukkan Chat ID di atas pada bagian <b>Telegram</b>\n4. Klik <b>Hubungkan</b>`)
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (command === '/help') {
        await sendMessage(BOT_TOKEN, chatId,
          `📖 <b>Daftar Perintah LIVORIA Bot</b>\n\n` +
          `/tempo — Ringkasan jatuh tempo (Grup Debitur)\n` +
          `/tempo detail — Detail lengkap jatuh tempo\n\n` +
          `/laporan — Ringkasan laporan bulanan\n` +
          `/laporan detail — Detail lengkap laporan bulanan\n\n` +
          `/overdue — Ringkasan tagihan overdue\n` +
          `/overdue detail — Detail lengkap tagihan overdue\n\n` +
          `/status — Status koneksi Anda\n` +
          `/help — Tampilkan bantuan ini`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: sub } = await supabase.from('telegram_subscriptions').select('user_id').eq('chat_id', chatId).eq('is_active', true).single()
      if (!sub) {
        await sendMessage(BOT_TOKEN, chatId, `❌ <b>Akun Belum Terhubung</b>\nGunakan /start untuk instruksi.`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (command === '/status') {
        await sendMessage(BOT_TOKEN, chatId, `✅ <b>Akun Terhubung</b>\n\nChat ID: <code>${chatId}</code>\nStatus: Aktif`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const validCommands = ['/tempo', '/laporan', '/overdue']
      if (validCommands.includes(command)) {
        const isDetail = arg === 'detail'
        let internalCommand = ''
        if (command === '/tempo') internalCommand = isDetail ? '/jatuh_tempo_detail' : '/info-tempo'
        if (command === '/laporan') internalCommand = isDetail ? '/laporan_detail' : '/info-laporan'
        if (command === '/overdue') internalCommand = isDetail ? '/overdue_detail' : '/info-overdue'

        const report = await generateReport(supabase, sub.user_id, internalCommand)
        await sendMessage(BOT_TOKEN, chatId, report)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(BOT_TOKEN, chatId, `❓ Perintah tidak dikenali. Gunakan /help untuk bantuan.`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ CRON Actions ═══
    if (body.action === 'monthly_report' || body.action === 'daily_reminder' || body.action === 'overdue_alert') {
      const typeMap: Record<string, { pref: string, cmd: string }> = {
        'monthly_report': { pref: 'notify_monthly_report', cmd: '/laporan_detail' },
        'daily_reminder': { pref: 'notify_due_reminder', cmd: '/jatuh_tempo_detail' },
        'overdue_alert': { pref: 'notify_overdue', cmd: '/overdue_detail' }
      }
      const config = typeMap[body.action]
      const { data: subs } = await supabase.from('telegram_subscriptions').select('*').eq('is_active', true).eq(config.pref, true)
      for (const sub of (subs || [])) {
        try {
          const report = await generateReport(supabase, sub.user_id, config.cmd, sub.reminder_days_before)
          if (!report.includes('Tidak ada')) await sendMessage(BOT_TOKEN, sub.chat_id, report)
        } catch (e) { console.error(e) }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // API Actions
    if (body.action === 'register') {
      const { userId, chatId: regChatId } = body
      await supabase.from('telegram_subscriptions').upsert({ user_id: userId, chat_id: regChatId, is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      await sendMessage(BOT_TOKEN, regChatId, `🎉 <b>Berhasil Terhubung!</b>`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'test') {
      await sendMessage(BOT_TOKEN, body.chatId, `✅ <b>Test Berhasil!</b>`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function generateReport(supabase: any, userId: string, type: string, reminderDays = 3): Promise<string> {
  const now = new Date()
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const { data: tagihan } = await supabase.from('tagihan').select('*').eq('user_id', userId)
  if (!tagihan || tagihan.length === 0) return `📋 Tidak ada tagihan.`

  const fmtCurrency = (v: number) => fmt(v)

  // 1. Laporan Logic
  if (type === '/info-laporan' || type === '/laporan_detail') {
    const aktif = tagihan.filter((t: any) => t.status === 'aktif')
    const lunas = tagihan.filter((t: any) => t.status === 'lunas')
    const overdue = tagihan.filter((t: any) => t.status === 'overdue')
    const totalSisa = tagihan.reduce((s: number, t: any) => s + Number(t.sisa_hutang), 0)
    const monthlyIncome = tagihan.filter((t: any) => t.status !== 'lunas').reduce((s: number, t: any) => s + Number(t.cicilan_per_bulan), 0)

    if (type === '/info-laporan') {
      return `📊 <b>Ringkasan Laporan — ${monthName}</b>\n\n` +
             `📋 <b>Status:</b> ${aktif.length} Aktif | ${overdue.length} Overdue\n` +
             `💰 <b>Total Piutang:</b> ${fmtCurrency(totalSisa)}\n` +
             `📈 <b>Cicilan/Bulan:</b> ${fmtCurrency(monthlyIncome)}\n\n` +
             `💡 Gunakan <code>/laporan detail</code> untuk rincian.`
    }
    
    // Detail Laporan
    let msg = `📊 <b>Detail Laporan — ${monthName}</b>\n\n`
    msg += `📋 <b>Ringkasan:</b>\n`
    msg += `├ Total: ${tagihan.length}\n`
    msg += `├ Aktif: ${aktif.length} | Lunas: ${lunas.length} | Overdue: ${overdue.length}\n`
    msg += `└ Total Piutang: ${fmtCurrency(totalSisa)}\n\n`
    msg += `💰 <b>Cicilan Masuk/Bulan:</b> ${fmtCurrency(monthlyIncome)}\n\n`
    
    const exclLuar = tagihan.filter((t: any) => t.sumber_modal !== 'dana_luar')
    const totalModal = exclLuar.reduce((s: number, t: any) => s + Number(t.harga_awal), 0)
    const totalDibayar = tagihan.reduce((s: number, t: any) => s + Number(t.total_dibayar), 0)
    const totalKeuntungan = tagihan.reduce((s: number, t: any) => s + Number(t.keuntungan_estimasi), 0)
    
    msg += `📉 <b>Statistik Modal & Profit:</b>\n`
    msg += `├ Total Modal: ${fmtCurrency(totalModal)}\n`
    msg += `├ Total Terkumpul: ${fmtCurrency(totalDibayar)}\n`
    msg += `└ Est. Keuntungan: ${fmtCurrency(totalKeuntungan)}\n\n`
    
    // Group by Debitur for detail
    const grouped: Record<string, any[]> = {}
    tagihan.filter((t: any) => t.status !== 'lunas').forEach(t => {
      if (!grouped[t.debitur_nama]) grouped[t.debitur_nama] = []
      grouped[t.debitur_nama].push(t)
    })
    
    if (Object.keys(grouped).length > 0) {
      msg += `👤 <b>Daftar Piutang Aktif:</b>\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `\n<b>${debitur}</b>\n`
        items.forEach(t => {
          msg += `├ ${t.barang_nama}: ${fmtCurrency(Number(t.sisa_hutang))}\n`
        })
      }
    }
    
    return msg
  }

  // 2. Tempo Logic
  if (type === '/info-tempo' || type === '/jatuh_tempo_detail') {
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const urgentNow: any[] = []
    tagihan.forEach((t: any) => {
      if (t.status === 'lunas' || t.status === 'ditunda') return
      const cicilan = Number(t.cicilan_per_bulan)
      const paidCount = cicilan > 0 ? Math.floor(Number(t.total_dibayar) / cicilan) : 0
      const nextIdx = paidCount + 1
      let we: Date
      if (t.jenis_tempo === 'bulanan' && (t.tgl_bayar_tanggal || t.tgl_bayar_hari)) {
        const tDay = t.tgl_tempo_tanggal ? new Date(t.tgl_tempo_tanggal).getDate() : Number(t.tgl_tempo_hari)
        const start = t.tgl_bayar_tanggal ? new Date(t.tgl_bayar_tanggal) : new Date(t.tanggal_mulai)
        const periodDate = new Date(start.getFullYear(), start.getMonth() + (nextIdx - 1), 1)
        const lastDay = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate()
        we = new Date(periodDate.getFullYear(), periodDate.getMonth(), Math.min(tDay, lastDay))
      } else {
        we = t.tanggal_jatuh_tempo ? new Date(t.tanggal_jatuh_tempo) : new Date(new Date(t.tanggal_mulai).setMonth(new Date(t.tanggal_mulai).getMonth() + nextIdx))
      }
      const isOverdue = todayDate > we
      if (todayDate >= new Date(we.getTime() - (86400000 * 7)) || isOverdue) {
        urgentNow.push({ ...t, _nextIdx: nextIdx, _we: we, _isOverdue: isOverdue })
      }
    })

    if (urgentNow.length === 0) return `✅ Tidak ada tagihan jatuh tempo dekat ini.`

    const grouped: Record<string, any[]> = {}
    urgentNow.forEach(t => {
      if (!grouped[t.debitur_nama]) grouped[t.debitur_nama] = []
      grouped[t.debitur_nama].push(t)
    })

    if (type === '/info-tempo') {
      let msg = `📋 <b>Ringkasan Jatuh Tempo</b>\n📅 ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `👤 <b>${debitur}</b>\n`
        let subtotal = 0
        items.forEach(t => {
          const cicilan = Number(t.cicilan_per_bulan)
          subtotal += cicilan
          const labelCicilan = t.jangka_waktu_bulan > 1 ? ` (Ke-${t._nextIdx})` : ''
          msg += `├ ${t.barang_nama}${labelCicilan} - ${fmtCurrency(cicilan)}${t._isOverdue ? ' ⚠️' : ''}\n`
        })
        msg += `└ <b>Total: ${fmtCurrency(subtotal)}</b>\n\n`
      }
      const totalAll = urgentNow.reduce((s, t) => s + Number(t.cicilan_per_bulan), 0)
      msg += `💰 <b>TOTAL TAGIHAN: ${fmtCurrency(totalAll)}</b>\n\n💡 Ketik <code>/tempo detail</code> untuk rincian.`
      return msg
    }

    // Detail Tempo (Grouped by Debitur)
    let msg = `📋 <b>Detail Jatuh Tempo</b>\n📅 ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n`
    for (const [debitur, items] of Object.entries(grouped)) {
      msg += `👤 <b>${debitur}</b>\n`
      items.forEach(t => {
        const cicilan = Number(t.cicilan_per_bulan)
        const progress = Math.round((Number(t.total_dibayar) / Number(t.total_hutang)) * 100)
        const labelCicilan = t.jangka_waktu_bulan > 1 ? `Cicilan ke-${t._nextIdx} dari ${t.jangka_waktu_bulan} bln` : 'Pembayaran Tunggal'
        msg += `├ <b>${t.barang_nama}</b>\n`
        msg += `│ 💳 ${labelCicilan}\n`
        msg += `│ 💰 Jumlah: ${fmtCurrency(cicilan)}\n`
        msg += `│ 📅 Tempo: ${t._we.toLocaleDateString('id-ID')}${t._isOverdue ? ' ⚠️ OVERDUE' : ''}\n`
        msg += `│ 📊 Progress: ${progress}% (${fmtCurrency(Number(t.total_dibayar))}/${fmtCurrency(Number(t.total_hutang))})\n`
        msg += `│ 📉 Sisa: ${fmtCurrency(Number(t.sisa_hutang))}\n`
        if (t.catatan) msg += `│ 📝 Note: ${t.catatan}\n`
        msg += `│\n`
      })
      const subtotal = items.reduce((s, t) => s + Number(t.cicilan_per_bulan), 0)
      msg += `└ <b>Subtotal: ${fmtCurrency(subtotal)}</b>\n\n`
    }
    return msg
  }

  // 3. Overdue Logic
  if (type === '/info-overdue' || type === '/overdue_detail') {
    const overdue = tagihan.filter((t: any) => t.status === 'overdue')
    if (overdue.length === 0) return `✅ Tidak ada tagihan overdue.`
    
    const grouped: Record<string, any[]> = {}
    overdue.forEach(t => {
      if (!grouped[t.debitur_nama]) grouped[t.debitur_nama] = []
      grouped[t.debitur_nama].push(t)
    })

    if (type === '/info-overdue') {
      let msg = `⚠️ <b>Ringkasan Overdue</b>\n\n`
      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `👤 <b>${debitur}</b>\n`
        items.forEach(t => {
          msg += `├ ${t.barang_nama}: ${fmtCurrency(Number(t.sisa_hutang))}\n`
        })
        msg += `\n`
      }
      return msg + `💡 Gunakan <code>/overdue detail</code> untuk rincian.`
    }
    
    // Detail Overdue
    let msg = `⚠️ <b>Detail Tagihan Overdue</b>\n\n`
    for (const [debitur, items] of Object.entries(grouped)) {
      msg += `👤 <b>${debitur}</b>\n`
      items.forEach(t => {
        msg += `├ <b>${t.barang_nama}</b>\n`
        msg += `│ 💰 Sisa Hutang: ${fmtCurrency(Number(t.sisa_hutang))}\n`
        msg += `│ 💸 Cicilan/Bulan: ${fmtCurrency(Number(t.cicilan_per_bulan))}\n`
        msg += `│ 📊 Total Hutang: ${fmtCurrency(Number(t.total_hutang))}\n`
        if (t.catatan) msg += `│ 📝 Note: ${t.catatan}\n`
        msg += `│\n`
      })
      msg += `\n`
    }
    return msg
  }

  return `❓ Tipe tidak dikenali.`
}
