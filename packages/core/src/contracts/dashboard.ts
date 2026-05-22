export type DashboardSummary = {
  tagihanCount: number;
  tagihanAktifCount: number;
  tagihanLunasCount: number;
  tagihanOverdueStatusCount: number;
  tagihanDitundaCount: number;
  tagihanTotalModalTerpisah: number;
  tagihanTotalModalBergulir: number;
  tagihanTotalDibayar: number;
  tagihanTotalKeuntungan: number;
  tagihanMonthlyIncome: number;
  animeCount: number;
  animeOngoingCount: number;
  donghuaCount: number;
  donghuaOngoingCount: number;
  waifuCount: number;
  waifuTierSCount: number;
  obatCount: number;
  source?: 'rpc' | 'fallback' | 'preview';
};

export function createEmptyDashboardSummary(source: DashboardSummary['source'] = 'preview'): DashboardSummary {
  return {
    animeCount: 0,
    animeOngoingCount: 0,
    donghuaCount: 0,
    donghuaOngoingCount: 0,
    obatCount: 0,
    source,
    tagihanAktifCount: 0,
    tagihanCount: 0,
    tagihanDitundaCount: 0,
    tagihanLunasCount: 0,
    tagihanMonthlyIncome: 0,
    tagihanOverdueStatusCount: 0,
    tagihanTotalDibayar: 0,
    tagihanTotalKeuntungan: 0,
    tagihanTotalModalBergulir: 0,
    tagihanTotalModalTerpisah: 0,
    waifuCount: 0,
    waifuTierSCount: 0,
  };
}
