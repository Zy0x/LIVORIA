import {
  normalizeMediaItem,
  type MediaItem,
} from '@livoria/core';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type MediaTable = 'anime' | 'donghua';

export type MediaPreviewState =
  | {
      items: MediaItem[];
      message: string;
      status: 'unconfigured';
      table: MediaTable;
    }
  | {
      items: MediaItem[];
      message: string;
      status: 'unauthenticated';
      table: MediaTable;
    }
  | {
      items: MediaItem[];
      message: string;
      status: 'ready';
      table: MediaTable;
      total: number;
    }
  | {
      items: MediaItem[];
      message: string;
      status: 'error';
      table: MediaTable;
    };

const mediaSelect = [
  'id',
  'user_id',
  'title',
  'status',
  'genre',
  'rating',
  'episodes',
  'episodes_watched',
  'cover_url',
  'studio',
  'release_year',
  'is_favorite',
  'is_bookmarked',
  'watch_status',
  'created_at',
].join(',');

export async function getMediaPreview(table: MediaTable): Promise<MediaPreviewState> {
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      items: [],
      message: 'Konfigurasi data publik belum tersedia.',
      status: 'unconfigured',
      table,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      return {
        items: [],
        message: `Masuk terlebih dahulu untuk melihat data ${getMediaLabel(table)}.`,
        status: 'unauthenticated',
        table,
      };
    }

    const { data, error } = await supabase
      .from(table)
      .select(mediaSelect)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const items = rows.map((item) => normalizeMediaItem(item));

    return {
      items,
      message: `${items.length} data ${getMediaLabel(table)} siap ditampilkan.`,
      status: 'ready',
      table,
      total: items.length,
    };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : `${getMediaLabel(table)} gagal dimuat.`,
      status: 'error',
      table,
    };
  }
}

export function getMediaLabel(table: MediaTable) {
  return table === 'donghua' ? 'Donghua' : 'Anime';
}
