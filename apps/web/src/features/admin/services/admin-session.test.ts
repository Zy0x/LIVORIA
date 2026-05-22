import { afterEach, describe, expect, it } from 'vitest';

import {
  clearAdminSession,
  getAdminSession,
  saveAdminSession,
  withAdminSession,
} from './admin-session';

function installSessionStorage() {
  const store = new Map<string, string>();
  const storage = {
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    removeItem: (key: string) => store.delete(key),
    setItem: (key: string, value: string) => store.set(key, value),
  } as Storage;

  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { sessionStorage: storage },
  });

  return storage;
}

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'sessionStorage');
  Reflect.deleteProperty(globalThis, 'window');
});

describe('admin session storage', () => {
  it('stores token sessions without the raw admin key', () => {
    const storage = installSessionStorage();

    saveAdminSession({
      email: 'admin@example.com',
      expiresAt: Date.now() + 60_000,
      token: 'signed-token',
    });

    expect(storage.getItem('livoria_admin')).not.toContain('key');
    expect(getAdminSession()).toEqual({
      email: 'admin@example.com',
      expiresAt: expect.any(Number),
      token: 'signed-token',
    });
  });

  it('clears expired token sessions', () => {
    installSessionStorage().setItem(
      'livoria_admin',
      JSON.stringify({
        email: 'admin@example.com',
        expiresAt: Date.now() - 1,
        token: 'expired-token',
        ts: Date.now(),
      }),
    );

    expect(getAdminSession()).toBeNull();
    expect(sessionStorage.getItem('livoria_admin')).toBeNull();
  });

  it('builds token-based admin request bodies', () => {
    expect(
      withAdminSession(
        { email: 'admin@example.com', token: 'signed-token' },
        { action: 'stats' },
      ),
    ).toEqual({
      action: 'stats',
      adminToken: 'signed-token',
      email: 'admin@example.com',
    });
  });

  it('keeps a short legacy compatibility path for old sessions', () => {
    installSessionStorage().setItem(
      'livoria_admin',
      JSON.stringify({
        email: 'admin@example.com',
        key: 'legacy-key',
        ts: Date.now(),
      }),
    );

    expect(withAdminSession(getAdminSession()!, { action: 'stats' })).toEqual({
      action: 'stats',
      email: 'admin@example.com',
      password: 'legacy-key',
    });
    clearAdminSession();
  });
});
