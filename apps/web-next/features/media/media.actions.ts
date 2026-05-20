'use server';

import {
  normalizeMediaInput,
  normalizeWatchStatus,
  type MediaInput,
  type WatchStatus,
} from '@livoria/core';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '../../lib/supabase/server';
import type { MediaTable } from './media.repository';

export type MediaActionState = {
  ok: boolean;
  message: string;
};

const initialState: MediaActionState = {
  message: '',
  ok: false,
};

export { initialState as initialMediaActionState };

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value : '';
}

function normalizeTable(value: string): MediaTable {
  if (value === 'anime' || value === 'donghua') return value;
  throw new Error('Tabel media tidak valid.');
}

function readMediaInput(formData: FormData): MediaInput {
  return normalizeMediaInput({
    cover_url: readString(formData, 'cover_url'),
    episodes: readString(formData, 'episodes'),
    episodes_watched: readString(formData, 'episodes_watched'),
    genre: readString(formData, 'genre'),
    rating: readString(formData, 'rating'),
    release_year: readString(formData, 'release_year'),
    status: readString(formData, 'status'),
    studio: readString(formData, 'studio'),
    title: readString(formData, 'title'),
    watch_status: readString(formData, 'watch_status'),
  });
}

async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  if (!user) throw new Error('Masuk terlebih dahulu untuk mengubah data media.');

  return { supabase, user };
}

function routeForTable(table: MediaTable) {
  return `/${table}`;
}

async function ensureOwnedItem(input: {
  id: string;
  table: MediaTable;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
}) {
  const { data, error } = await input.supabase
    .from(input.table)
    .select('id,is_favorite,is_bookmarked,episodes,episodes_watched')
    .eq('id', input.id)
    .eq('user_id', input.userId)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Data media tidak ditemukan.');

  return data as Record<string, unknown>;
}

export async function submitMediaAction(
  _previousState: MediaActionState,
  formData: FormData,
): Promise<MediaActionState> {
  try {
    const intent = readString(formData, 'intent');
    const table = normalizeTable(readString(formData, 'table'));
    const id = readString(formData, 'id');
    const { supabase, user } = await requireUser();

    if (intent === 'create') {
      const input = readMediaInput(formData);
      if (!input.title) throw new Error('Judul wajib diisi.');

      const { error } = await supabase.from(table).insert({ ...input, user_id: user.id });
      if (error) throw error;
      revalidatePath(routeForTable(table));
      return { message: 'Data media ditambahkan.', ok: true };
    }

    if (!id) throw new Error('ID media tidak valid.');

    if (intent === 'delete') {
      const { error } = await supabase.from(table).delete().eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      revalidatePath(routeForTable(table));
      return { message: 'Data media dihapus.', ok: true };
    }

    if (intent === 'update') {
      const input = readMediaInput(formData);
      if (!input.title) throw new Error('Judul wajib diisi.');

      const { error } = await supabase.from(table).update(input).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      revalidatePath(routeForTable(table));
      return { message: 'Data media diperbarui.', ok: true };
    }

    const item = await ensureOwnedItem({ id, supabase, table, userId: user.id });

    if (intent === 'toggle_favorite' || intent === 'toggle_bookmark') {
      const field = intent === 'toggle_favorite' ? 'is_favorite' : 'is_bookmarked';
      const { error } = await supabase
        .from(table)
        .update({ [field]: !Boolean(item[field]) })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      revalidatePath(routeForTable(table));
      return {
        message: intent === 'toggle_favorite' ? 'Favorit diperbarui.' : 'Bookmark diperbarui.',
        ok: true,
      };
    }

    if (intent === 'watch_status') {
      const watchStatus = normalizeWatchStatus(readString(formData, 'watch_status')) ?? 'none';
      const payload: { watch_status: WatchStatus; watched_at: string | null } = {
        watch_status: watchStatus,
        watched_at: watchStatus === 'watched' ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from(table).update(payload).eq('id', id).eq('user_id', user.id);
      if (error) throw error;
      revalidatePath(routeForTable(table));
      return { message: 'Status tontonan diperbarui.', ok: true };
    }

    if (intent === 'progress') {
      const direction = readString(formData, 'direction');
      const current = Number(item.episodes_watched ?? 0);
      const total = Number(item.episodes ?? 0);
      const next = direction === 'decrement' ? current - 1 : current + 1;
      const episodesWatched = Math.max(0, total > 0 ? Math.min(next, total) : next);
      const { error } = await supabase
        .from(table)
        .update({ episodes_watched: episodesWatched })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      revalidatePath(routeForTable(table));
      return { message: `Progress diperbarui ke episode ${episodesWatched}.`, ok: true };
    }

    throw new Error('Aksi media tidak dikenal.');
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Aksi media gagal.',
      ok: false,
    };
  }
}
