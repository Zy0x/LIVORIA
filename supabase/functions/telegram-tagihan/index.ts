/**
 * telegram-tagihan — LIVORIA Edge Function
 *
 * Telegram Bot untuk notifikasi tagihan:
 * - /start: Registrasi chat_id
 * - /laporan: Laporan bulanan
 * - /jatuh_tempo: Tagihan jatuh tempo
 * - /overdue: Tagihan overdue
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
      const command = text.split(' ')[0].toLowerCase()

      if (command === '/start') {
        // Check if already registered
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
          `/start — Registrasi & info Chat ID\n` +
          `/laporan — Laporan tagihan bulan ini\n` +
          `/jatuh_tempo — Tagihan yang akan jatuh tempo\n` +
          `/overdue — Tagihan yang sudah melewati jatuh tempo\n` +
          `/status — Status koneksi Anda\n` +
          `/help — Tampilkan bantuan ini\n\n` +
          `💡 <i>Pastikan akun Anda sudah terhubung melalui aplikasi LIVORIA.</i>`)
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

      if (command === '/laporan' || command === '/jatuh_tempo' || command === '/overdue') {
        const report = await generateReport(supabase, sub.user_id, command)
        await sendMessage(BOT_TOKEN, chatId, report)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      await sendMessage(BOT_TOKEN, chatId, `❓ Perintah tidak dikenali. Gunakan /help untuk bantuan.`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ CRON: Monthly Report ═══
    if (body.action === 'monthly_report') {
      const { data: subs } = await supabase
        .from('telegram_subscriptions')
        .select('*')
        .eq('is_active', true)
        .eq('notify_monthly_report', true)

      let sent = 0
      for (const sub of (subs || [])) {
        try {
          const report = await generateReport(supabase, sub.user_id, '/laporan')
          await sendMessage(BOT_TOKEN, sub.chat_id, report)
          sent++
        } catch (e) { console.error(`Failed to send to ${sub.chat_id}:`, e) }
      }
      return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ CRON: Daily Reminder ═══
    if (body.action === 'daily_reminder') {
      const { data: subs } = await supabase
        .from('telegram_subscriptions')
        .select('*')
        .eq('is_active', true)
        .eq('notify_due_reminder', true)

      let sent = 0
      for (const sub of (subs || [])) {
        try {
          const dueReport = await generateReport(supabase, sub.user_id, '/jatuh_tempo', sub.reminder_days_before)
          if (dueReport.includes('Tidak ada tagihan')) continue
          await sendMessage(BOT_TOKEN, sub.chat_id, dueReport)
          sent++
        } catch (e) { console.error(`Failed:`, e) }
      }
      return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ CRON: Overdue Alert ═══
    if (body.action === 'overdue_alert') {
      const { data: subs } = await supabase
        .from('telegram_subscriptions')
        .select('*')
        .eq('is_active', true)
        .eq('notify_overdue', true)

      let sent = 0
      for (const sub of (subs || [])) {
        try {
          const overdueReport = await generateReport(supabase, sub.user_id, '/overdue')
          if (overdueReport.includes('Tidak ada tagihan')) continue
          await sendMessage(BOT_TOKEN, sub.chat_id, overdueReport)
          sent++
        } catch (e) { console.error(`Failed:`, e) }
      }
      return new Response(JSON.stringify({ ok: true, sent }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // ═══ API: Register / Test / Unregister (from app) ═══
    if (body.action === 'register') {
      const { userId, chatId: regChatId } = body
      if (!userId || !regChatId) {
        return new Response(JSON.stringify({ error: 'userId and chatId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Upsert subscription
      const { error } = await supabase.from('telegram_subscriptions').upsert({
        user_id: userId,
        chat_id: regChatId,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Send welcome message
      await sendMessage(BOT_TOKEN, regChatId,
        `🎉 <b>Berhasil Terhubung!</b>\n\nAkun LIVORIA Anda telah terhubung dengan bot ini.\n\nAnda akan menerima notifikasi tagihan secara otomatis.`)

      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'test') {
      const { chatId: testChatId } = body
      if (!testChatId) {
        return new Response(JSON.stringify({ error: 'chatId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const result = await sendMessage(BOT_TOKEN, testChatId,
        `✅ <b>Test Berhasil!</b>\n\nKoneksi bot LIVORIA berfungsi dengan baik.\n📅 ${new Date().toLocaleString('id-ID')}`)
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'unregister') {
      const { userId } = body
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      await supabase.from('telegram_subscriptions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('user_id', userId)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'get_subscription') {
      const { userId } = body
      const { data } = await supabase.from('telegram_subscriptions').select('*').eq('user_id', userId).single()
      return new Response(JSON.stringify({ subscription: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'update_preferences') {
      const { userId, notify_monthly_report, notify_overdue, notify_due_reminder, reminder_days_before } = body
      const { error } = await supabase.from('telegram_subscriptions').update({
        notify_monthly_report, notify_overdue, notify_due_reminder, reminder_days_before,
        updated_at: new Date().toISOString(),
      }).eq('user_id', userId)
      return new Response(JSON.stringify({ ok: !error, error: error?.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid action or message' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

// ═══ Report Generator ═══
async function generateReport(supabase: any, userId: string, type: string, reminderDays = 3): Promise<string> {
  const now = new Date()
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  const { data: tagihan } = await supabase
    .from('tagihan')
    .select('*')
    .eq('user_id', userId)

  if (!tagihan || tagihan.length === 0) {
    return `📋 Tidak ada tagihan yang terdaftar.`
  }

  const aktif = tagihan.filter((t: any) => t.status === 'aktif')
  const lunas = tagihan.filter((t: any) => t.status === 'lunas')
  const overdue = tagihan.filter((t: any) => t.status === 'overdue')

  const exclLuar = tagihan.filter((t: any) => t.sumber_modal !== 'dana_luar')
  const totalModal = exclLuar.reduce((s: number, t: any) => s + Number(t.harga_awal), 0)
  const totalDibayar = tagihan.reduce((s: number, t: any) => s + Number(t.total_dibayar), 0)
  const totalSisa = tagihan.reduce((s: number, t: any) => s + Number(t.sisa_hutang), 0)
  const totalKeuntungan = tagihan.reduce((s: number, t: any) => s + Number(t.keuntungan_estimasi), 0)
  const monthlyIncome = tagihan.filter((t: any) => t.status !== 'lunas')
    .reduce((s: number, t: any) => s + Number(t.cicilan_per_bulan), 0)

  if (type === '/laporan') {
    let msg = `📊 <b>Laporan Tagihan — ${monthName}</b>\n\n`
    msg += `📋 <b>Ringkasan:</b>\n`
    msg += `├ Total Tagihan: ${tagihan.length}\n`
    msg += `├ Aktif: ${aktif.length} | Lunas: ${lunas.length} | Overdue: ${overdue.length}\n`
    msg += `├ Total Piutang: ${fmt(totalSisa)}\n`
    msg += `├ Total Modal: ${fmt(totalModal)}\n`
    msg += `└ Est. Keuntungan: ${fmt(totalKeuntungan)}\n\n`

    msg += `💰 <b>Cicilan Masuk/Bulan:</b> ${fmt(monthlyIncome)}\n`
    msg += `📈 <b>Total Terkumpul:</b> ${fmt(totalDibayar)}\n\n`

    // Top 5 piutang terbesar
    const topDebtors = tagihan
      .filter((t: any) => t.status !== 'lunas')
      .sort((a: any, b: any) => Number(b.sisa_hutang) - Number(a.sisa_hutang))
      .slice(0, 5)

    if (topDebtors.length > 0) {
      msg += `🏆 <b>Top 5 Piutang Terbesar:</b>\n`
      topDebtors.forEach((t: any, i: number) => {
        msg += `${i + 1}. ${t.debitur_nama} — ${t.barang_nama} · ${fmt(Number(t.sisa_hutang))}\n`
      })
    }

    if (overdue.length > 0) {
      msg += `\n⚠️ <b>Overdue (${overdue.length}):</b>\n`
      overdue.forEach((t: any, i: number) => {
        msg += `${i + 1}. ${t.debitur_nama} — ${t.barang_nama} · ${fmt(Number(t.sisa_hutang))}\n`
      })
    }

    return msg
  }

  if (type === '/jatuh_tempo') {
    // Find tagihan due within reminderDays
    const upcoming = tagihan.filter((t: any) => {
      if (t.status === 'lunas') return false
      // Simple check: is tempo day within reminder window
      const tempoHari = t.tgl_tempo_hari
      if (!tempoHari) return false
      const today = now.getDate()
      const daysUntil = tempoHari >= today ? tempoHari - today : (30 - today + tempoHari)
      return daysUntil <= reminderDays && daysUntil >= 0
    })

    if (upcoming.length === 0) {
      return `✅ Tidak ada tagihan yang jatuh tempo dalam ${reminderDays} hari ke depan.`
    }

    let msg = `⏰ <b>Tagihan Jatuh Tempo (${reminderDays} hari ke depan)</b>\n\n`
    upcoming.forEach((t: any, i: number) => {
      msg += `${i + 1}. <b>${t.debitur_nama}</b>\n`
      msg += `   📦 ${t.barang_nama}\n`
      msg += `   💰 Cicilan: ${fmt(Number(t.cicilan_per_bulan))}\n`
      msg += `   📅 Tanggal: ${t.tgl_tempo_hari || '-'}\n\n`
    })
    return msg
  }

  if (type === '/overdue') {
    if (overdue.length === 0) {
      return `✅ Tidak ada tagihan overdue. Semua pembayaran lancar!`
    }

    let msg = `⚠️ <b>Tagihan Overdue (${overdue.length})</b>\n\n`
    overdue.forEach((t: any, i: number) => {
      msg += `${i + 1}. <b>${t.debitur_nama}</b>\n`
      msg += `   📦 ${t.barang_nama}\n`
      msg += `   💰 Sisa: ${fmt(Number(t.sisa_hutang))}\n`
      msg += `   📅 Cicilan/bln: ${fmt(Number(t.cicilan_per_bulan))}\n\n`
    })
    return msg
  }

  return `❓ Tipe laporan tidak dikenali.`
}
