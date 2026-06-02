import { supabase } from '@/integrations/supabase/client';
import { donghuaRepository } from '@/features/donghua/services/donghua.repository';
import type { DonghuaItem } from '@/lib/types';
import { DONGHUA_SELECT_COLUMNS } from '@/services/query-columns';
import { deleteRow, insertRow, updateRow } from './crud.service';

export const donghuaService = {
  getAll: () => donghuaRepository.list(),
  create: (row: Partial<DonghuaItem>) => insertRow<DonghuaItem>('donghua', row),
  update: (id: string, row: Partial<DonghuaItem>) => updateRow<DonghuaItem>('donghua', id, row),
  delete: (id: string) => deleteRow('donghua', id),
  findDuplicates: async (title: string, malId?: number | null, anilistId?: number | null): Promise<DonghuaItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const query = supabase.from('donghua').select(DONGHUA_SELECT_COLUMNS).eq('user_id', user.id);
    const idConditions: string[] = [];
    if (malId) idConditions.push(`mal_id.eq.${malId}`);
    if (anilistId) idConditions.push(`anilist_id.eq.${anilistId}`);

    if (idConditions.length > 0) {
      const { data, error } = await query.or(idConditions.join(','));
      if (error) throw error;
      if (data && data.length > 0) return data as DonghuaItem[];
    }

    const { data: titleData, error: titleError } = await supabase
      .from('donghua')
      .select(DONGHUA_SELECT_COLUMNS)
      .eq('user_id', user.id)
      .ilike('title', title.trim());

    if (titleError) throw titleError;
    return (titleData ?? []) as DonghuaItem[];
  },
};
