import { normalizeObatItem, type ObatItem } from '@livoria/core';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type ObatPreviewState =
  | {
      items: ObatItem[];
      message: string;
      status: 'unconfigured';
    }
  | {
      items: ObatItem[];
      message: string;
      status: 'unauthenticated';
    }
  | {
      items: ObatItem[];
      message: string;
      status: 'ready';
    }
  | {
      items: ObatItem[];
      message: string;
      status: 'error';
    };

export async function getObatPreview(): Promise<ObatPreviewState> {
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      items: [],
      message: 'Konfigurasi data publik belum tersedia untuk preview Next.',
      status: 'unconfigured',
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
        message: 'Masuk terlebih dahulu untuk melihat data Obat.',
        status: 'unauthenticated',
      };
    }

    const { data, error } = await supabase
      .from('obat')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) throw error;

    const items = (data ?? []).map((item) => normalizeObatItem(item));

    return {
      items,
      message: `${items.length} data obat terbaru siap ditampilkan.`,
      status: 'ready',
    };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : 'Preview Obat gagal dimuat.',
      status: 'error',
    };
  }
}
