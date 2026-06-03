import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { TAGIHAN_HISTORY_SELECT_COLUMNS } from '@/services/query-columns';

import type { TagihanHistory } from '../types/tagihan.types';
import { mapHistory, mapHistoryList } from './tagihan.mapper';

async function requireUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export const historyRepository = {
  async getByTagihan(tagihanId: string): Promise<TagihanHistory[]> {
    const { data, error } = await supabase
      .from('tagihan_history')
      .select(TAGIHAN_HISTORY_SELECT_COLUMNS)
      .eq('tagihan_id', tagihanId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return mapHistoryList(data);
  },

  async create(row: Partial<TagihanHistory>): Promise<TagihanHistory> {
    const userId = await requireUserId();
    const insertRow = { ...row, user_id: userId } as TablesInsert<'tagihan_history'>;

    const { data, error } = await supabase
      .from('tagihan_history')
      .insert(insertRow)
      .select()
      .single();
    if (error) throw error;
    return mapHistory(data);
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('tagihan_history').delete().eq('id', id);
    if (error) throw error;
  },
};
