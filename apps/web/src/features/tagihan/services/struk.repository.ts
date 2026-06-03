import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert } from '@/integrations/supabase/types';
import { buildUserStoragePath as buildPureUserStoragePath } from '@/shared/domain/storage';
import { STRUK_SELECT_COLUMNS } from '@/services/query-columns';

import type { Struk } from '../types/tagihan.types';
import { mapStruk, mapStrukList } from './tagihan.mapper';

function randomStorageSuffix(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function buildUserStoragePath(userId: string, folder: string, fileName: string, nestedFolder?: string): string {
  return buildPureUserStoragePath({
    userId,
    folder,
    fileName,
    nestedFolder,
    timestamp: Date.now(),
    suffix: randomStorageSuffix(),
  });
}

function getStoragePathFromUrlOrPath(value: string, bucket: string): string | null {
  if (!value) return null;
  if (!/^https?:\/\//i.test(value)) return value;
  try {
    const url = new URL(value);
    const publicPath = `/storage/v1/object/public/${bucket}/`;
    const signedPath = `/storage/v1/object/sign/${bucket}/`;
    if (url.pathname.includes(publicPath)) return decodeURIComponent(url.pathname.split(publicPath)[1] || '');
    if (url.pathname.includes(signedPath)) return decodeURIComponent(url.pathname.split(signedPath)[1] || '');
  } catch {}
  return null;
}

async function requireUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user?.id) throw new Error('Not authenticated');
  return session.user.id;
}

export const strukRepository = {
  async getByTagihan(tagihanId: string): Promise<Struk[]> {
    const { data, error } = await supabase
      .from('struk')
      .select(STRUK_SELECT_COLUMNS)
      .eq('tagihan_id', tagihanId)
      .order('uploaded_at', { ascending: false });
    if (error) throw error;

    const rows = mapStrukList(data);
    return Promise.all(rows.map(async (row) => {
      const storagePath = getStoragePathFromUrlOrPath(row.file_url, 'struk');
      if (!storagePath) return row;
      const { data: signed } = await supabase.storage.from('struk').createSignedUrl(storagePath, 60 * 10);
      return signed?.signedUrl ? { ...row, file_url: signed.signedUrl } : row;
    }));
  },

  async create(row: Partial<Struk>): Promise<Struk> {
    const userId = await requireUserId();
    const insertRow = { ...row, user_id: userId } as TablesInsert<'struk'>;

    const { data, error } = await supabase
      .from('struk')
      .insert(insertRow)
      .select()
      .single();
    if (error) throw error;
    return mapStruk(data);
  },

  async upload(file: File, tagihanId: string, keterangan = ''): Promise<Struk> {
    const userId = await requireUserId();
    const fileName = buildUserStoragePath(userId, 'struk', file.name, tagihanId);
    const { error } = await supabase.storage.from('struk').upload(fileName, file, { upsert: true });
    if (error) throw error;

    const insertRow = {
      tagihan_id: tagihanId,
      file_url: fileName,
      file_name: file.name,
      file_type: file.type,
      keterangan,
      user_id: userId,
    } as TablesInsert<'struk'>;

    const { data, error: createError } = await supabase
      .from('struk')
      .insert(insertRow)
      .select()
      .single();
    if (createError) throw createError;
    return mapStruk(data);
  },

  async delete(id: string): Promise<void> {
    const { data } = await supabase.from('struk').select('file_url').eq('id', id).single();
    const storagePath = data?.file_url ? getStoragePathFromUrlOrPath(data.file_url, 'struk') : null;
    if (storagePath) {
      await supabase.storage.from('struk').remove([storagePath]);
    }
    const { error } = await supabase.from('struk').delete().eq('id', id);
    if (error) throw error;
  },
};
