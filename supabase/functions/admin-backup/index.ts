/**
 * admin-backup — LIVORIA Edge Function
 *
 * Full database backup/restore dengan rotasi 7 hari.
 * + list_users, user_detail, delete_user untuk admin per-user review
 * + get_backup, delete_backup untuk manage backup individual
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
    const { action, email, password } = body

    if (!await verifyAdmin(body)) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const SUPABASE_PROJECT_REF = SUPABASE_URL.split('.')[0].split('//')[1];
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
      const backup: Record<string, any[]> = {}
      const counts: Record<string, number> = {}

      for (const table of TABLES) {
        if (table === 'backups' || table.startsWith('_')) continue
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
        },
        ...backup,
      }

      // Save to backups table
      try {
        await supabase.from('backups').insert({
          content: backupContent,
          created_at: new Date().toISOString()
        })

        // Rotation: delete older than 7 days
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        await supabase.from('backups').delete().lt('created_at', sevenDaysAgo.toISOString())
      } catch {
        // backups table might not exist yet — still return the backup data
      }

      return jsonResponse(backupContent)
    }

    // ═══ LIST BACKUPS ═══
    if (action === 'list_backups') {
      try {
        const { data: backups, error } = await supabase
          .from('backups')
          .select('id, created_at, content')
          .order('created_at', { ascending: false })

        // Extract meta from content for display
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

    // ═══ GET BACKUP (download) ═══
    if (action === 'get_backup') {
      const { backupId } = body
      if (!backupId) return jsonResponse({ error: 'backupId required' }, 400)
      const { data, error } = await supabase
        .from('backups').select('content').eq('id', backupId).single()
      if (error || !data) return jsonResponse({ error: 'Backup not found' }, 404)
      return jsonResponse(data.content)
    }

    // ═══ DELETE BACKUP ═══
    if (action === 'delete_backup') {
      const { backupId } = body
      if (!backupId) return jsonResponse({ error: 'backupId required' }, 400)
      const { error } = await supabase.from('backups').delete().eq('id', backupId)
      if (error) return jsonResponse({ error: error.message }, 500)
      return jsonResponse({ success: true })
    }

    // ═══ STATS ═══
    if (action === 'stats') {
      const counts: Record<string, number> = {}
      for (const table of TABLES) {
        if (table === 'backups') continue
        try {
          const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
          counts[table] = error ? -1 : (count ?? 0)
        } catch {
          counts[table] = -1
        }
      }
      return jsonResponse({ counts, tables: TABLES.filter(t => t !== 'backups') })
    }

    // ═══ LIST USERS ═══
    if (action === 'list_users') {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 100 })
      if (error) return jsonResponse({ error: error.message }, 500)
      
      const simplified = (users || []).map(u => {
        // Detect all providers from identities
        const identities = u.identities || []
        const providers = identities.map((id: any) => id.provider).filter(Boolean)
        const uniqueProviders = [...new Set(providers)] as string[]
        
        return {
          id: u.id,
          email: u.email,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          provider: u.app_metadata?.provider || 'email',
          providers: uniqueProviders.length > 0 ? uniqueProviders : [u.app_metadata?.provider || 'email'],
          email_confirmed_at: u.email_confirmed_at,
          phone: u.phone || null,
          user_metadata: {
            full_name: u.user_metadata?.full_name || u.user_metadata?.name || null,
            avatar_url: u.user_metadata?.avatar_url || null,
          },
        }
      })
      return jsonResponse({ users: simplified })
    }

    // ═══ USER DETAIL ═══
    if (action === 'user_detail') {
      const { userId } = body
      if (!userId) return jsonResponse({ error: 'userId required' }, 400)

      // Count per table for this user (only tables with user_id column)
      const counts: Record<string, number> = {}
      const userTables = TABLES.filter(t => t !== 'backups')
      
      for (const table of userTables) {
        try {
          const { count, error } = await supabase
            .from(table).select('*', { count: 'exact', head: true }).eq('user_id', userId)
          counts[table] = error ? 0 : (count ?? 0)
        } catch {
          // Table might not have user_id column
          counts[table] = 0
        }
      }

      return jsonResponse({ counts })
    }

    // ═══ DELETE USER ═══
    if (action === 'delete_user') {
      const { userId } = body
      if (!userId) return jsonResponse({ error: 'userId required' }, 400)
      
      // Delete user data from all tables with user_id
      const userTables = TABLES.filter(t => t !== 'backups')
      const deleteResults: Record<string, string> = {}
      
      for (const table of userTables) {
        try {
          const { error } = await supabase.from(table).delete().eq('user_id', userId)
          deleteResults[table] = error ? error.message : 'ok'
        } catch {
          deleteResults[table] = 'skipped'
        }
      }
      
      // Delete the auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(userId)
      if (authError) return jsonResponse({ error: authError.message, deleteResults }, 500)
      
      return jsonResponse({ success: true, deleteResults })
    }

    // ═══ RESTORE ═══
    if (action === 'restore' && body.data) {
      const results: Record<string, { inserted: number; errors: number }> = {}
      const tablesToRestore = Object.keys(body.data).filter(k => !k.startsWith('_'))

      for (const table of tablesToRestore) {
        if (!Array.isArray(body.data[table]) || body.data[table].length === 0) continue
        let inserted = 0, errors = 0
        const rows = body.data[table]
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50)
          const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
          if (error) { errors += batch.length } else { inserted += batch.length }
        }
        results[table] = { inserted, errors }
      }

      return jsonResponse({ success: true, results })
    }

    // ═══ GET BACKUP SETTINGS ═══
    if (action === 'get_backup_settings') {
      try {
        const { data, error } = await supabase.from('backup_settings').select('*').single();
        if (error) throw error;
        return jsonResponse({ settings: data });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    // ═══ UPDATE BACKUP SETTINGS ═══
    if (action === 'update_backup_settings') {
      const { is_enabled, backup_time } = body;
      if (typeof is_enabled === 'undefined' || !backup_time) return jsonResponse({ error: 'is_enabled and backup_time required' }, 400);

      try {
        const { error } = await supabase.rpc('update_backup_settings', {
          p_is_enabled: is_enabled,
          p_backup_time: backup_time,
          p_project_ref: SUPABASE_PROJECT_REF,
          p_anon_key: SUPABASE_ANON_KEY,
        });
        if (error) throw error;
        return jsonResponse({ success: true });
      } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
      }
    }

    return jsonResponse({ error: 'Invalid action' }, 400)
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500)
  }
})
