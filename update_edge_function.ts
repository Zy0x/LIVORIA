/**
 * update_edge_function.ts
 *
 * Script ini berisi versi terbaru dari Edge Function admin-backup.
 * Perbaikan:
 * 1. Menangani masalah 0 Tabel/Record dengan memastikan dynamic table discovery berjalan lancar.
 * 2. Menambahkan action 'delete_backup' untuk menghapus record backup.
 * 3. Menambahkan action 'delete_user' untuk menghapus akun user secara permanen.
 * 4. Memperbaiki list_users untuk menyertakan informasi identitas provider yang lebih lengkap.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const { action } = body

    if (!await verifyAdmin(body)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    // Dynamic table discovery - Fallback to hardcoded list if RPC fails
    let TABLES = ['anime', 'donghua', 'waifu', 'obat', 'tagihan', 'tagihan_history', 'struk', 'user_preferences']
    try {
      const { data: tablesData, error: tablesError } = await supabase.rpc('get_public_tables')
      if (!tablesError && Array.isArray(tablesData)) {
        TABLES = tablesData.map((t: any) => t.table_name)
      }
    } catch (e) {
      console.error('RPC get_public_tables failed, using fallback list', e)
    }

    // ═══ BACKUP ═══
    if (action === 'backup') {
      const backup: Record<string, any[]> = {}
      const counts: Record<string, number> = {}

      for (const table of TABLES) {
        if (table === 'backups' || table.startsWith('_')) continue
        // Using service role to bypass RLS and get all data
        const { data: rows, count, error } = await supabase
          .from(table).select('*', { count: 'exact' })
        
        if (!error) {
          backup[table] = rows || []
          counts[table] = count ?? (rows?.length || 0)
        } else {
          console.error(`Error backing up table ${table}:`, error)
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

      // Save to backups table
      const { error: insertError } = await supabase.from('backups').insert({
        content: backupContent,
        created_at: new Date().toISOString()
      })

      if (insertError) throw insertError

      // Rotation: delete older than 7 days
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      await supabase.from('backups').delete().lt('created_at', sevenDaysAgo.toISOString())

      return new Response(JSON.stringify(backupContent), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══ DELETE BACKUP ═══
    if (action === 'delete_backup') {
      const { backupId } = body
      if (!backupId) return new Response(JSON.stringify({ error: 'backupId required' }), { status: 400, headers: corsHeaders })
      
      const { error } = await supabase.from('backups').delete().eq('id', backupId)
      if (error) throw error
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
    }

    // ═══ DELETE USER ═══
    if (action === 'delete_user') {
      const { userId } = body
      if (!userId) return new Response(JSON.stringify({ error: 'userId required' }), { status: 400, headers: corsHeaders })
      
      const { error } = await supabase.auth.admin.deleteUser(userId)
      if (error) throw error
      
      return new Response(JSON.stringify({ success: true }), { headers: corsHeaders })
    }

    // ═══ LIST BACKUPS ═══
    if (action === 'list_backups') {
      const { data: backups, error } = await supabase
        .from('backups')
        .select('id, created_at, content->>_meta as meta')
        .order('created_at', { ascending: false })

      return new Response(JSON.stringify({ backups, error }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══ GET BACKUP (download) ═══
    if (action === 'get_backup') {
      const { backupId } = body
      if (!backupId) {
        return new Response(JSON.stringify({ error: 'backupId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const { data, error } = await supabase
        .from('backups')
        .select('content')
        .eq('id', backupId)
        .single()
      
      if (error || !data) {
        return new Response(JSON.stringify({ error: 'Backup not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify(data.content), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══ STATS ═══
    if (action === 'stats') {
      const counts: Record<string, number> = {}
      for (const table of TABLES) {
        if (table === 'backups' || table.startsWith('_')) continue
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        counts[table] = error ? -1 : (count ?? 0)
      }
      return new Response(JSON.stringify({ counts, tables: TABLES }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══ LIST USERS ═══
    if (action === 'list_users') {
      const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      const simplified = (users || []).map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        app_metadata: u.app_metadata,
        identities: u.identities,
        provider: u.app_metadata?.provider || (u.identities?.[0]?.provider) || 'email',
        email_confirmed_at: u.email_confirmed_at,
      }))
      return new Response(JSON.stringify({ users: simplified }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ═══ USER DETAIL ═══
    if (action === 'user_detail') {
      const { userId } = body
      if (!userId) {
        return new Response(JSON.stringify({ error: 'userId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Count per table for this user
      const counts: Record<string, number> = {}
      const userTables = ['anime', 'donghua', 'waifu', 'obat', 'tagihan', 'tagihan_history', 'struk']
      for (const table of userTables) {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
        counts[table] = error ? 0 : (count ?? 0)
      }

      // Tagihan summary
      let tagihanSummary = null
      const { data: tagihanData } = await supabase
        .from('tagihan')
        .select('harga_awal, total_dibayar, sisa_hutang, keuntungan_estimasi, status, sumber_modal')
        .eq('user_id', userId)

      if (tagihanData && tagihanData.length > 0) {
        const exclLuar = tagihanData.filter((t: any) => t.sumber_modal !== 'dana_luar')
        tagihanSummary = {
          total: tagihanData.length,
          aktif: tagihanData.filter((t: any) => t.status === 'aktif').length,
          lunas: tagihanData.filter((t: any) => t.status === 'lunas').length,
          overdue: tagihanData.filter((t: any) => t.status === 'overdue').length,
          totalModal: exclLuar.reduce((s: number, t: any) => s + Number(t.harga_awal), 0),
          totalDibayar: tagihanData.reduce((s: number, t: any) => s + Number(t.total_dibayar), 0),
          totalSisa: tagihanData.reduce((s: number, t: any) => s + Number(t.sisa_hutang), 0),
          totalKeuntungan: tagihanData.reduce((s: number, t: any) => s + Number(t.keuntungan_estimasi), 0),
        }
      }

      return new Response(JSON.stringify({ counts, tagihanSummary }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
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
