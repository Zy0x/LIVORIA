import { supabase } from '@/lib/supabase';

export async function invokeAdminBackup<T = any>(payload: Record<string, unknown> | { body: Record<string, unknown> }) {
  const body = 'body' in payload && payload.body ? payload.body : payload;
  const { data, error } = await supabase.functions.invoke<T>('admin-backup', { body });
  return { data, error };
}
