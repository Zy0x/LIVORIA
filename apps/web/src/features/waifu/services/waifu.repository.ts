import { supabase } from '@/lib/supabase';
import { uploadImage } from '@/lib/supabase-service';
import type { WaifuInput, WaifuItem, WaifuSourceTitle } from '../types/waifu.types';
import {
  mapSourceTitles,
  mapWaifuInput,
  mapWaifuRow,
  mapWaifuRows,
} from './waifu.mapper';

const WAIFU_IMAGE_BUCKET = 'waifu';
const WAIFU_IMAGE_FOLDER = 'waifu';
const MAX_WAIFU_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_WAIFU_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

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

function validateWaifuImage(file: File) {
  if (!ALLOWED_WAIFU_IMAGE_TYPES.has(file.type)) {
    throw new Error('Format gambar waifu harus JPG, PNG, WEBP, atau GIF.');
  }
  if (file.size > MAX_WAIFU_IMAGE_BYTES) {
    throw new Error('Ukuran gambar waifu maksimal 5MB.');
  }
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
    validateWaifuImage(file);
    return uploadImage(WAIFU_IMAGE_BUCKET, file, WAIFU_IMAGE_FOLDER);
  },
};
