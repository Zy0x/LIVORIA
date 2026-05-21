import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { OBAT_SELECT_COLUMNS } from '@/services/query-columns';
import type { ObatInput, ObatItem } from '../types/obat.types';
import { mapObatInput, mapObatRow, mapObatRows } from './obat.mapper';

export interface ObatRepository {
  list(): Promise<ObatItem[]>;
  create(input: ObatInput): Promise<ObatItem>;
  update(id: string, input: ObatInput): Promise<ObatItem>;
  delete(id: string): Promise<void>;
}

async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const supabaseObatRepository: ObatRepository = {
  async list() {
    const { data, error } = await supabase
      .from('obat')
      .select(OBAT_SELECT_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapObatRows(data as Record<string, unknown>[] | null);
  },

  async create(input) {
    const userId = await requireUserId();
    const insertRow = { ...mapObatInput(input), user_id: userId } as TablesInsert<'obat'>;
    const { data, error } = await supabase
      .from('obat')
      .insert(insertRow)
      .select()
      .single();

    if (error) throw error;
    return mapObatRow(data as Record<string, unknown>);
  },

  async update(id, input) {
    const { data, error } = await supabase
      .from('obat')
      .update(mapObatInput(input))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapObatRow(data as Record<string, unknown>);
  },

  async delete(id) {
    const { error } = await supabase.from('obat').delete().eq('id', id);
    if (error) throw error;
  },
};
