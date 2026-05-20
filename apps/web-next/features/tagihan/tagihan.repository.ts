import {
  normalizeTagihanPreviewItem,
  type TagihanPreviewItem,
} from '@livoria/core';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type TagihanPreviewState =
  | {
      items: TagihanPreviewItem[];
      message: string;
      status: 'unconfigured';
    }
  | {
      items: TagihanPreviewItem[];
      message: string;
      status: 'unauthenticated';
    }
  | {
      items: TagihanPreviewItem[];
      message: string;
      status: 'ready';
      total: number;
    }
  | {
      items: TagihanPreviewItem[];
      message: string;
      status: 'error';
    };

const tagihanSelect = [
  'id',
  'user_id',
  'debitur_nama',
  'barang_nama',
  'status',
  'total_hutang',
  'total_dibayar',
  'sisa_hutang',
  'cicilan_per_bulan',
  'tanggal_jatuh_tempo',
  'created_at',
].join(',');

export async function getTagihanPreview(): Promise<TagihanPreviewState> {
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
        message: 'Masuk terlebih dahulu untuk melihat data Tagihan.',
        status: 'unauthenticated',
      };
    }

    const { data, error } = await supabase
      .from('tagihan')
      .select(tagihanSelect)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    const items = rows.map((item) => normalizeTagihanPreviewItem(item));

    return {
      items,
      message: `${items.length} data tagihan siap ditampilkan di Next preview.`,
      status: 'ready',
      total: items.length,
    };
  } catch (error) {
    return {
      items: [],
      message: error instanceof Error ? error.message : 'Preview Tagihan gagal dimuat.',
      status: 'error',
    };
  }
}
