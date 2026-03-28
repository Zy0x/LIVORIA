import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get all active tagihan
    const { data: bills, error } = await supabase
      .from('tagihan')
      .select('*')
      .in('status', ['aktif', 'overdue'])

    if (error) throw error

    const now = new Date()
    const today = now.getDate()
    const notifications: any[] = []

    for (const bill of bills || []) {
      // Check recurring monthly
      if (bill.jenis_tempo === 'bulanan' && bill.tgl_bayar_hari && bill.tgl_tempo_hari) {
        const payDay = bill.tgl_bayar_hari
        const dueDay = bill.tgl_tempo_hari
        let inWindow = payDay <= dueDay
          ? (today >= payDay && today <= dueDay)
          : (today >= payDay || today <= dueDay)

        if (inWindow) {
          const level = today === dueDay ? 'critical' : 'warning'
          const title = today === dueDay
            ? `⚠️ JATUH TEMPO: ${bill.debitur_nama}`
            : `🔔 Reminder: ${bill.debitur_nama}`
          const message = today === dueDay
            ? `Hari ini adalah jatuh tempo untuk ${bill.barang_nama}. Cicilan: Rp${Number(bill.cicilan_per_bulan).toLocaleString('id-ID')}`
            : `Dalam rentang pembayaran untuk ${bill.barang_nama}. Jatuh tempo tanggal ${dueDay}.`

          notifications.push({
            user_id: bill.user_id,
            tagihan_id: bill.id,
            title,
            message,
            level,
          })
        }
      }

      // Check fixed-term
      if (bill.tanggal_jatuh_tempo) {
        const jt = new Date(bill.tanggal_jatuh_tempo)
        const diff = Math.ceil((jt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

        if (diff <= 3 && diff >= 0) {
          notifications.push({
            user_id: bill.user_id,
            tagihan_id: bill.id,
            title: diff === 0 ? `⚠️ JATUH TEMPO: ${bill.debitur_nama}` : `🔔 ${bill.debitur_nama}`,
            message: diff === 0
              ? `Hari ini jatuh tempo ${bill.barang_nama}!`
              : `${bill.barang_nama} jatuh tempo dalam ${diff} hari.`,
            level: diff === 0 ? 'critical' : diff <= 1 ? 'warning' : 'info',
          })
        } else if (diff < 0) {
          // Update status to overdue
          await supabase
            .from('tagihan')
            .update({ status: 'overdue' })
            .eq('id', bill.id)
            .eq('status', 'aktif')

          notifications.push({
            user_id: bill.user_id,
            tagihan_id: bill.id,
            title: `🚨 OVERDUE: ${bill.debitur_nama}`,
            message: `${bill.barang_nama} sudah melewati jatuh tempo ${Math.abs(diff)} hari!`,
            level: 'critical',
          })
        }
      }
    }

    // Batch insert notifications (skip duplicates for today)
    if (notifications.length > 0) {
      const todayStr = now.toISOString().split('T')[0]

      for (const notif of notifications) {
        // Check if already notified today
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('tagihan_id', notif.tagihan_id)
          .eq('user_id', notif.user_id)
          .gte('created_at', `${todayStr}T00:00:00`)
          .limit(1)

        if (!existing || existing.length === 0) {
          await supabase.from('notifications').insert(notif)
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: bills?.length || 0, notifications: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
