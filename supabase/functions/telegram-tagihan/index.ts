/**
 * telegram-tagihan — LIVORIA Edge Function
 *
 * Telegram Bot untuk notifikasi tagihan:
 * - /start: Registrasi chat_id
 * - /laporan: Laporan bulanan (lengkap)
 * - /info-laporan: Laporan bulanan (ringkas)
 * - /jatuh_tempo: Tagihan jatuh tempo (lengkap)
 * - /info-tempo: Tagihan jatuh tempo (ringkas & terkelompok)
 * - /overdue: Tagihan overdue (lengkap)
 * - /info-overdue: Tagihan overdue (ringkas)
 * - /help: Bantuan
 * - Monthly report (dipanggil via cron)
 * - Daily reminder (dipanggil via cron)
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

function fmtShort(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}M`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`
  return String(Math.round(n))
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

    // ═══ WEBHOOK from Telegram (bot commands) ═══
    if (body.message) {
      const msg = body.message
      const chatId = msg.chat.id
      const text = (msg.text || '').trim()
      const parts = text.split(' ')
      const command = parts[0].toLowerCase()
      const arg = parts[1]?.toLowerCase()

      if (command === '/start') {
        const { data: existing } = await supabase
          .from('telegram_subscriptions')
          .select('id, user_id')
          .eq('chat_id', chatId)
          .single()

        if (existing) {
          await sendMessage(BOT_TOKEN, chatId,
            `✅ <b>Sudah Terdaftar!</b>\n\nChat ID Anda: <code>${chatId}</code>\n\nGunakan /help untuk melihat daftar perintah.`)
        } else {
          await sendMessage(BOT_TOKEN, chatId,
            `👋 <b>Selamat Datang di LIVORIA Bot!</b>\n\n` +
            `Chat ID Anda: <code>${chatId}</code>\n\n` +
            `📋 <b>Cara Menghubungkan:</b>\n` +
            `1. Buka aplikasi LIVORIA\n` +
            `2. Pergi ke <b>Pengaturan</b>\n` +
            `3. Masukkan Chat ID di atas pada bagian <b>Telegram</b>\n` +
            `4. Klik <b>Hubungkan</b>\n\n` +
            `Setelah terhubung, Anda akan menerima:\n` +
            `📊 Laporan bulanan otomatis\n` +
            `⏰ Reminder jatuh tempo\n` +
            `⚠️ Alert tagihan overdue\n\n` +
            `Gunakan /help untuk melihat semua perintah.`)
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (command === '/help') {
        await sendMessage(BOT_TOKEN, chatId,
          `📖 <b>Daftar Perintah LIVORIA Bot</b>\n\n` +
          `<b>📌 Laporan Ringkas:</b>\n` +
          `/info-tempo — Ringkasan jatuh tempo (Grup Debitur)\n` +
          `/info-laporan — Ringkasan laporan bulanan\n` +
          `/info-overdue — Ringkasan tagihan overdue\n\n` +
          `<b>📄 Laporan Detail:</b>\n` +
          `/jatuh_tempo — Detail lengkap jatuh tempo\n` +
          `/laporan — Detail lengkap laporan bulanan\n` +
          `/overdue — Detail lengkap tagihan overdue\n\n` +
          `<b>⚙️ Lainnya:</b>\n` +
          `/status — Status koneksi Anda\n` +
          `/start — Registrasi & info Chat ID\n` +
          `/help — Tampilkan bantuan ini\n\n` +
          `💡 <i>Tip: Gunakan perintah ringkas untuk melihat cepat.</i>`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Get user subscription
      const { data: sub } = await supabase
        .from('telegram_subscriptions')
        .select('user_id')
        .eq('chat_id', chatId)
        .eq('is_active', true)
        .single()

      if (!sub) {
        await sendMessage(BOT_TOKEN, chatId,
          `❌ <b>Akun Belum Terhubung</b>\n\nGunakan /start untuk melihat cara menghubungkan akun Anda.`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (command === '/status') {
        await sendMessage(BOT_TOKEN, chatId,
          `✅ <b>Akun Terhubung</b>\n\nChat ID: <code>${chatId}</code>\nStatus: Aktif`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const validCommands = ['/laporan', '/info-laporan', '/jatuh_tempo', '/info-tempo', '/overdue', '/info-overdue']
      if (validCommands.includes(command)) {
        let reportType = command
        // Handle alias logic
        if (command === '/info-tempo' && arg === 'detail') reportType = '/jatuh_tempo'
        if (command === '/info-laporan' && arg === 'detail') reportType = '/laporan'
        if (command === '/info-overdue' && arg === 'detail') reportType = '/overdue'

        const report = await generateReport(supabase, sub.user_id, reportType)
        await sendMessage(BOT_TOKEN, chatId, report)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(BOT_TOKEN, chatId, `❓ Perintah tidak dikenali. Gunakan /help untuk bantuan.`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ CRON Actions ═══
    if (body.action === 'monthly_report' || body.action === 'daily_reminder' || body.action === 'overdue_alert') {
      const typeMap: Record<string, { pref: string, cmd: string }> = {
        'monthly_report': { pref: 'notify_monthly_report', cmd: '/laporan' },
        'daily_reminder': { pref: 'notify_due_reminder', cmd: '/jatuh_tempo' },
        'overdue_alert': { pref: 'notify_overdue', cmd: '/overdue' }
      }
      const config = typeMap[body.action]
      const { data: subs } = await supabase.from('telegram_subscriptions').select('*').eq('is_active', true).eq(config.pref, true)
      
      let sent = 0
      for (const sub of (subs || [])) {
        try {
          const report = await generateReport(supabase, sub.user_id, config.cmd, sub.reminder_days_before)
          if (report.includes('Tidak ada tagihan') || report.includes('Tidak ada perhatian')) continue
          await sendMessage(BOT_TOKEN, sub.chat_id, report)
          sent++
        } catch (e) { console.error(`Failed to send:`, e) }
      }
      return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ API Actions (from app) ═══
    if (body.action === 'register') {
      const { userId, chatId: regChatId } = body
      const { error } = await supabase.from('telegram_subscriptions').upsert({
        user_id: userId, chat_id: regChatId, is_active: true, updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      if (!error) await sendMessage(BOT_TOKEN, regChatId, `🎉 <b>Berhasil Terhubung!</b>\n\nAkun LIVORIA Anda telah terhubung.`)
      return new Response(JSON.stringify({ ok: !error, error: error?.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'test') {
      const result = await sendMessage(BOT_TOKEN, body.chatId, `✅ <b>Test Berhasil!</b>\n📅 ${new Date().toLocaleString('id-ID')}`)
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'unregister') {
      await supabase.from('telegram_subscriptions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('user_id', body.userId)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'get_subscription') {
      const { data } = await supabase.from('telegram_subscriptions').select('*').eq('user_id', body.userId).single()
      return new Response(JSON.stringify({ subscription: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'update_preferences') {
      const { userId, ...prefs } = body
      const { error } = await supabase.from('telegram_subscriptions').update({ ...prefs, updated_at: new Date().toISOString() }).eq('user_id', userId)
      return new Response(JSON.stringify({ ok: !error, error: error?.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

// ═══ Report Generator ═══
async function generateReport(supabase: any, userId: string, type: string, reminderDays = 3): Promise<string> {
  const now = new Date()
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const { data: tagihan } = await supabase.from('tagihan').select('*').eq('user_id', userId)

  if (!tagihan || tagihan.length === 0) return `📋 Tidak ada tagihan yang terdaftar.`

  const fmtCurrency = (v: number) => fmt(v)
  const fmtS = (v: number) => fmtShort(v)

  // 1. Logic for /laporan & /info-laporan
  if (type === '/laporan' || type === '/info-laporan') {
    const aktif = tagihan.filter((t: any) => t.status === 'aktif')
    const lunas = tagihan.filter((t: any) => t.status === 'lunas')
    const overdue = tagihan.filter((t: any) => t.status === 'overdue')
    const totalSisa = tagihan.reduce((s: number, t: any) => s + Number(t.sisa_hutang), 0)
    const monthlyIncome = tagihan.filter((t: any) => t.status !== 'lunas').reduce((s: number, t: any) => s + Number(t.cicilan_per_bulan), 0)

    if (type === '/info-laporan') {
      let msg = `📊 <b>Ringkasan Laporan — ${monthName}</b>\n\n`
      msg += `📋 <b>Status:</b> ${aktif.length} Aktif | ${overdue.length} Overdue\n`
      msg += `💰 <b>Total Piutang:</b> ${fmtCurrency(totalSisa)}\n`
      msg += `📈 <b>Cicilan/Bulan:</b> ${fmtCurrency(monthlyIncome)}\n\n`
      msg += `💡 Gunakan <code>/laporan</code> untuk detail.`
      return msg
    }

    let msg = `📊 <b>Laporan Tagihan — ${monthName}</b>\n\n`
    msg += `📋 <b>Ringkasan:</b>\n`
    msg += `├ Total: ${tagihan.length}\n`
    msg += `├ Aktif: ${aktif.length} | Lunas: ${lunas.length} | Overdue: ${overdue.length}\n`
    msg += `└ Total Piutang: ${fmtCurrency(totalSisa)}\n\n`
    msg += `💰 <b>Cicilan Masuk/Bulan:</b> ${fmtCurrency(monthlyIncome)}\n`
    return msg
  }

  // 2. Logic for /jatuh_tempo & /info-tempo
  if (type === '/jatuh_tempo' || type === '/info-tempo') {
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const urgentNow: any[] = []
    const upcoming: any[] = []

    // Re-use existing cycle calculation logic
    tagihan.forEach((t: any) => {
      if (t.status === 'lunas' || t.status === 'ditunda') return
      
      // Calculate period (simplified for readability but functional)
      const cicilan = Number(t.cicilan_per_bulan)
      const paidCount = cicilan > 0 ? Math.floor(Number(t.total_dibayar) / cicilan) : 0
      const nextIdx = paidCount + 1
      
      let ws: Date, we: Date
      if (t.jenis_tempo === 'bulanan' && (t.tgl_bayar_tanggal || t.tgl_bayar_hari)) {
        const bDay = t.tgl_bayar_tanggal ? new Date(t.tgl_bayar_tanggal).getDate() : Number(t.tgl_bayar_hari)
        const tDay = t.tgl_tempo_tanggal ? new Date(t.tgl_tempo_tanggal).getDate() : Number(t.tgl_tempo_hari)
        const start = t.tgl_bayar_tanggal ? new Date(t.tgl_bayar_tanggal) : new Date(t.tanggal_mulai)
        
        const periodDate = new Date(start.getFullYear(), start.getMonth() + (nextIdx - 1), 1)
        const lastDay = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0).getDate()
        ws = new Date(periodDate.getFullYear(), periodDate.getMonth(), Math.min(bDay, lastDay))
        
        if (tDay < bDay) {
          const nextM = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 1)
          const lastDayNext = new Date(nextM.getFullYear(), nextM.getMonth() + 1, 0).getDate()
          we = new Date(nextM.getFullYear(), nextM.getMonth(), Math.min(tDay, lastDayNext))
        } else {
          we = new Date(periodDate.getFullYear(), periodDate.getMonth(), Math.min(tDay, lastDay))
        }
      } else {
        we = t.tanggal_jatuh_tempo ? new Date(t.tanggal_jatuh_tempo) : new Date(new Date(t.tanggal_mulai).setMonth(new Date(t.tanggal_mulai).getMonth() + nextIdx))
        ws = t.tanggal_mulai_bayar ? new Date(t.tanggal_mulai_bayar) : new Date(t.tanggal_mulai)
      }

      const isOverdue = todayDate > we
      const inWindow = todayDate >= ws && todayDate <= we
      const daysToStart = Math.ceil((ws.getTime() - todayDate.getTime()) / (86400000))
      
      const item = { ...t, _nextIdx: nextIdx, _ws: ws, _we: we, _isOverdue: isOverdue }
      if (inWindow || isOverdue) urgentNow.push(item)
      else if (daysToStart <= 30 && daysToStart > 0) upcoming.push(item)
    })

    if (urgentNow.length === 0 && upcoming.length === 0) return `✅ Tidak ada tagihan yang perlu perhatian.`

    if (type === '/info-tempo') {
      let msg = `📋 <b>Ringkasan Jatuh Tempo</b>\n📅 ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}\n\n`
      
      // Group by Debitur
      const grouped: Record<string, any[]> = {}
      urgentNow.forEach(t => {
        if (!grouped[t.debitur_nama]) grouped[t.debitur_nama] = []
        grouped[t.debitur_nama].push(t)
      })

      for (const [debitur, items] of Object.entries(grouped)) {
        msg += `👤 <b>${debitur}</b>\n`
        let subtotal = 0
        items.forEach(t => {
          const cicilan = Number(t.cicilan_per_bulan)
          subtotal += cicilan
          const status = t._isOverdue ? ' (⚠️ Telat)' : ''
          msg += `├ ${t.barang_nama} (Ke-${t._nextIdx}) - ${fmtS(cicilan)}${status}\n`
        })
        msg += `└ <b>Total: ${fmtCurrency(subtotal)}</b>\n\n`
      }

      const totalAll = urgentNow.reduce((s, t) => s + Number(t.cicilan_per_bulan), 0)
      msg += `💰 <b>TOTAL TAGIHAN: ${fmtCurrency(totalAll)}</b>\n\n`
      msg += `💡 Ketik <code>/jatuh_tempo</code> untuk rincian.`
      return msg
    }

    // Detail /jatuh_tempo (simplified from previous but complete)
    let msg = `📋 <b>Detail Jatuh Tempo</b>\n\n`
    urgentNow.forEach((t, i) => {
      msg += `${i+1}. <b>${t.debitur_nama}</b> - ${t.barang_nama}\n`
      msg += `   Cicilan ke-${t._nextIdx} | ${fmtCurrency(Number(t.cicilan_per_bulan))}\n`
      msg += `   Tempo: ${t._we.toLocaleDateString('id-ID')}${t._isOverdue ? ' ⚠️ OVERDUE' : ''}\n\n`
    })
    return msg
  }

  // 3. Logic for /overdue & /info-overdue
  if (type === '/overdue' || type === '/info-overdue') {
    const overdue = tagihan.filter((t: any) => t.status === 'overdue')
    if (overdue.length === 0) return `✅ Tidak ada tagihan overdue.`

    if (type === '/info-overdue') {
      let msg = `⚠️ <b>Ringkasan Overdue (${overdue.length})</b>\n\n`
      overdue.forEach(t => {
        msg += `├ ${t.debitur_nama}: ${fmtS(Number(t.sisa_hutang))}\n`
      })
      msg += `\n💡 Gunakan <code>/overdue</code> untuk detail.`
      return msg
    }

    let msg = `⚠️ <b>Daftar Tagihan Overdue</b>\n\n`
    overdue.forEach((t, i) => {
      msg += `${i+1}. ${t.debitur_nama} - ${t.barang_nama}\n   Sisa: ${fmtCurrency(Number(t.sisa_hutang))}\n\n`
    })
    return msg
  }

  return `❓ Tipe tidak dikenali.`
}
