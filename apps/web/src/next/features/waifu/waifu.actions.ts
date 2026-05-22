'use server';

import {
  buildUserStoragePath,
  normalizeWaifuInput,
  type WaifuInput,
} from '@livoria/core';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type WaifuActionState = {
  ok: boolean;
  message: string;
};

const initialState: WaifuActionState = {
  message: '',
  ok: false,
};

const WAIFU_IMAGE_BUCKET = 'waifu';
const WAIFU_IMAGE_FOLDER = 'waifu';
const MAX_WAIFU_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_WAIFU_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export { initialState as initialWaifuActionState };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function readWaifuInput(formData: FormData): WaifuInput {
  return normalizeWaifuInput({
    image_url: readString(formData, 'image_url'),
    name: readString(formData, 'name'),
    notes: readString(formData, 'notes'),
    source: readString(formData, 'source'),
    source_type: readString(formData, 'source_type'),
    tier: readString(formData, 'tier'),
  });
}

async function readJsonFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error('File JSON import belum dipilih.');
  }

  if (value.size > 1024 * 1024) {
    throw new Error('File import maksimal 1 MB.');
  }

  const parsed = JSON.parse(await value.text()) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { data?: unknown }).data)
      ? (parsed as { data: unknown[] }).data
      : null;

  if (!rows) throw new Error('Format JSON Waifu tidak valid.');
  if (rows.length > 500) throw new Error('Import Waifu dibatasi maksimal 500 baris per file.');

  return rows;
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Masuk terlebih dahulu untuk mengubah data Waifu.');

  return { supabase, user };
}

async function uploadWaifuImage(input: {
  file: File;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  if (!ALLOWED_WAIFU_IMAGE_TYPES.has(input.file.type)) {
    throw new Error('Format gambar waifu harus JPG, PNG, WEBP, atau GIF.');
  }

  if (input.file.size > MAX_WAIFU_IMAGE_BYTES) {
    throw new Error('Ukuran gambar waifu maksimal 5MB.');
  }

  const path = buildUserStoragePath({
    fileName: input.file.name,
    folder: WAIFU_IMAGE_FOLDER,
    suffix: crypto.randomUUID(),
    timestamp: Date.now(),
    userId: input.userId,
  });
  const { error } = await input.supabase.storage
    .from(WAIFU_IMAGE_BUCKET)
    .upload(path, input.file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) throw error;

  return input.supabase.storage.from(WAIFU_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function submitWaifuAction(
  _previousState: WaifuActionState,
  formData: FormData,
): Promise<WaifuActionState> {
  try {
    const intent = readString(formData, 'intent');
    const id = readString(formData, 'id');
    const { supabase, user } = await requireUser();

    if (intent === 'delete') {
      if (!id) throw new Error('ID waifu tidak valid.');
      const { error } = await supabase.from('waifu').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      revalidatePath('/waifu');
      return { message: 'Data waifu dihapus.', ok: true };
    }

    if (intent === 'import_json') {
      const rows = await readJsonFile(formData, 'json_file');
      const payload = rows.map((row) => {
        const input = normalizeWaifuInput(row);
        if (!input.name) throw new Error('Setiap baris import wajib memiliki nama waifu.');
        return {
          ...input,
          user_id: user.id,
        };
      });

      const { error } = await supabase.from('waifu').insert(payload);
      if (error) throw error;
      revalidatePath('/waifu');
      return { message: `${payload.length} data waifu berhasil diimpor.`, ok: true };
    }

    const input = readWaifuInput(formData);
    if (!input.name) {
      throw new Error('Nama waifu wajib diisi.');
    }

    const imageFile = formData.get('image_file');
    if (imageFile instanceof File && imageFile.size > 0) {
      input.image_url = await uploadWaifuImage({ file: imageFile, supabase, userId: user.id });
    }

    if (intent === 'update') {
      if (!id) throw new Error('ID waifu tidak valid.');
      const { error } = await supabase
        .from('waifu')
        .update(input)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      revalidatePath('/waifu');
      return { message: 'Data waifu diperbarui.', ok: true };
    }

    if (intent === 'create') {
      const { error } = await supabase.from('waifu').insert({
        ...input,
        user_id: user.id,
      });
      if (error) throw error;
      revalidatePath('/waifu');
      return { message: 'Data waifu ditambahkan.', ok: true };
    }

    throw new Error('Aksi Waifu tidak dikenal.');
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Aksi Waifu gagal.',
      ok: false,
    };
  }
}
