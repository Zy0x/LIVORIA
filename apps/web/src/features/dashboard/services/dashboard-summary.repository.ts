import { supabase } from '@/lib/supabase';
import type { DashboardSummary, DashboardSummaryRpcRow } from '../types/dashboard-summary.types';

export interface DashboardSummaryRepository {
  getSummary(): Promise<DashboardSummary>;
}

function toNumber(value: number | string | null | undefined): number {
  const normalized = Number(value ?? 0);
  return Number.isFinite(normalized) ? normalized : 0;
}

function mapRpcRow(row: DashboardSummaryRpcRow): DashboardSummary {
  return {
    tagihanCount: toNumber(row.tagihan_count),
    tagihanAktifCount: toNumber(row.tagihan_aktif_count),
    tagihanLunasCount: toNumber(row.tagihan_lunas_count),
    tagihanOverdueStatusCount: toNumber(row.tagihan_overdue_status_count),
    tagihanDitundaCount: toNumber(row.tagihan_ditunda_count),
    tagihanTotalModalTerpisah: toNumber(row.tagihan_total_modal_terpisah),
    tagihanTotalModalBergulir: toNumber(row.tagihan_total_modal_bergulir),
    tagihanTotalDibayar: toNumber(row.tagihan_total_dibayar),
    tagihanTotalKeuntungan: toNumber(row.tagihan_total_keuntungan),
    tagihanMonthlyIncome: toNumber(row.tagihan_monthly_income),
    animeCount: toNumber(row.anime_count),
    animeOngoingCount: toNumber(row.anime_ongoing_count),
    donghuaCount: toNumber(row.donghua_count),
    donghuaOngoingCount: toNumber(row.donghua_ongoing_count),
    waifuCount: toNumber(row.waifu_count),
    waifuTierSCount: toNumber(row.waifu_tier_s_count),
    obatCount: toNumber(row.obat_count),
    source: 'rpc',
  };
}

async function getRpcSummary(): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('get_dashboard_summary');
  if (error) throw error;

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Dashboard summary RPC returned no data.');

  return mapRpcRow(row as DashboardSummaryRpcRow);
}

async function getFallbackSummary(): Promise<DashboardSummary> {
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
    tagihanCount: tagihan.length,
    tagihanAktifCount: tagihan.filter((item) => item.status === 'aktif').length,
    tagihanLunasCount: tagihan.filter((item) => item.status === 'lunas').length,
    tagihanOverdueStatusCount: tagihan.filter((item) => item.status === 'overdue').length,
    tagihanDitundaCount: tagihan.filter((item) => item.status === 'ditunda').length,
    tagihanTotalModalTerpisah: tagihan
      .filter((item) => item.sumber_modal !== 'modal_bergulir')
      .reduce((sum, item) => sum + toNumber(item.harga_awal), 0),
    tagihanTotalModalBergulir: tagihan
      .filter((item) => item.sumber_modal === 'modal_bergulir')
      .reduce((sum, item) => sum + toNumber(item.harga_awal), 0),
    tagihanTotalDibayar: tagihan.reduce((sum, item) => sum + toNumber(item.total_dibayar), 0),
    tagihanTotalKeuntungan: tagihan.reduce((sum, item) => sum + toNumber(item.keuntungan_estimasi), 0),
    tagihanMonthlyIncome: tagihan
      .filter((item) => item.status !== 'lunas')
      .reduce((sum, item) => sum + toNumber(item.cicilan_per_bulan), 0),
    animeCount: anime.length,
    animeOngoingCount: anime.filter((item) => item.status === 'on-going').length,
    donghuaCount: donghua.length,
    donghuaOngoingCount: donghua.filter((item) => item.status === 'on-going').length,
    waifuCount: waifu.length,
    waifuTierSCount: waifu.filter((item) => item.tier === 'S').length,
    obatCount: obatResult.count ?? 0,
    source: 'fallback',
  };
}

export const dashboardSummaryRepository: DashboardSummaryRepository = {
  async getSummary() {
    try {
      return await getRpcSummary();
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.info('Dashboard summary RPC unavailable; using fallback queries.', error);
      }
      return getFallbackSummary();
    }
  },
};
