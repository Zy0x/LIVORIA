'use server';

import { normalizeObatInput } from '@livoria/core';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type ObatActionState = {
  ok: boolean;
  message: string;
};

const initialState: ObatActionState = {
  message: '',
  ok: false,
};

export { initialState as initialObatActionState };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

async function readJsonFile(formData: FormData, key: string) {
  const value = formData.get(key);
  if (!(value instanceof File) || value.size === 0) {
    throw new Error('File JSON import belum dipilih.');
  }

  if (value.size > 1024 * 1024) {
    throw new Error('File import maksimal 1 MB.');
  }

  const text = await value.text();
  const parsed = JSON.parse(text) as unknown;
  const rows = Array.isArray(parsed)
    ? parsed
    : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as { data?: unknown }).data)
      ? (parsed as { data: unknown[] }).data
      : null;

  if (!rows) {
    throw new Error('Format JSON Obat tidak valid.');
  }

  if (rows.length > 500) {
    throw new Error('Import Obat dibatasi maksimal 500 baris per file.');
  }

  return rows;
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Masuk terlebih dahulu untuk mengubah data Obat.');

  return { supabase, user };
}

export async function submitObatAction(
  _previousState: ObatActionState,
  formData: FormData,
): Promise<ObatActionState> {
  try {
    const intent = readString(formData, 'intent');
    const id = readString(formData, 'id');
    const { supabase, user } = await requireUser();

    if (intent === 'delete') {
      if (!id) throw new Error('ID obat tidak valid.');
      const { error } = await supabase.from('obat').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      revalidatePath('/obat');
      return { message: 'Data obat dihapus.', ok: true };
    }

    if (intent === 'import_json') {
      const rows = await readJsonFile(formData, 'json_file');
      const payload = rows.map((row) => {
        const input = normalizeObatInput(row);
        if (!input.name) throw new Error('Setiap baris import wajib memiliki nama obat.');
        return {
          ...input,
          user_id: user.id,
        };
      });

      const { error } = await supabase.from('obat').insert(payload);
      if (error) throw error;
      revalidatePath('/obat');
      return { message: `${payload.length} data obat berhasil diimpor.`, ok: true };
    }

    const input = normalizeObatInput({
      dosage: readString(formData, 'dosage'),
      frequency: readString(formData, 'frequency'),
      name: readString(formData, 'name'),
      notes: readString(formData, 'notes'),
      side_effects: readString(formData, 'side_effects'),
      type: readString(formData, 'type'),
      usage_info: readString(formData, 'usage_info'),
    });

    if (!input.name) {
      throw new Error('Nama obat wajib diisi.');
    }

    if (intent === 'update') {
      if (!id) throw new Error('ID obat tidak valid.');
      const { error } = await supabase
        .from('obat')
        .update(input)
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      revalidatePath('/obat');
      return { message: 'Data obat diperbarui.', ok: true };
    }

    if (intent === 'create') {
      const { error } = await supabase.from('obat').insert({
        ...input,
        user_id: user.id,
      });
      if (error) throw error;
      revalidatePath('/obat');
      return { message: 'Data obat ditambahkan.', ok: true };
    }

    throw new Error('Aksi Obat tidak dikenal.');
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Aksi Obat gagal.',
      ok: false,
    };
  }
}
