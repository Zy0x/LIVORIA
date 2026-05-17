/**
 * admin-backup — LIVORIA Edge Function
 *
 * Full database backup/restore dengan rotasi 7 hari.
 * + list_users, user_detail, delete_user untuk admin per-user review
 * + get_backup, delete_backup untuk manage backup individual
 * + backup_logs for transparency
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
}

async function verifyAdmin(body: any) {
  const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')
  const ADMIN_KEY = Deno.env.get('ADMIN_KEY')
  if (body.isAuto) return true
  if (!body.email || !body.password || !ADMIN_EMAIL || !ADMIN_KEY) return false
  return body.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase() && body.password === ADMIN_KEY
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, isAuto } = body

    if (!await verifyAdmin(body)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Dynamic table discovery with fallback
    let TABLES: string[]
    try {
      const { data: tablesData, error: tablesError } = await supabase.rpc('get_public_tables')
      TABLES = tablesError
        ? ['approval_actions', 'audit_logs', 'expense_categories', 'expense_receipts', 'expenses', 'profiles', 'user_roles']
        : tablesData.map((t: any) => t.table_name)
    } catch {
      TABLES = ['approval_actions', 'audit_logs', 'expense_categories', 'expense_receipts', 'expenses', 'profiles', 'user_roles']
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
        if (isAuto) {
          await supabase.from('backup_logs').insert({
            status: 'failed',
            message: `Automatic backup failed: ${err.message}`
          })
        }
        return jsonResponse({ error: err.message }, 500)
      }
    }

    // ═══ LIST BACKUPS ═══
    if (action === 'list_backups') {
      try {
        const { data: backups, error } = await supabase
          .from('backups')
          .select('id, created_at, content')
          .order('created_at', { ascending: false })

        const simplified = (backups || []).map((b: any) => ({
          id: b.id,
          created_at: b.created_at,
          meta: b.content?._meta ? JSON.stringify(b.content._meta) : '{}',
        }))

        return jsonResponse({ backups: simplified, error })
      } catch (e: any) {
        return jsonResponse({ backups: [], error: e.message })
      }
    }

    // ═══ GET BACKUP SETTINGS ═══
    if (action === 'get_backup_settings') {
      try {
        const { data: settings, error: settingsError } = await supabase.from('backup_settings').select('*').single();
        const { data: nextRun, error: nextRunError } = await supabase.rpc('get_next_backup_run');
        const { data: logs, error: logsError } = await supabase.from('backup_logs').select('*').order('execution_time', { ascending: false }).limit(5);
        
        return jsonResponse({ 
          settings, 
          next_run: nextRun?.[0]?.next_run || null,
          logs: logs || []
        });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
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
        return jsonResponse({ error: e.message || 'Failed to update settings' }, 500);
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
      if (error) return jsonResponse({ error: error.message }, 500)
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
        return jsonResponse({ error: e.message }, 500)
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
        return jsonResponse({ error: e.message }, 500)
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
        return jsonResponse({ error: e.message }, 500)
      }
    }

    // ═══ RESTORE ═══
    if (action === 'restore') {
      const { backupData } = body
      if (!backupData) return jsonResponse({ error: 'backupData required' }, 400)
      try {
        for (const table of Object.keys(backupData)) {
          if (table.startsWith('_')) continue
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
        return jsonResponse({ error: e.message }, 500)
      }
    }
    
    return jsonResponse({ error: 'Invalid action or missing implementation' }, 400)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})
