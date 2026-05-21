import { supabase } from '@/integrations/supabase/client';

export type SettingsBackupTable =
  | 'anime'
  | 'donghua'
  | 'waifu'
  | 'obat'
  | 'tagihan'
  | 'tagihan_history'
  | 'struk';

export async function exportSettingsTable(table: SettingsBackupTable) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return data || [];
}

export async function upsertSettingsRows(table: SettingsBackupTable, rows: Array<Record<string, any>>) {
  const { error } = await supabase.from(table).upsert(rows as any, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteSettingsRowsForUser(table: SettingsBackupTable, userId: string) {
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error) throw error;
}

export async function upsertSettingsTagihan(row: Record<string, any>) {
  const { data, error } = await supabase
    .from('tagihan')
    .upsert(row as any, { onConflict: 'id' })
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: string } | null;
}
