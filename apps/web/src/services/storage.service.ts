import { supabase } from '@/integrations/supabase/client';
import { buildUserStoragePath as buildPureUserStoragePath } from '@/shared/domain/storage';

const PUBLIC_IMAGE_BUCKETS = new Set(['covers', 'waifu']);

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

export async function uploadImage(bucket: string, file: File, folder: string): Promise<string> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!session?.user?.id) throw new Error('Not authenticated');
  if (!PUBLIC_IMAGE_BUCKETS.has(bucket)) throw new Error('Bucket gambar tidak valid.');

  const fileName = buildUserStoragePath(session.user.id, folder, file.name);
  const { error } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
  return data.publicUrl;
}

export async function deleteImage(bucket: string, path: string): Promise<void> {
  const storagePath = getStoragePathFromUrlOrPath(path, bucket);
  if (storagePath) await supabase.storage.from(bucket).remove([storagePath]);
}
