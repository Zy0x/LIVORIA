import { supabase } from '@/integrations/supabase/client';

type AlternativeTitleTable = 'anime' | 'donghua';

const ALLOWED_MEDIA_TABLES = new Set<AlternativeTitleTable>(['anime', 'donghua']);

function isAlternativeTitleTable(tableName: string): tableName is AlternativeTitleTable {
  return ALLOWED_MEDIA_TABLES.has(tableName as AlternativeTitleTable);
}

export async function saveAlternativeTitles(tableName: string, itemId: string, alternativeTitles: string) {
  if (!isAlternativeTitleTable(tableName)) {
    throw new Error('Jenis koleksi tidak didukung.');
  }

  const { error } = await supabase
    .from(tableName)
    .update({ alternative_titles: alternativeTitles })
    .eq('id', itemId);

  if (error) throw error;
}
