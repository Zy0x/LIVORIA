import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';

export type MediaImportTable = 'anime' | 'donghua';

interface BulkImportAiParams {
  text: string;
  mediaType: MediaImportTable;
  defaultStatus: string;
  preferredProvider?: string;
  preferredModel?: string;
}

export async function getCurrentImportUserId() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user?.id ?? null;
}

export async function insertMediaImportRow(table: MediaImportTable, row: Record<string, unknown>) {
  const { error } = await supabase.from(table).insert(row as TablesInsert<typeof table>);
  if (error) throw error;
}

export async function parseMediaImportChunkWithAi(params: BulkImportAiParams) {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.access_token) throw new Error('Silakan login terlebih dahulu');

  const { data, error: invokeError } = await supabase.functions.invoke('bulk-import-ai', {
    body: {
      text: params.text,
      mediaType: params.mediaType,
      defaultStatus: params.defaultStatus,
      preferredProvider: params.preferredProvider,
      preferredModel: params.preferredModel,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (invokeError) throw invokeError;
  return data;
}
