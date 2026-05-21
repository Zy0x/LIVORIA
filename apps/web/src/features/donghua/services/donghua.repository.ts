import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { uploadImage } from '@/lib/supabase-service';
import type { DonghuaItem } from '@/lib/types';
import { DONGHUA_SELECT_COLUMNS } from '@/services/query-columns';
import { mapDonghuaFromDb, mapDonghuaListFromDb, mapDonghuaToDb } from './donghua.mapper';

export interface DonghuaRepository {
  list(): Promise<DonghuaItem[]>;
  detail(id: string): Promise<DonghuaItem>;
  create(row: Partial<DonghuaItem>): Promise<DonghuaItem>;
  update(id: string, row: Partial<DonghuaItem>): Promise<DonghuaItem>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  findDuplicates(title: string, malId?: number | null, anilistId?: number | null): Promise<DonghuaItem[]>;
  uploadCover(file: File): Promise<string>;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const donghuaRepository: DonghuaRepository = {
  async list() {
    const { data, error } = await supabase
      .from('donghua')
      .select(DONGHUA_SELECT_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapDonghuaListFromDb(data);
  },

  async detail(id) {
    const { data, error } = await supabase
      .from('donghua')
      .select(DONGHUA_SELECT_COLUMNS)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapDonghuaFromDb(data);
  },

  async create(row) {
    const userId = await getCurrentUserId();
    const insertRow = { ...mapDonghuaToDb(row), user_id: userId } as TablesInsert<'donghua'>;
    const { data, error } = await supabase
      .from('donghua')
      .insert(insertRow)
      .select()
      .single();

    if (error) throw error;
    return mapDonghuaFromDb(data);
  },

  async update(id, row) {
    const { data, error } = await supabase
      .from('donghua')
      .update(mapDonghuaToDb(row))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapDonghuaFromDb(data);
  },

  async delete(id) {
    const { error } = await supabase.from('donghua').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteMany(ids) {
    for (const id of ids) {
      await donghuaRepository.delete(id);
    }
  },

  async findDuplicates(title, malId, anilistId) {
    const userId = await getCurrentUserId();

    const idConditions: string[] = [];
    if (malId) idConditions.push(`mal_id.eq.${malId}`);
    if (anilistId) idConditions.push(`anilist_id.eq.${anilistId}`);

    if (idConditions.length > 0) {
      const { data, error } = await supabase
        .from('donghua')
        .select(DONGHUA_SELECT_COLUMNS)
        .eq('user_id', userId)
        .or(idConditions.join(','));

      if (error) throw error;
      if (data && data.length > 0) return mapDonghuaListFromDb(data);
    }

    const { data, error } = await supabase
      .from('donghua')
      .select(DONGHUA_SELECT_COLUMNS)
      .eq('user_id', userId)
      .ilike('title', title.trim());

    if (error) throw error;
    return mapDonghuaListFromDb(data);
  },

  uploadCover(file) {
    return uploadImage('covers', file, 'donghua');
  },
};
