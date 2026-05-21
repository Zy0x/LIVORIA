import { supabase } from '@/integrations/supabase/client';

export async function verifyAdminCredentials(email: string, password: string) {
  const { data, error } = await supabase.functions.invoke<{ authenticated?: boolean }>('admin-auth', {
    body: { email, password },
  });

  if (error) throw error;
  return Boolean(data?.authenticated);
}
