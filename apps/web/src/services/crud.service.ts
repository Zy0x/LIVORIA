import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type PublicTableName = keyof Database['public']['Tables'];

export async function fetchAll<T>(table: PublicTableName, selectColumns = '*'): Promise<T[]> {
  const { data, error } = await supabase
    .from(table)
    .select(selectColumns)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as T[];
}

export async function insertRow<T>(table: PublicTableName, row: Partial<T>): Promise<T> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from(table)
    .insert({ ...row, user_id: user.id })
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

export async function updateRow<T>(table: PublicTableName, id: string, row: Partial<T>): Promise<T> {
  const { data, error } = await supabase
    .from(table)
    .update(row)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as T;
}

export async function deleteRow(table: PublicTableName, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}
