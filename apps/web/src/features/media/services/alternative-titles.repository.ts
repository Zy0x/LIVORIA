import { supabase } from '@/lib/supabase';

const ALLOWED_MEDIA_TABLES = new Set(['anime', 'donghua']);

export async function saveAlternativeTitles(tableName: string, itemId: string, alternativeTitles: string) {
  if (!ALLOWED_MEDIA_TABLES.has(tableName)) {
    throw new Error('Jenis koleksi tidak didukung.');
  }

  const { error } = await supabase
    .from(tableName)
    .update({ alternative_titles: alternativeTitles })
    .eq('id', itemId);

  if (error) throw error;
}
