import { supabase } from '@/integrations/supabase/client';
import { animeRepository } from '@/features/anime/services/anime.repository';
import type { AnimeItem } from '@/lib/types';
import { ANIME_SELECT_COLUMNS } from '@/services/query-columns';
import { deleteRow, insertRow, updateRow } from './crud.service';

export const animeService = {
  getAll: () => animeRepository.list(),
  create: (row: Partial<AnimeItem>) => insertRow<AnimeItem>('anime', row),
  update: (id: string, row: Partial<AnimeItem>) => updateRow<AnimeItem>('anime', id, row),
  delete: (id: string) => deleteRow('anime', id),
  findDuplicates: async (title: string, malId?: number | null, anilistId?: number | null): Promise<AnimeItem[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const query = supabase.from('anime').select(ANIME_SELECT_COLUMNS).eq('user_id', user.id);
    const idConditions: string[] = [];
    if (malId) idConditions.push(`mal_id.eq.${malId}`);
    if (anilistId) idConditions.push(`anilist_id.eq.${anilistId}`);

    if (idConditions.length > 0) {
      const { data, error } = await query.or(idConditions.join(','));
      if (error) throw error;
      if (data && data.length > 0) return data as AnimeItem[];
    }

    const { data: titleData, error: titleError } = await supabase
      .from('anime')
      .select(ANIME_SELECT_COLUMNS)
      .eq('user_id', user.id)
      .ilike('title', title.trim());

    if (titleError) throw titleError;
    return (titleData ?? []) as AnimeItem[];
  },
};
