/**
 * telegram-tagihan - LIVORIA Edge Function
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
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-livoria-cron-secret, x-telegram-bot-api-secret-token',
}

const TELEGRAM_API = 'https://api.telegram.org/bot'
const EMPTY_REPORT_PATTERN = /tidak ada/i

async function sendMessage(token: string, chatId: number | string, text: string, parseMode = 'HTML') {
  const res = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode, disable_web_page_preview: true }),
  })
  const payload = await res.json().catch(() => ({ ok: false, description: 'Invalid Telegram response' }))
  if (!res.ok || payload?.ok === false) {
    throw new Error(payload?.description || 'Telegram sendMessage failed')
  }
  return payload
}

function fmt(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n)
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ ok: false, error: message }, status)
}

function htmlEscape(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function isValidChatId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Math.abs(value) > 0 && Math.abs(value) < 10_000_000_000_000_000
}

function normalizeChatId(value: unknown): number | null {
  const chatId = Number(value)
  return isValidChatId(chatId) ? chatId : null
}

function shouldSendReport(report: string) {
  return !EMPTY_REPORT_PATTERN.test(report)
}

function isMonthlyReportDue(subscription: any, today: Date) {
  const reportDate = Number(subscription.monthly_report_date || 1)
  const safeDate = Number.isInteger(reportDate) ? Math.min(Math.max(reportDate, 1), 28) : 1
  return today.getDate() === safeDate
}

async function findActiveChatOwner(supabase: any, chatId: number) {
  const { data, error } = await supabase
    .from('telegram_subscriptions')
    .select('user_id')
    .eq('chat_id', chatId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  return data?.user_id as string | undefined
}

async function verifyUser(req: Request, supabaseUrl: string, anonKey: string) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return null
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data, error } = await authClient.auth.getUser()
  if (error || !data.user) return null
  return data.user
}

function verifyCronSecret(req: Request, body: any) {
  const secret = Deno.env.get('TELEGRAM_CRON_SECRET') || Deno.env.get('CRON_SECRET') || Deno.env.get('AUTO_BACKUP_SECRET')
  if (!secret) return false
  return (req.headers.get('x-livoria-cron-secret') || body?.cronSecret) === secret
}

function verifyTelegramWebhook(req: Request) {
  const secret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
  if (!secret) return true
  return req.headers.get('x-telegram-bot-api-secret-token') === secret
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_ANON_KEY')!
    const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')

    if (!BOT_TOKEN) {
      return errorResponse('TELEGRAM_BOT_TOKEN not configured', 500)
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const body = await req.json()

    if (body.message) {
      if (!verifyTelegramWebhook(req)) {
        return errorResponse('Unauthorized webhook', 401)
      }
      const msg = body.message
      const chatId = normalizeChatId(msg?.chat?.id)
      if (chatId === null) {
        return errorResponse('Invalid Telegram chat id', 400)
      }
      const text = (msg.text || '').trim()
      const parts = text.split(' ')
      const command = parts[0].toLowerCase()
      const arg = parts[1]?.toLowerCase()

      if (command === '/start') {
        const { data: existing } = await supabase.from('telegram_subscriptions').select('id').eq('chat_id', chatId).maybeSingle()
        if (existing) {
          await sendMessage(BOT_TOKEN, chatId, `<b>Sudah terdaftar</b>\n\nChat ID: <code>${chatId}</code>\nGunakan /help untuk melihat perintah.`)
        } else {
          await sendMessage(BOT_TOKEN, chatId, `<b>Selamat datang di LIVORIA Bot</b>\n\nChat ID: <code>${chatId}</code>\n\nCara menghubungkan:\n1. Buka aplikasi LIVORIA\n2. Masuk ke <b>Pengaturan</b>\n3. Masukkan Chat ID di bagian <b>Telegram</b>\n4. Klik <b>Hubungkan</b>`)
        }
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (command === '/help') {
        await sendMessage(BOT_TOKEN, chatId,
          `<b>Daftar Perintah LIVORIA Bot</b>\n\n` +
          `/tempo - Ringkasan jatuh tempo per debitur\n` +
          `/tempo detail - Detail lengkap jatuh tempo\n\n` +
          `/laporan - Ringkasan laporan bulanan\n` +
          `/laporan detail - Detail lengkap laporan bulanan\n\n` +
          `/overdue - Ringkasan tagihan overdue\n` +
          `/overdue detail - Detail lengkap tagihan overdue\n\n` +
          `/status - Status koneksi Anda\n` +
          `/help - Tampilkan bantuan ini`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const { data: sub } = await supabase.from('telegram_subscriptions').select('user_id').eq('chat_id', chatId).eq('is_active', true).maybeSingle()
      if (!sub) {
        await sendMessage(BOT_TOKEN, chatId, `<b>Akun belum terhubung</b>
Gunakan /start untuk instruksi.`)
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      if (command === '/status') {
        await sendMessage(BOT_TOKEN, chatId, `<b>Akun terhubung</b>

Chat ID: <code>${chatId}</code>
Status: Aktif`)
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

      await sendMessage(BOT_TOKEN, chatId, `Perintah tidak dikenali. Gunakan /help untuk bantuan.`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // CRON Actions
    if (body.action === 'monthly_report' || body.action === 'daily_reminder' || body.action === 'overdue_alert') {
      if (!verifyCronSecret(req, body)) {
        return errorResponse('Unauthorized cron request', 401)
      }
      const today = new Date()
      const typeMap: Record<string, { pref: string, cmd: string }> = {
        'monthly_report': { pref: 'notify_monthly_report', cmd: '/laporan_detail' },
        'daily_reminder': { pref: 'notify_due_reminder', cmd: '/jatuh_tempo_cron' },
        'overdue_alert': { pref: 'notify_overdue', cmd: '/overdue_detail' }
      }
      const config = typeMap[body.action]
      const { data: subs } = await supabase.from('telegram_subscriptions').select('*').eq('is_active', true).eq(config.pref, true)
      
      for (const sub of (subs || [])) {
        try {
          const targetChatId = normalizeChatId(sub.chat_id)
          if (targetChatId === null) continue

          if (body.action === 'monthly_report') {
            if (!isMonthlyReportDue(sub, today)) continue
          }

          const report = await generateReport(supabase, sub.user_id, config.cmd, sub.reminder_days_before)
          if (shouldSendReport(report)) {
            let finalMsg = report
            // Untuk daily reminder: sertakan ringkasan tempo (grup debitur) di bawahnya
            if (body.action === 'daily_reminder') {
               const ringkasanTempo = await generateReport(supabase, sub.user_id, '/info-tempo')
               if (shouldSendReport(ringkasanTempo)) {
                 finalMsg = `${report}\n\n${ringkasanTempo}`
               }
            }
            await sendMessage(BOT_TOKEN, targetChatId, finalMsg)
          }
        } catch (e) { console.error(e) }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // API Actions
    const user = await verifyUser(req, SUPABASE_URL, SUPABASE_ANON_KEY)
    if (!user) return errorResponse('Login diperlukan.', 401)
    if (body.userId && body.userId !== user.id) return errorResponse('Forbidden user mismatch.', 403)

    if (body.action === 'register') {
      const regChatId = normalizeChatId(body.chatId)
      if (regChatId === null) return errorResponse('Chat ID tidak valid.')
      const activeOwner = await findActiveChatOwner(supabase, regChatId)
      if (activeOwner && activeOwner !== user.id) {
        return errorResponse('Chat ID sudah terhubung ke akun lain.', 409)
      }
      await sendMessage(BOT_TOKEN, regChatId, `<b>Berhasil terhubung</b>`)
      await supabase.from('telegram_subscriptions').upsert({ user_id: user.id, chat_id: regChatId, is_active: true, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'test') {
      const testChatId = normalizeChatId(body.chatId)
      if (testChatId === null) return errorResponse('Chat ID tidak valid.')
      const activeOwner = await findActiveChatOwner(supabase, testChatId)
      if (activeOwner && activeOwner !== user.id) {
        return errorResponse('Chat ID sudah terhubung ke akun lain.', 409)
      }
      await sendMessage(BOT_TOKEN, testChatId, `<b>Test berhasil</b>`)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'unregister') {
      await supabase.from('telegram_subscriptions').update({ is_active: false, updated_at: new Date().toISOString() }).eq('user_id', user.id)
      return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'get_subscription') {
      const { data } = await supabase.from('telegram_subscriptions').select('*').eq('user_id', user.id).maybeSingle()
      return new Response(JSON.stringify({ subscription: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (body.action === 'update_preferences') {
      const { userId: _userId, action: _action, ...prefs } = body;
      // Only allow known preference fields
      const allowedFields: Record<string, any> = {};
      const knownKeys = ['notify_monthly_report', 'monthly_report_date', 'notify_overdue', 'notify_due_reminder', 'reminder_days_before'];
      for (const key of knownKeys) {
        if (key in prefs) allowedFields[key] = prefs[key];
      }
      if ('monthly_report_date' in allowedFields) {
        const value = Number(allowedFields.monthly_report_date);
        allowedFields.monthly_report_date = Number.isInteger(value) ? Math.min(Math.max(value, 1), 28) : 1;
      }
      if ('reminder_days_before' in allowedFields) {
        const value = Number(allowedFields.reminder_days_before);
        allowedFields.reminder_days_before = Number.isInteger(value) ? Math.min(Math.max(value, 1), 14) : 3;
      }
      allowedFields.updated_at = new Date().toISOString();
      
      const { error } = await supabase.from('telegram_subscriptions').upsert({ user_id: user.id, ...allowedFields }, { onConflict: 'user_id' });
      if (error) {
        console.error('Update preferences error:', error);
        return errorResponse('Gagal memperbarui preferensi.', 500);
      }
      return jsonResponse({ ok: true });
    }

    return errorResponse('Invalid action')
  } catch (err: any) {
    console.error('[telegram-tagihan]', err)
    return errorResponse('Internal server error', 500)
  }
})

async function generateReport(supabase: any, userId: string, type: string, reminderDays = 3): Promise<string> {
  const now = new Date()
  const monthName = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const { data: tagihan } = await supabase.from('tagihan').select('*').eq('user_id', userId)
  if (!tagihan || tagihan.length === 0) return 'Tidak ada tagihan.'

  const fmtCurrency = (value: number) => fmt(Number.isFinite(value) ? value : 0)
  const fmtDate = (date: Date) => date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  const safeNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0

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
