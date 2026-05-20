/**
 * admin-auth — LIVORIA Edge Function
 *
 * Memvalidasi kredensial admin menggunakan ADMIN_EMAIL dan ADMIN_KEY
 * dari Supabase secrets.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('ADMIN_ALLOWED_ORIGIN') || Deno.env.get('ALLOWED_ORIGIN') || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function base64UrlEncode(bytes: Uint8Array) {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '')
}

function base64UrlEncodeText(text: string) {
  return base64UrlEncode(new TextEncoder().encode(text))
}

async function signAdminToken(payload: Record<string, unknown>, secret: string) {
  const encodedPayload = base64UrlEncodeText(JSON.stringify(payload))
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(encodedPayload))
  return `${encodedPayload}.${base64UrlEncode(new Uint8Array(signature))}`
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ authenticated: false, error: 'Method not allowed' }, 405)
  }

  try {
    const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')
    const ADMIN_KEY = Deno.env.get('ADMIN_KEY')

    if (!ADMIN_EMAIL || !ADMIN_KEY) {
      console.error('[admin-auth] ADMIN_EMAIL or ADMIN_KEY is not configured')
      return jsonResponse({ authenticated: false, error: 'Admin auth is not configured' }, 500)
    }

    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse({ authenticated: false, error: 'Invalid JSON body' }, 400)
    }

    const { email, password } = body

    if (!email || !password) {
      return jsonResponse({ authenticated: false, error: 'Email and password required' }, 400)
    }

    const normalizedEmail = email.trim().toLowerCase()
    const isValid = normalizedEmail === ADMIN_EMAIL.trim().toLowerCase() && password === ADMIN_KEY

    if (!isValid) {
      return jsonResponse({ authenticated: false })
    }

    const expiresAt = Date.now() + (2 * 60 * 60 * 1000)
    const adminToken = await signAdminToken({
      email: normalizedEmail,
      exp: expiresAt,
      nonce: crypto.randomUUID(),
    }, Deno.env.get('ADMIN_SESSION_SECRET') || ADMIN_KEY)

    return jsonResponse({ adminToken, authenticated: true, expiresAt })
  } catch (err: any) {
    console.error('[admin-auth] unhandled error:', err?.message || err)
    return jsonResponse({ authenticated: false, error: 'Internal server error' }, 500)
  }
})
