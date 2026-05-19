import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/supabase-service';
import type { WaifuInput, WaifuItem, WaifuSourceTitle } from '../types/waifu.types';
import {
  mapSourceTitles,
  mapWaifuInput,
  mapWaifuRow,
  mapWaifuRows,
} from './waifu.mapper';

export interface WaifuRepository {
  list(): Promise<WaifuItem[]>;
  listSourceTitles(): Promise<WaifuSourceTitle[]>;
  create(input: WaifuInput): Promise<WaifuItem>;
  update(id: string, input: WaifuInput): Promise<WaifuItem>;
  delete(id: string): Promise<void>;
  uploadImage(file: File): Promise<string>;
}

async function requireUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export const supabaseWaifuRepository: WaifuRepository = {
  async list() {
    const { data, error } = await supabase
      .from('waifu')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return mapWaifuRows(data as Record<string, unknown>[] | null);
  },

  async listSourceTitles() {
    const [animeResult, donghuaResult] = await Promise.all([
      supabase.from('anime').select('title').order('title', { ascending: true }),
      supabase.from('donghua').select('title').order('title', { ascending: true }),
    ]);

    if (animeResult.error) throw animeResult.error;
    if (donghuaResult.error) throw donghuaResult.error;

    return [
      ...mapSourceTitles(animeResult.data as Record<string, unknown>[] | null, 'anime'),
      ...mapSourceTitles(donghuaResult.data as Record<string, unknown>[] | null, 'donghua'),
    ].sort((a, b) => a.title.localeCompare(b.title));
  },

  async create(input) {
    const userId = await requireUserId();
    const { data, error } = await supabase
      .from('waifu')
      .insert({ ...mapWaifuInput(input), user_id: userId })
      .select()
      .single();

    if (error) throw error;
    return mapWaifuRow(data as Record<string, unknown>);
  },

  async update(id, input) {
    const { data, error } = await supabase
      .from('waifu')
      .update(mapWaifuInput(input))
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapWaifuRow(data as Record<string, unknown>);
  },

  async delete(id) {
    const { error } = await supabase.from('waifu').delete().eq('id', id);
    if (error) throw error;
  },

  uploadImage(file) {
    return uploadImage('waifu', file, 'waifu');
  },
};
