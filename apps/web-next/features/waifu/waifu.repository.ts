import {
  normalizeWaifuItem,
  type SourceType,
  type WaifuItem,
  type WaifuSourceTitle,
} from '@livoria/core';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type WaifuPreviewState =
  | {
      items: WaifuItem[];
      message: string;
      sourceTitles: WaifuSourceTitle[];
      status: 'unconfigured';
    }
  | {
      items: WaifuItem[];
      message: string;
      sourceTitles: WaifuSourceTitle[];
      status: 'unauthenticated';
    }
  | {
      items: WaifuItem[];
      message: string;
      sourceTitles: WaifuSourceTitle[];
      status: 'ready';
      total: number;
    }
  | {
      items: WaifuItem[];
      message: string;
      sourceTitles: WaifuSourceTitle[];
      status: 'error';
    };

function mapSourceTitles(rows: Record<string, unknown>[] | null | undefined, type: SourceType) {
  return (rows ?? [])
    .map((row) => ({ title: typeof row.title === 'string' ? row.title : String(row.title ?? ''), type }))
    .filter((row) => row.title.length > 0);
}

export async function getWaifuPreview(): Promise<WaifuPreviewState> {
  const env = getSupabasePublicEnv();

  if (!env.isConfigured) {
    return {
      items: [],
      message: 'Konfigurasi data publik belum tersedia untuk preview Next.',
      sourceTitles: [],
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
        message: 'Masuk terlebih dahulu untuk melihat data Waifu.',
        sourceTitles: [],
        status: 'unauthenticated',
      };
    }

    const [waifuResult, animeResult, donghuaResult] = await Promise.all([
      supabase
        .from('waifu')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase.from('anime').select('title').eq('user_id', user.id).order('title', { ascending: true }).limit(250),
      supabase.from('donghua').select('title').eq('user_id', user.id).order('title', { ascending: true }).limit(250),
    ]);

    if (waifuResult.error) throw waifuResult.error;
    if (animeResult.error) throw animeResult.error;
    if (donghuaResult.error) throw donghuaResult.error;

    const items = (waifuResult.data ?? []).map((item) => normalizeWaifuItem(item));
    const sourceTitles = [
      ...mapSourceTitles(animeResult.data as Record<string, unknown>[] | null, 'anime'),
      ...mapSourceTitles(donghuaResult.data as Record<string, unknown>[] | null, 'donghua'),
    ].sort((a, b) => a.title.localeCompare(b.title));

    return {
      items,
      message: `${items.length} data waifu siap dikelola di Next preview.`,
      sourceTitles,
      status: 'ready',
      total: items.length,
    };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : 'Preview Waifu gagal dimuat.',
      sourceTitles: [],
      status: 'error',
    };
  }
}
