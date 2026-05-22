const ADMIN_SESSION_KEY = 'livoria_admin';
const LEGACY_SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export interface AdminSession {
  email: string;
  expiresAt?: number;
  key?: string;
  token?: string;
}

interface StoredAdminSession {
  email?: unknown;
  expiresAt?: unknown;
  key?: unknown;
  token?: unknown;
  ts?: unknown;
}

function isBrowserStorageAvailable() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

export function clearAdminSession() {
  if (!isBrowserStorageAvailable()) return;
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

export function saveAdminSession(session: { email: string; expiresAt: number; token: string }) {
  if (!isBrowserStorageAvailable()) return;

  sessionStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      email: session.email,
      expiresAt: session.expiresAt,
      token: session.token,
      ts: Date.now(),
    }),
  );
}

export function getAdminSession(): AdminSession | null {
  if (!isBrowserStorageAvailable()) return null;

  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as StoredAdminSession;
    const email = typeof parsed.email === 'string' ? parsed.email.trim() : '';
    if (!email) {
      clearAdminSession();
      return null;
    }

    const token = typeof parsed.token === 'string' ? parsed.token : '';
    const expiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined;
    if (token && expiresAt && expiresAt > Date.now()) {
      return { email, expiresAt, token };
    }

    // Compatibility only: existing local sessions from older builds stored the admin key.
    const key = typeof parsed.key === 'string' ? parsed.key : '';
    const ts = typeof parsed.ts === 'number' ? parsed.ts : 0;
    if (key && ts && Date.now() - ts <= LEGACY_SESSION_MAX_AGE_MS) {
      return { email, key };
    }

    clearAdminSession();
    return null;
  } catch {
    clearAdminSession();
    return null;
  }
}

export function withAdminSession(session: AdminSession, body: Record<string, unknown>) {
  if (session.token) {
    return {
      ...body,
      adminToken: session.token,
      email: session.email,
    };
  }

  if (session.key) {
    return {
      ...body,
      email: session.email,
      password: session.key,
    };
  }

  return body;
}
