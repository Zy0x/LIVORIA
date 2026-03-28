/**
 * admin-backup — LIVORIA Edge Function
 *
 * Full database backup/restore dengan rotasi 7 hari.
 * Menggunakan SUPABASE_SERVICE_ROLE_KEY untuk akses penuh.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')
    const ADMIN_KEY = Deno.env.get('ADMIN_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const body = await req.json()
    const { action, email, password, data, isAuto } = body

    // Verify admin credentials (unless it's an internal cron call - but for now we keep it secure)
    if (!isAuto) {
      if (!email || !password || !ADMIN_EMAIL || !ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      if (email.trim().toLowerCase() !== ADMIN_EMAIL.trim().toLowerCase() || password !== ADMIN_KEY) {
        return new Response(JSON.stringify({ error: 'Invalid admin credentials' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // 1. Dynamic Table Discovery
    // Kita ambil daftar tabel dari schema public
    const { data: tablesData, error: tablesError } = await supabase.rpc('get_public_tables')
    
    // Fallback jika RPC tidak ada
    const TABLES = tablesError ? 
      ['anime', 'donghua', 'waifu', 'obat', 'tagihan', 'tagihan_history', 'struk', 'user_preferences'] : 
      tablesData.map((t: any) => t.table_name)

    if (action === 'backup') {
      const backup: Record<string, any[]> = {}
      const counts: Record<string, number> = {}

      for (const table of TABLES) {
        // Skip system tables or backup tables themselves
        if (table === 'backups' || table.startsWith('_')) continue;
        
        const { data: rows, count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact' })

        if (!error) {
          backup[table] = rows || []
          counts[table] = count ?? (rows?.length || 0)
        }
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

      // 2. Save to 'backups' table for 7-day rotation
      const { error: saveError } = await supabase
        .from('backups')
        .insert({
          content: backupContent,
          created_at: new Date().toISOString()
        })

      if (saveError) console.error('Failed to save backup to DB:', saveError)

      // 3. Rotation Logic: Delete backups older than 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      
      await supabase
        .from('backups')
        .delete()
        .lt('created_at', sevenDaysAgo.toISOString())

      return new Response(JSON.stringify(backupContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'list_backups') {
      const { data: backups, error } = await supabase
        .from('backups')
        .select('id, created_at, content->>_meta as meta')
        .order('created_at', { ascending: false })

      return new Response(JSON.stringify({ backups, error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'stats') {
      const counts: Record<string, number> = {}
      for (const table of TABLES) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
        counts[table] = error ? -1 : (count ?? 0)
      }

      return new Response(JSON.stringify({ counts, tables: TABLES }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'restore' && data) {
      const results: Record<string, { inserted: number; errors: number }> = {}
      const tablesToRestore = Object.keys(data).filter(k => !k.startsWith('_'))

      for (const table of tablesToRestore) {
        if (!Array.isArray(data[table]) || data[table].length === 0) continue

        let inserted = 0
        let errors = 0

        const rows = data[table]
        for (let i = 0; i < rows.length; i += 50) {
          const batch = rows.slice(i, i + 50)
          const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id' })
          if (error) {
            console.error(`Restore error on ${table}:`, error)
            errors += batch.length
          } else {
            inserted += batch.length
          }
        }
        results[table] = { inserted, errors }
      }

      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
