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
