import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/supabase-service';
import type { AnimeItem } from '@/lib/types';
import { mapAnimeFromDb, mapAnimeListFromDb, mapAnimeToDb } from './anime.mapper';

export interface AnimeRepository {
  list(): Promise<AnimeItem[]>;
  detail(id: string): Promise<AnimeItem>;
  create(row: Partial<AnimeItem>): Promise<AnimeItem>;
  update(id: string, row: Partial<AnimeItem>): Promise<AnimeItem>;
  delete(id: string): Promise<void>;
  deleteMany(ids: string[]): Promise<void>;
  findDuplicates(title: string, malId?: number | null, anilistId?: number | null): Promise<AnimeItem[]>;
  uploadCover(file: File): Promise<string>;
}

async function getCurrentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const animeRepository: AnimeRepository = {
  async list() {
    const { data, error } = await supabase
      .from('anime')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapAnimeListFromDb(data);
  },

  async detail(id) {
    const { data, error } = await supabase
      .from('anime')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapAnimeFromDb(data);
  },

  async create(row) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from('anime')
      .insert({ ...mapAnimeToDb(row), user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return mapAnimeFromDb(data);
  },

  async update(id, row) {
    const { data, error } = await supabase
      .from('anime')
      .update(mapAnimeToDb(row))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapAnimeFromDb(data);
  },

  async delete(id) {
    const { error } = await supabase.from('anime').delete().eq('id', id);
    if (error) throw error;
  },

  async deleteMany(ids) {
    for (const id of ids) {
      await animeRepository.delete(id);
    }
  },

  async findDuplicates(title, malId, anilistId) {
    const userId = await getCurrentUserId();

    const idConditions: string[] = [];
    if (malId) idConditions.push(`mal_id.eq.${malId}`);
    if (anilistId) idConditions.push(`anilist_id.eq.${anilistId}`);

    if (idConditions.length > 0) {
      const { data, error } = await supabase
        .from('anime')
        .select('*')
        .eq('user_id', userId)
        .or(idConditions.join(','));

      if (error) throw error;
      if (data && data.length > 0) return mapAnimeListFromDb(data);
    }

    const { data, error } = await supabase
      .from('anime')
      .select('*')
      .eq('user_id', userId)
      .ilike('title', title.trim());

    if (error) throw error;
    return mapAnimeListFromDb(data);
  },

  uploadCover(file) {
    return uploadImage('covers', file, 'anime');
  },
};

