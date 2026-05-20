import { supabase } from '@/lib/supabase';
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
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapObatRows(data as Record<string, unknown>[] | null);
  },

  async create(input) {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('obat')
      .insert({ ...mapObatInput(input), user_id: userId })
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
