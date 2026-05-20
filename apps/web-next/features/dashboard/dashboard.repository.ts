import {
  createEmptyDashboardSummary,
  type DashboardSummary,
} from '@livoria/core';
import { getSupabasePublicEnv } from '../../lib/supabase/env';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export type DashboardSummaryState =
  | {
      message: string;
      status: 'unconfigured' | 'unauthenticated' | 'error';
      summary: DashboardSummary;
    }
  | {
      message: string;
      status: 'ready';
      summary: DashboardSummary;
    };

type DashboardSummaryRpcRow = {
  anime_count?: number | string | null;
  anime_ongoing_count?: number | string | null;
  donghua_count?: number | string | null;
  donghua_ongoing_count?: number | string | null;
  obat_count?: number | string | null;
  tagihan_aktif_count?: number | string | null;
  tagihan_count?: number | string | null;
  tagihan_ditunda_count?: number | string | null;
  tagihan_lunas_count?: number | string | null;
  tagihan_monthly_income?: number | string | null;
  tagihan_overdue_status_count?: number | string | null;
  tagihan_total_dibayar?: number | string | null;
  tagihan_total_keuntungan?: number | string | null;
  tagihan_total_modal_bergulir?: number | string | null;
  tagihan_total_modal_terpisah?: number | string | null;
  waifu_count?: number | string | null;
  waifu_tier_s_count?: number | string | null;
};

function toNumber(value: unknown) {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function mapRpcRow(row: DashboardSummaryRpcRow): DashboardSummary {
  return {
    animeCount: toNumber(row.anime_count),
    animeOngoingCount: toNumber(row.anime_ongoing_count),
    donghuaCount: toNumber(row.donghua_count),
    donghuaOngoingCount: toNumber(row.donghua_ongoing_count),
    obatCount: toNumber(row.obat_count),
    source: 'rpc',
    tagihanAktifCount: toNumber(row.tagihan_aktif_count),
    tagihanCount: toNumber(row.tagihan_count),
    tagihanDitundaCount: toNumber(row.tagihan_ditunda_count),
    tagihanLunasCount: toNumber(row.tagihan_lunas_count),
    tagihanMonthlyIncome: toNumber(row.tagihan_monthly_income),
    tagihanOverdueStatusCount: toNumber(row.tagihan_overdue_status_count),
    tagihanTotalDibayar: toNumber(row.tagihan_total_dibayar),
    tagihanTotalKeuntungan: toNumber(row.tagihan_total_keuntungan),
    tagihanTotalModalBergulir: toNumber(row.tagihan_total_modal_bergulir),
    tagihanTotalModalTerpisah: toNumber(row.tagihan_total_modal_terpisah),
    waifuCount: toNumber(row.waifu_count),
    waifuTierSCount: toNumber(row.waifu_tier_s_count),
  };
}

async function getRpcSummary(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data, error } = await supabase.rpc('get_dashboard_summary');
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Dashboard summary RPC tidak mengembalikan data.');
  return mapRpcRow(row as DashboardSummaryRpcRow);
}

async function getFallbackSummary(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const [tagihanResult, animeResult, donghuaResult, waifuResult, obatResult] = await Promise.all([
    supabase
      .from('tagihan')
      .select('status,sumber_modal,harga_awal,total_dibayar,keuntungan_estimasi,cicilan_per_bulan'),
    supabase.from('anime').select('status'),
    supabase.from('donghua').select('status'),
    supabase.from('waifu').select('tier'),
    supabase.from('obat').select('id', { count: 'exact', head: true }),
  ]);

  if (tagihanResult.error) throw tagihanResult.error;
  if (animeResult.error) throw animeResult.error;
  if (donghuaResult.error) throw donghuaResult.error;
  if (waifuResult.error) throw waifuResult.error;
  if (obatResult.error) throw obatResult.error;

  const tagihan = tagihanResult.data ?? [];
  const anime = animeResult.data ?? [];
  const donghua = donghuaResult.data ?? [];
  const waifu = waifuResult.data ?? [];

  return {
    animeCount: anime.length,
    animeOngoingCount: anime.filter((item) => item.status === 'on-going').length,
    donghuaCount: donghua.length,
    donghuaOngoingCount: donghua.filter((item) => item.status === 'on-going').length,
    obatCount: obatResult.count ?? 0,
    source: 'fallback',
    tagihanAktifCount: tagihan.filter((item) => item.status === 'aktif').length,
    tagihanCount: tagihan.length,
    tagihanDitundaCount: tagihan.filter((item) => item.status === 'ditunda').length,
    tagihanLunasCount: tagihan.filter((item) => item.status === 'lunas').length,
    tagihanMonthlyIncome: tagihan
      .filter((item) => item.status !== 'lunas')
      .reduce((sum, item) => sum + toNumber(item.cicilan_per_bulan), 0),
    tagihanOverdueStatusCount: tagihan.filter((item) => item.status === 'overdue').length,
    tagihanTotalDibayar: tagihan.reduce((sum, item) => sum + toNumber(item.total_dibayar), 0),
    tagihanTotalKeuntungan: tagihan.reduce((sum, item) => sum + toNumber(item.keuntungan_estimasi), 0),
    tagihanTotalModalBergulir: tagihan
      .filter((item) => item.sumber_modal === 'modal_bergulir')
      .reduce((sum, item) => sum + toNumber(item.harga_awal), 0),
    tagihanTotalModalTerpisah: tagihan
      .filter((item) => item.sumber_modal !== 'modal_bergulir')
      .reduce((sum, item) => sum + toNumber(item.harga_awal), 0),
    waifuCount: waifu.length,
    waifuTierSCount: waifu.filter((item) => item.tier === 'S').length,
  } satisfies DashboardSummary;
}

export async function getDashboardSummaryState(): Promise<DashboardSummaryState> {
  const env = getSupabasePublicEnv();
  if (!env.isConfigured) {
    return {
      message: 'Konfigurasi Supabase belum tersedia untuk Next preview.',
      status: 'unconfigured',
      summary: createEmptyDashboardSummary(),
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) throw error;
    if (!user) {
      return {
        message: 'Masuk terlebih dahulu untuk melihat ringkasan Dashboard.',
        status: 'unauthenticated',
        summary: createEmptyDashboardSummary(),
      };
    }

    try {
      const summary = await getRpcSummary(supabase);
      return { message: 'Ringkasan dimuat dari RPC Supabase.', status: 'ready', summary };
    } catch {
      const summary = await getFallbackSummary(supabase);
      return { message: 'RPC belum tersedia; ringkasan memakai fallback query.', status: 'ready', summary };
    }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Ringkasan Dashboard gagal dimuat.',
      status: 'error',
      summary: createEmptyDashboardSummary(),
    };
  }
}
