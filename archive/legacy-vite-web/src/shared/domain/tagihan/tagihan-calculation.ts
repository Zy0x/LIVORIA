export type BungaPeriode = 'tahunan' | 'bulanan' | 'harian';

export interface CalcInput {
  hargaAwal: number;
  bungaPersen: number;
  bungaPeriode: BungaPeriode;
  jangkaWaktu: number;
}

export interface CalcResult {
  totalHutang: number;
  cicilanPerBulan: number;
  keuntunganEstimasi: number;
  bungaEfektifPerBulan: number;
  bungaEfektifPerTahun: number;
  bungaEfektifPerHari: number;
}

function toMonthlyRate(persen: number, periode: BungaPeriode): number {
  if (periode === 'bulanan') return persen;
  if (periode === 'tahunan') return persen / 12;
  return persen * 30;
}

export function calculateTagihan(
  hargaAwal: number,
  bungaPersen: number,
  jangkaWaktu: number,
  bungaPeriode: BungaPeriode = 'tahunan'
): CalcResult {
  const monthlyRate = toMonthlyRate(bungaPersen, bungaPeriode);
  const totalBunga = hargaAwal * (monthlyRate / 100) * jangkaWaktu;
  const totalHutang = hargaAwal + totalBunga;
  const cicilanPerBulan = totalHutang / jangkaWaktu;

  return {
    totalHutang: Math.round(totalHutang),
    cicilanPerBulan: Math.round(cicilanPerBulan),
    keuntunganEstimasi: Math.round(totalBunga),
    bungaEfektifPerBulan: Math.round(monthlyRate * 1000) / 1000,
    bungaEfektifPerTahun: Math.round(monthlyRate * 12 * 1000) / 1000,
    bungaEfektifPerHari: Math.round((monthlyRate / 30) * 10000) / 10000,
  };
}

export function reverseCalculateTagihan(hargaAwal: number, hargaAkhir: number, jangkaWaktu: number): CalcResult {
  if (hargaAwal <= 0 || jangkaWaktu <= 0) {
    return {
      totalHutang: 0,
      cicilanPerBulan: 0,
      keuntunganEstimasi: 0,
      bungaEfektifPerBulan: 0,
      bungaEfektifPerTahun: 0,
      bungaEfektifPerHari: 0,
    };
  }

  const totalBunga = hargaAkhir - hargaAwal;
  const monthlyRate = (totalBunga / (hargaAwal * jangkaWaktu)) * 100;
  const cicilanPerBulan = hargaAkhir / jangkaWaktu;

  return {
    totalHutang: Math.round(hargaAkhir),
    cicilanPerBulan: Math.round(cicilanPerBulan),
    keuntunganEstimasi: Math.round(totalBunga),
    bungaEfektifPerBulan: Math.round(monthlyRate * 1000) / 1000,
    bungaEfektifPerTahun: Math.round(monthlyRate * 12 * 1000) / 1000,
    bungaEfektifPerHari: Math.round((monthlyRate / 30) * 10000) / 10000,
  };
}
