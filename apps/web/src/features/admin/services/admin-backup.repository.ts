import { supabase } from '@/integrations/supabase/client';

export async function invokeAdminBackup<T = unknown>(payload: Record<string, unknown> | { body: Record<string, unknown> }) {
  const body = 'body' in payload && payload.body ? payload.body : payload;
  const { data, error } = await supabase.functions.invoke<T>('admin-backup', { body });
  return { data, error };
}
