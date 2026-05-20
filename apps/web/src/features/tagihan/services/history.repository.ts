import { supabase } from '@/lib/supabase';

import type { TagihanHistory } from '../types/tagihan.types';
import { mapHistory, mapHistoryList } from './tagihan.mapper';

export const historyRepository = {
  async getByTagihan(tagihanId: string): Promise<TagihanHistory[]> {
    const { data, error } = await supabase
      .from('tagihan_history')
      .select('*')
      .eq('tagihan_id', tagihanId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return mapHistoryList(data);
  },

  async create(row: Partial<TagihanHistory>): Promise<TagihanHistory> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('tagihan_history')
      .insert({ ...row, user_id: user.id })
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

