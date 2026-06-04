'use client';

import { createSupabaseBrowserClient } from '../supabase/browser';
import { getSupabasePublicEnv } from '../supabase/env';

export type AuthMode = 'login' | 'signup' | 'admin';

type AuthResult = {
  message: string;
  redirectTo?: string;
  refresh?: boolean;
};

export function isClientAuthConfigured() {
  return getSupabasePublicEnv().isConfigured;
}

export async function submitEmailAuth(mode: AuthMode, email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim();
  const supabase = createSupabaseBrowserClient();

  if (mode === 'admin') {
    const { data, error } = await supabase.functions.invoke<{
      adminToken?: string;
      authenticated?: boolean;
      error?: string;
      expiresAt?: number;
    }>('admin-auth', {
      body: { email: cleanEmail, password: password.trim() },
    });

    if (error) throw error;
    if (!data?.authenticated) throw new Error(data?.error || 'Akses admin tidak valid.');
    if (!data.adminToken || !data.expiresAt) throw new Error('Sesi admin tidak tersedia.');

    sessionStorage.setItem(
      'livoria_admin',
      JSON.stringify({
        email: cleanEmail,
        expiresAt: data.expiresAt,
        token: data.adminToken,
        ts: Date.now(),
      }),
    );

    return { message: 'Login admin berhasil.', redirectTo: '/admin' };
  }

  const result =
    mode === 'login'
      ? await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      : await supabase.auth.signUp({ email: cleanEmail, password });

  if (result.error) throw result.error;

  return {
    message: mode === 'login' ? 'Login berhasil.' : 'Pendaftaran berhasil. Cek email bila konfirmasi diperlukan.',
    redirectTo: mode === 'login' ? '/' : undefined,
    refresh: true,
  };
}

export async function startGoogleAuth(origin: string) {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithOAuth({
    options: { redirectTo: `${origin}/` },
    provider: 'google',
  });
  if (error) throw error;
}
