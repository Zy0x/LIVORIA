/**
 * admin-backup — LIVORIA Edge Function
 *
 * Full database backup/restore dengan rotasi 7 hari.
 * + list_users, user_detail, delete_user untuk admin per-user review
 * + get_backup, delete_backup untuk manage backup individual
 * + backup_logs for transparency
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const LIVORIA_TABLES = [
  'tagihan',
  'tagihan_history',
  'struk',
  'anime',
  'donghua',
  'waifu',
  'obat',
  'user_preferences',
  'telegram_subscriptions',
] as const
const RESTORE_TABLES = new Set<string>([
  'tagihan',
  'tagihan_history',
  'struk',
  'anime',
  'donghua',
  'waifu',
  'obat',
  'user_preferences',
  'telegram_subscriptions',
])
const RESTORE_CONFIRM_TEXT = 'RESTORE LIVORIA'
const MAX_RESTORE_ROWS_PER_TABLE = 100_000

const ALLOWED_ACTIONS = new Set([
  'backup',
  'list_backups',
  'get_backup_settings',
  'update_backup_settings',
  'get_backup',
  'delete_backup',
  'stats',
  'list_users',
  'user_detail',
  'delete_user',
  'restore',
])

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ADMIN_ALLOWED_ORIGIN') || Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-livoria-cron-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status)
}

async function verifyAdminRequest(req: Request, body: any) {
  const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')
  const ADMIN_KEY = Deno.env.get('ADMIN_KEY')
  const CRON_SECRET = Deno.env.get('ADMIN_CRON_SECRET')
    || Deno.env.get('BACKUP_CRON_SECRET')
    || Deno.env.get('AUTO_BACKUP_SECRET')
    || Deno.env.get('CRON_SECRET')
  const cronSecret = req.headers.get('x-livoria-cron-secret') || body?.cronSecret

  if (CRON_SECRET && cronSecret === CRON_SECRET) {
    return body?.action === 'backup'
      ? { authorized: true, mode: 'cron' as const }
      : { authorized: false, reason: 'Cron access is only allowed for backup.' }
  }

  if (body?.isAuto) {
    return { authorized: false, reason: 'Missing or invalid cron secret.' }
  }

  if (!body?.email || !body?.password || !ADMIN_EMAIL || !ADMIN_KEY) {
    return { authorized: false, reason: 'Missing admin credentials.' }
  }

  const isAdmin = body.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()
    && body.password === ADMIN_KEY
  return { authorized: isAdmin, mode: 'manual' as const }
}

function validateBackupPayload(backupData: any) {
  if (!backupData || typeof backupData !== 'object' || Array.isArray(backupData)) {
    throw new Error('backupData tidak valid.')
  }
  if (backupData._meta?.app !== 'LIVORIA') {
    throw new Error('Backup bukan dari LIVORIA atau metadata tidak lengkap.')
  }
  const tables = Object.keys(backupData).filter((table) => !table.startsWith('_'))
  if (tables.length === 0) {
    throw new Error('Backup tidak berisi tabel yang bisa direstore.')
  }
  const unknown = tables.filter((table) => !RESTORE_TABLES.has(table))
  if (unknown.length > 0) {
    throw new Error(`Backup berisi tabel tidak dikenal: ${unknown.join(', ')}`)
  }
  for (const table of tables) {
    if (!Array.isArray(backupData[table])) {
      throw new Error(`Isi tabel ${table} harus berupa array.`)
    }
    if (backupData[table].length > MAX_RESTORE_ROWS_PER_TABLE) {
      throw new Error(`Isi tabel ${table} melebihi batas aman restore.`)
    }
  }
  return tables
}

function validateRestoreConfirmation(body: any) {
  if (body?.restoreConfirm !== RESTORE_CONFIRM_TEXT) {
    throw new Error(`Ketik "${RESTORE_CONFIRM_TEXT}" untuk menjalankan restore.`)
  }
}

async function createPreRestoreBackup(supabase: any, tables: string[]) {
  const backup: Record<string, any[]> = {}
  const counts: Record<string, number> = {}
  for (const table of tables) {
    const { data, count, error } = await supabase.from(table).select('*', { count: 'exact' })
    if (error) throw new Error(`Gagal membuat pre-restore backup untuk ${table}: ${error.message}`)
    backup[table] = data || []
    counts[table] = count ?? backup[table].length
  }
  await supabase.from('backups').insert({
    content: {
      _meta: {
        app: 'LIVORIA',
        exported_at: new Date().toISOString(),
        type: 'pre-restore-backup',
        tables,
        counts,
      },
      ...backup,
    },
    created_at: new Date().toISOString(),
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return errorResponse('Invalid JSON body', 400)
    }

    const action = typeof body.action === 'string' ? body.action : ''
    if (!ALLOWED_ACTIONS.has(action)) {
      return errorResponse('Invalid action', 400)
    }

    const adminRequest = await verifyAdminRequest(req, body)
    if (!adminRequest.authorized) {
      console.warn('[admin-backup] unauthorized request:', adminRequest.reason)
      return errorResponse('Unauthorized', 401)
    }
    const isAuto = adminRequest.mode === 'cron'

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Dynamic table discovery with fallback
    let TABLES: string[]
    try {
      const { data: tablesData, error: tablesError } = await supabase.rpc('get_public_tables')
      TABLES = tablesError
        ? [...LIVORIA_TABLES]
        : tablesData.map((t: any) => t.table_name).filter((table: string) => RESTORE_TABLES.has(table))
    } catch {
      TABLES = [...LIVORIA_TABLES]
    }

    // ═══ BACKUP ═══
    if (action === 'backup') {
      let backupId: string | null = null;
      try {
        const backup: Record<string, any[]> = {}
        const counts: Record<string, number> = {}

        for (const table of TABLES) {
          if (table === 'backups' || table === 'backup_logs' || table === 'backup_settings' || table.startsWith('_')) continue
          try {
            const { data: rows, count, error } = await supabase
              .from(table).select('*', { count: 'exact' })
            if (!error) {
              backup[table] = rows || []
              counts[table] = count ?? (rows?.length || 0)
            }
          } catch { /* skip inaccessible tables */ }
        }

        const backupContent = {
          _meta: {
            app: 'LIVORIA',
            exported_at: new Date().toISOString(),
            tables: Object.keys(backup),
            counts,
            type: 'full-db-backup',
            isAuto: !!isAuto
          },
          ...backup,
        }

        // Save to backups table
        const { data: savedBackup, error: saveError } = await supabase.from('backups').insert({
          content: backupContent,
          created_at: new Date().toISOString()
        }).select('id').single()

        if (saveError) throw saveError;
        backupId = savedBackup?.id;

        // Rotation: delete older than 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        await supabase.from('backups').delete().lt('created_at', sevenDaysAgo.toISOString())

        // Log Success
        if (isAuto) {
          await supabase.from('backup_logs').insert({
            status: 'success',
            message: `Automatic backup completed successfully. ${Object.keys(backup).length} tables backed up.`,
            backup_id: backupId
          })
        }

        return jsonResponse(backupContent)
      } catch (err: any) {
        console.error('[admin-backup] backup failed:', err?.message || err)
        if (isAuto) {
          await supabase.from('backup_logs').insert({
            status: 'failed',
            message: 'Automatic backup failed.'
          })
        }
        return errorResponse('Backup failed', 500)
      }
    }

    // ═══ LIST BACKUPS ═══
    if (action === 'list_backups') {
      try {
        const { data: backups, error } = await supabase
          .from('backups')
          .select('id, created_at, content')
          .order('created_at', { ascending: false })
        if (error) throw error

        const simplified = (backups || []).map((b: any) => ({
          id: b.id,
          created_at: b.created_at,
          meta: b.content?._meta ? JSON.stringify(b.content._meta) : '{}',
        }))

        return jsonResponse({ backups: simplified })
      } catch (e: any) {
        console.error('[admin-backup] list_backups failed:', e?.message || e)
        return jsonResponse({ backups: [], error: 'Failed to list backups' }, 500)
      }
    }

    // ═══ GET BACKUP SETTINGS ═══
    if (action === 'get_backup_settings') {
      try {
        const { data: settings, error: settingsError } = await supabase.from('backup_settings').select('*').single();
        const { data: nextRun, error: nextRunError } = await supabase.rpc('get_next_backup_run');
        const { data: logs, error: logsError } = await supabase.from('backup_logs').select('*').order('execution_time', { ascending: false }).limit(5);
        if (settingsError || nextRunError || logsError) {
          throw settingsError || nextRunError || logsError
        }
        
        return jsonResponse({ 
          settings, 
          next_run: nextRun?.[0]?.next_run || null,
          logs: logs || []
        });
      } catch (e: any) {
        console.error('[admin-backup] get_backup_settings failed:', e?.message || e);
        return errorResponse('Failed to load backup settings', 500);
      }
    }

    // ═══ UPDATE BACKUP SETTINGS ═══
    if (action === 'update_backup_settings') {
      const { is_enabled, backup_time, timezone } = body;
      if (typeof is_enabled === 'undefined' || !backup_time) return jsonResponse({ error: 'is_enabled and backup_time required' }, 400);

      try {
        console.log('Calling update_backup_settings RPC with:', { is_enabled, backup_time, timezone });
        const { data, error } = await supabase.rpc('update_backup_settings', {
          p_is_enabled: is_enabled,
          p_backup_time: backup_time,
          p_timezone: timezone || 'Asia/Jakarta'
        });
        
        if (error) {
          console.error('RPC error:', error);
          throw new Error(`RPC failed: ${error.message || JSON.stringify(error)}`);
        }
        
        console.log('Update successful, data:', data);
        return jsonResponse({ success: true, message: 'Settings updated successfully' });
      } catch (e: any) {
        console.error('Exception in update_backup_settings:', e);
        return errorResponse('Failed to update settings', 500);
      }
    }

    // ═══ GET BACKUP ═══
    if (action === 'get_backup') {
      const { backupId } = body
      const { data, error } = await supabase.from('backups').select('content').eq('id', backupId).single()
      if (error || !data) return jsonResponse({ error: 'Backup not found' }, 404)
      return jsonResponse(data.content)
    }

    // ═══ DELETE BACKUP ═══
    if (action === 'delete_backup') {
      const { backupId } = body
      const { error } = await supabase.from('backups').delete().eq('id', backupId)
      if (error) {
        console.error('[admin-backup] delete_backup failed:', error.message)
        return errorResponse('Failed to delete backup', 500)
      }
      return jsonResponse({ success: true })
    }

    // ═══ STATS ═══
    if (action === 'stats') {
      const counts: Record<string, number> = {}
      for (const table of TABLES) {
        if (table === 'backups' || table === 'backup_logs' || table === 'backup_settings') continue
        try {
          const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
          counts[table] = error ? -1 : (count ?? 0)
        } catch { counts[table] = -1 }
      }
      return jsonResponse({ counts, tables: TABLES.filter(t => !['backups', 'backup_logs', 'backup_settings'].includes(t)) })
    }

    // ═══ LIST USERS ═══
    if (action === 'list_users') {
      try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers()
        if (error) throw error
        return jsonResponse({ users })
      } catch (e: any) {
        console.error('[admin-backup] list_users failed:', e?.message || e)
        return errorResponse('Failed to list users', 500)
      }
    }

    // ═══ USER DETAIL ═══
    if (action === 'user_detail') {
      const { userId } = body
      if (!userId) return jsonResponse({ error: 'userId required' }, 400)
      try {
        const { count: animeCount } = await supabase.from('anime').select('*', { count: 'exact', head: true }).eq('user_id', userId)
        const { count: donghuaCount } = await supabase.from('donghua').select('*', { count: 'exact', head: true }).eq('user_id', userId)
        const { count: waifuCount } = await supabase.from('waifu').select('*', { count: 'exact', head: true }).eq('user_id', userId)
        const { count: tagihanCount } = await supabase.from('tagihan').select('*', { count: 'exact', head: true }).eq('user_id', userId)
        const { count: obatCount } = await supabase.from('obat').select('*', { count: 'exact', head: true }).eq('user_id', userId)
        
        return jsonResponse({
          anime_count: animeCount || 0,
          donghua_count: donghuaCount || 0,
          waifu_count: waifuCount || 0,
          tagihan_count: tagihanCount || 0,
          obat_count: obatCount || 0
        })
      } catch (e: any) {
        console.error('[admin-backup] user_detail failed:', e?.message || e)
        return errorResponse('Failed to load user detail', 500)
      }
    }

    // ═══ DELETE USER ═══
    if (action === 'delete_user') {
      const { userId } = body
      if (!userId) return jsonResponse({ error: 'userId required' }, 400)
      try {
        const { error } = await supabase.auth.admin.deleteUser(userId)
        if (error) throw error
        return jsonResponse({ success: true })
      } catch (e: any) {
        console.error('[admin-backup] delete_user failed:', e?.message || e)
        return errorResponse('Failed to delete user', 500)
      }
    }

    // ═══ RESTORE ═══
    if (action === 'restore') {
      const { backupData, dryRun } = body
      if (!backupData) return jsonResponse({ error: 'backupData required' }, 400)
      try {
        const tables = validateBackupPayload(backupData)
        if (dryRun) {
          return jsonResponse({
            success: true,
            dryRun: true,
            tables,
            counts: Object.fromEntries(tables.map((table) => [table, backupData[table].length])),
          })
        }

        validateRestoreConfirmation(body)
        await createPreRestoreBackup(supabase, tables)

        for (const table of tables) {
          // Delete existing data
          await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000')
          // Insert backup data
          if (backupData[table].length > 0) {
            const { error } = await supabase.from(table).insert(backupData[table])
            if (error) throw error
          }
        }
        return jsonResponse({ success: true })
      } catch (e: any) {
        console.error('[admin-backup] restore failed:', e?.message || e)
        return jsonResponse({ error: e.message }, 500)
      }
    }
    
    return errorResponse('Invalid action or missing implementation', 400)
  } catch (err: any) {
    console.error('[admin-backup] unhandled error:', err?.message || err)
    return errorResponse('Internal server error', 500)
  }
})
