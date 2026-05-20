export type AdminRequestResult =
  | { authorized: true; mode: 'cron' | 'manual' }
  | { authorized: false; reason: string }

function base64UrlToBytes(value: string) {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let index = 0; index < a.length; index += 1) {
    diff |= a[index] ^ b[index]
  }
  return diff === 0
}

async function verifyAdminToken(token: string, expectedEmail: string, secret: string) {
  const [payloadPart, signaturePart] = token.split('.')
  if (!payloadPart || !signaturePart) return false

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { hash: 'SHA-256', name: 'HMAC' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadPart))
  if (!timingSafeEqual(new Uint8Array(signature), base64UrlToBytes(signaturePart))) return false

  const payloadText = new TextDecoder().decode(base64UrlToBytes(payloadPart))
  const payload = JSON.parse(payloadText) as { email?: string; exp?: number }
  return payload.email?.trim().toLowerCase() === expectedEmail.trim().toLowerCase() &&
    typeof payload.exp === 'number' &&
    payload.exp > Date.now()
}

export async function verifyAdminRequest(req: Request, body: any): Promise<AdminRequestResult> {
  const ADMIN_EMAIL = Deno.env.get('ADMIN_EMAIL')
  const ADMIN_KEY = Deno.env.get('ADMIN_KEY')
  const CRON_SECRET = Deno.env.get('ADMIN_CRON_SECRET')
    || Deno.env.get('BACKUP_CRON_SECRET')
    || Deno.env.get('AUTO_BACKUP_SECRET')
    || Deno.env.get('CRON_SECRET')
  const cronSecret = req.headers.get('x-livoria-cron-secret') || body?.cronSecret

  if (CRON_SECRET && cronSecret === CRON_SECRET) {
    return body?.action === 'backup'
      ? { authorized: true, mode: 'cron' }
      : { authorized: false, reason: 'Cron access is only allowed for backup.' }
  }

  if (body?.isAuto) {
    return { authorized: false, reason: 'Missing or invalid cron secret.' }
  }

  if (!ADMIN_EMAIL || !ADMIN_KEY) {
    return { authorized: false, reason: 'Missing admin credentials.' }
  }

  if (body?.email && body?.adminToken) {
    const tokenValid = await verifyAdminToken(
      String(body.adminToken),
      ADMIN_EMAIL,
      Deno.env.get('ADMIN_SESSION_SECRET') || ADMIN_KEY,
    ).catch(() => false)

    return tokenValid
      ? { authorized: true, mode: 'manual' }
      : { authorized: false, reason: 'Invalid admin token.' }
  }

  if (!body?.email || !body?.password) {
    return { authorized: false, reason: 'Missing admin credentials.' }
  }

  const isAdmin = body.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()
    && body.password === ADMIN_KEY

  return isAdmin
    ? { authorized: true, mode: 'manual' }
    : { authorized: false, reason: 'Invalid admin credentials.' }
}
