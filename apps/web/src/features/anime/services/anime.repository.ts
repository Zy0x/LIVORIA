import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { uploadImage } from '@/lib/supabase-service';
import type { AnimeItem } from '@/lib/types';
import { ANIME_META_SELECT_COLUMNS, ANIME_SELECT_COLUMNS } from '@/services/query-columns';
import { mapAnimeFromDb, mapAnimeListFromDb, mapAnimeToDb } from './anime.mapper';

export interface AnimeRepository {
  list(): Promise<AnimeItem[]>;
  listMeta(): Promise<AnimeItem[]>;
  listByIds(ids: string[]): Promise<AnimeItem[]>;
  detail(id: string): Promise<AnimeItem>;
  create(row: Partial<AnimeItem>): Promise<AnimeItem>;
  update(id: string, row: Partial<AnimeItem>): Promise<AnimeItem>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  findDuplicates(title: string, malId?: number | null, anilistId?: number | null): Promise<AnimeItem[]>;
  uploadCover(file: File): Promise<string>;
}

async function getSessionUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export const animeRepository: AnimeRepository = {
  async list() {
    const userId = await getSessionUserId();
    const { data, error } = await supabase
      .from('anime')
      .select(ANIME_SELECT_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapAnimeListFromDb(data);
  },

  async listMeta() {
    const userId = await getSessionUserId();
    const { data, error } = await supabase
      .from('anime')
      .select(ANIME_META_SELECT_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapAnimeListFromDb(data);
  },

  async listByIds(ids) {
    if (ids.length === 0) return [];
    const userId = await getSessionUserId();

    const { data, error } = await supabase
      .from('anime')
      .select(ANIME_SELECT_COLUMNS)
      .eq('user_id', userId)
      .in('id', ids);

    if (error) throw error;

    const byId = new Map(mapAnimeListFromDb(data).map((item) => [item.id, item]));
    return ids.map((id) => byId.get(id)).filter((item): item is AnimeItem => Boolean(item));
  },

  async detail(id) {
    const { data, error } = await supabase
      .from('anime')
      .select(ANIME_SELECT_COLUMNS)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapAnimeFromDb(data);
  },

  async create(row) {
    const userId = await getSessionUserId();
    const insertRow = { ...mapAnimeToDb(row), user_id: userId } as TablesInsert<'anime'>;
    const { data, error } = await supabase
      .from('anime')
      .insert(insertRow)
      .select(ANIME_SELECT_COLUMNS)
      .single();

    if (error) throw error;
    return mapAnimeFromDb(data);
  },

  async update(id, row) {
    const { data, error } = await supabase
      .from('anime')
      .update(mapAnimeToDb(row))
      .eq('id', id)
      .select(ANIME_SELECT_COLUMNS)
      .single();

    if (error) throw error;
    return mapAnimeFromDb(data);
  },

  async delete(id) {
    const { error } = await supabase.from('anime').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteMany(ids) {
    if (ids.length === 0) return;
    const { error } = await supabase.from('anime').delete().in('id', ids);
    if (error) throw error;
  },

  async findDuplicates(title, malId, anilistId) {
    const userId = await getSessionUserId();

    const idConditions: string[] = [];
    if (malId) idConditions.push(`mal_id.eq.${malId}`);
    if (anilistId) idConditions.push(`anilist_id.eq.${anilistId}`);

    if (idConditions.length > 0) {
      const { data, error } = await supabase
        .from('anime')
        .select(ANIME_SELECT_COLUMNS)
        .eq('user_id', userId)
        .or(idConditions.join(','));

      if (error) throw error;
      if (data && data.length > 0) return mapAnimeListFromDb(data);
    }

    const { data, error } = await supabase
      .from('anime')
      .select(ANIME_SELECT_COLUMNS)
      .eq('user_id', userId)
      .ilike('title', title.trim());

    if (error) throw error;
    return mapAnimeListFromDb(data);
  },

  uploadCover(file) {
    return uploadImage('covers', file, 'anime');
  },
};
