import { QUERY_KEYS } from '@/app/query-keys';
import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { CATATAN_SELECT_COLUMNS } from '@/services/query-columns';
import type { CatatanInput, CatatanItem } from '../types/catatan.types';
import { mapCatatanInput, mapCatatanRow, mapCatatanRows } from './catatan.mapper';

export const CATATAN_QUERY_KEY = QUERY_KEYS.CATATAN;

export interface CatatanRepository {
  list(): Promise<CatatanItem[]>;
  create(input: CatatanInput): Promise<CatatanItem>;
  update(id: string, input: CatatanInput): Promise<CatatanItem>;
  delete(id: string): Promise<void>;
}

async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const supabaseCatatanRepository: CatatanRepository = {
  async list() {
    const { data, error } = await supabase
      .from('catatan')
      .select(CATATAN_SELECT_COLUMNS)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return mapCatatanRows(data as Record<string, unknown>[] | null);
  },

  async create(input) {
    const userId = await requireUserId();
    const insertRow = { ...mapCatatanInput(input), user_id: userId } as TablesInsert<'catatan'>;
    const { data, error } = await supabase
      .from('catatan')
      .insert(insertRow)
      .select(CATATAN_SELECT_COLUMNS)
      .single();

    if (error) throw error;
    return mapCatatanRow(data as Record<string, unknown>);
  },

  async update(id, input) {
    const { data, error } = await supabase
      .from('catatan')
      .update(mapCatatanInput(input))
      .eq('id', id)
      .select(CATATAN_SELECT_COLUMNS)
      .single();

    if (error) throw error;
    return mapCatatanRow(data as Record<string, unknown>);
  },

  async delete(id) {
    const { error } = await supabase.from('catatan').delete().eq('id', id);
    if (error) throw error;
  },
};
