import type { BungaPeriode, CalcResult } from '@/features/tagihan/domain/tagihan-calculation';
import type { JenisTempo, TagihanStatus } from '@/lib/types';

export type CalcSource = 'bunga' | 'cicilan' | 'harga_akhir' | 'none';

export const TAGIHAN_FORM_TIPS = {
  nasabah: 'Pihak yang menerima pinjaman. Dalam perbankan disebut debitur atau nasabah peminjam.',
  kontak: 'Nomor telepon atau email nasabah untuk keperluan penagihan dan komunikasi.',
  objekPembiayaan: 'Barang atau aset yang menjadi dasar pembiayaan/kredit yang diberikan.',
  pokokPinjaman: 'Jumlah uang yang dipinjamkan sebelum ditambah bunga. Disebut juga principal atau pokok kredit.',
  sukuBunga: 'Persentase biaya pinjaman per periode. Suku bunga flat dihitung dari pokok awal setiap bulan.',
  angsuranPerBulan: 'Jumlah pembayaran tetap yang harus dibayar nasabah setiap bulan, mencakup pokok + bunga.',
  totalKewajiban: 'Total jumlah yang harus dibayar nasabah hingga lunas, termasuk pokok pinjaman dan seluruh bunga.',
  tenor: 'Jangka waktu pelunasan pinjaman dalam bulan. Semakin panjang tenor, angsuran semakin kecil tapi total bunga lebih besar.',
  tanggalAkad: 'Tanggal resmi perjanjian kredit ditandatangani dan dana mulai berjalan.',
  dendaKeterlambatan: 'Biaya penalti yang dikenakan jika nasabah terlambat membayar angsuran melewati tanggal jatuh tempo.',
  angsuranBerkala: 'Skema pembayaran rutin setiap bulan dengan pola tanggal bayar dan jatuh tempo yang tetap dan berulang.',
  jatuhTempoTetap: 'Skema dengan tanggal jatuh tempo tunggal di akhir periode, cocok untuk kredit dengan pembayaran tidak rutin.',
  bukaJendela: 'Tanggal awal dimana nasabah sudah bisa mulai membayar angsuran bulan tersebut.',
  batasAngsuran: 'Tanggal terakhir angsuran harus diterima sebelum dinyatakan terlambat (jatuh tempo).',
  sumberDana: 'Asal modal yang digunakan untuk membiayai pinjaman ini.',
  danaSendiri: 'Modal berasal dari dana pribadi yang terpisah, tidak terkait dengan penerimaan dari pinjaman lain.',
  danaRevolving: 'Modal berasal dari pembayaran angsuran nasabah lain yang diputar kembali (modal bergulir).',
  rekonsiliasi: 'Proses penyesuaian catatan pembayaran jika terdapat selisih antara data sistem dan realisasi aktual.',
  saldoAwal: 'Jumlah angsuran yang sudah dibayarkan sebelum data dimasukkan ke sistem (untuk pindahan/migrasi).',
  totalKewajiban2: 'Total kewajiban nasabah mencakup pokok + seluruh bunga yang harus dilunasi hingga akhir tenor.',
  pendapatanBunga: 'Keuntungan yang diperoleh pemberi pinjaman dari bunga yang dibayar nasabah selama tenor.',
  bungaEfektif: 'Suku bunga nyata yang mencerminkan biaya pinjaman sesungguhnya per periode, dihitung dari saldo pokok tersisa.',
  saluranPembayaran: 'Media atau platform yang digunakan nasabah untuk melakukan pembayaran angsuran.',
} as const;

const STORAGE_KEY = 'livoria_custom_payment_methods';

export const DEFAULT_PAYMENT_METHODS = ['ShopeePay', 'SPayLater', 'Cash'];

export const initialTagihanForm = {
  debitur_nama: '',
  debitur_kontak: '',
  barang_nama: '',
  harga_awal: 0,
  bunga_persen: 0,
  bunga_periode: 'tahunan' as BungaPeriode,
  jangka_waktu_bulan: 1,
  harga_akhir: 0,
  cicilan_input: 0,
  tanggal_mulai: new Date().toISOString().split('T')[0],
  tanggal_mulai_bayar: '',
  tanggal_jatuh_tempo_input: '',
  denda_persen_per_hari: 0,
  catatan: '',
  status: 'aktif' as TagihanStatus,
  sudah_dibayar_bulan: 0,
  total_sudah_dibayar: 0,
  metode_pembayaran: '',
  jenis_tempo: 'bulanan' as JenisTempo,
  tgl_bayar_tanggal: '',
  tgl_tempo_tanggal: '',
  sumber_modal: 'modal_terpisah' as 'modal_terpisah' | 'modal_bergulir' | 'dana_luar',
  kuantitas: '',
};

export function getCustomPaymentMethods(): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveCustomPaymentMethods(methods: string[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
}

export function calculateCicilanFromInstallment(hargaAwal: number, cicilan: number, jangka: number): CalcResult {
  if (hargaAwal <= 0 || cicilan <= 0 || jangka <= 0) {
    return {
      totalHutang: 0,
      cicilanPerBulan: 0,
      keuntunganEstimasi: 0,
      bungaEfektifPerBulan: 0,
      bungaEfektifPerTahun: 0,
      bungaEfektifPerHari: 0,
    };
  }

  const total = cicilan * jangka;
  const keuntungan = total - hargaAwal;
  const monthlyRate = hargaAwal > 0 ? (keuntungan / (hargaAwal * jangka)) * 100 : 0;
  return {
    totalHutang: Math.round(total),
    cicilanPerBulan: cicilan,
    keuntunganEstimasi: Math.round(keuntungan),
    bungaEfektifPerBulan: Math.round(monthlyRate * 1000) / 1000,
    bungaEfektifPerTahun: Math.round(monthlyRate * 12 * 1000) / 1000,
    bungaEfektifPerHari: Math.round((monthlyRate / 30) * 10000) / 10000,
  };
}

export function previewJadwalPembayaran(bayarDate: string, tempoDate: string): string | null {
  if (!bayarDate || !tempoDate) return null;
  const bayarDay = new Date(bayarDate).getDate();
  const tempoDay = new Date(tempoDate).getDate();
  const crossMonth = tempoDay < bayarDay;
  if (crossMonth) {
    return `Jendela angsuran: tgl ${bayarDay} s/d tgl ${tempoDay} bulan berikutnya (lintas bulan). Pola ini akan berulang setiap bulan.`;
  }
  return `Jendela angsuran: tgl ${bayarDay} s/d tgl ${tempoDay} setiap bulan. Pola ini akan berulang otomatis.`;
}
