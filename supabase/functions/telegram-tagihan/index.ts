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
import { generateReport } from './report-renderer.ts'
import { isMonthlyReportDue, normalizeChatId, sendMessage, shouldSendReport } from './telegram-helpers.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-livoria-cron-secret, x-telegram-bot-api-secret-token',
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
