/**
 * admin-auth — LIVORIA Edge Function
 *
 * Memvalidasi kredensial admin menggunakan ADMIN_EMAIL dan ADMIN_KEY
 * dari Supabase secrets.
 */

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

    if (!ADMIN_EMAIL || !ADMIN_KEY) {
      return new Response(JSON.stringify({ error: 'Admin credentials not configured in Supabase secrets' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return new Response(JSON.stringify({ authenticated: false, error: 'Email and password required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const isValid = email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase() && password === ADMIN_KEY

    return new Response(JSON.stringify({ authenticated: isValid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ authenticated: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
