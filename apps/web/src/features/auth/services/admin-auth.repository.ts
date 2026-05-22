import { supabase } from '@/integrations/supabase/client';

interface AdminAuthResponse {
  adminToken?: string;
  authenticated?: boolean;
  error?: string;
  expiresAt?: number;
}

export interface AdminLoginSession {
  email: string;
  expiresAt: number;
  token: string;
}

export async function authenticateAdminCredentials(email: string, password: string): Promise<AdminLoginSession | null> {
  const cleanEmail = email.trim();
  const { data, error } = await supabase.functions.invoke<AdminAuthResponse>('admin-auth', {
    body: { email: cleanEmail, password },
  });

  if (error) throw error;
  if (!data?.authenticated) return null;
  if (!data.adminToken || !data.expiresAt) {
    throw new Error(data.error || 'Sesi admin tidak tersedia.');
  }

  return {
    email: cleanEmail,
    expiresAt: data.expiresAt,
    token: data.adminToken,
  };
}

export async function verifyAdminCredentials(email: string, password: string) {
  const session = await authenticateAdminCredentials(email, password);
  return Boolean(session);
}
