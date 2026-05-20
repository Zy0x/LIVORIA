export type AdminRequestResult =
  | { authorized: true; mode: 'cron' | 'manual' }
  | { authorized: false; reason: string }

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

  if (!body?.email || !body?.password || !ADMIN_EMAIL || !ADMIN_KEY) {
    return { authorized: false, reason: 'Missing admin credentials.' }
  }

  const isAdmin = body.email.trim().toLowerCase() === ADMIN_EMAIL.trim().toLowerCase()
    && body.password === ADMIN_KEY

  return isAdmin
    ? { authorized: true, mode: 'manual' }
    : { authorized: false, reason: 'Invalid admin credentials.' }
}
