export type TagihanStatus = 'aktif' | 'lunas' | 'overdue' | 'ditunda';
export type JenisTempo = 'bulanan' | 'berjangka';

export interface Tagihan {
  id: string;
  user_id: string;
  debitur_nama: string;
  debitur_kontak: string;
  barang_nama: string;
  harga_awal: number;
  bunga_persen: number;
  jangka_waktu_bulan: number;
  cicilan_per_bulan: number;
  tanggal_mulai: string;
  tanggal_jatuh_tempo: string;
  tanggal_mulai_bayar: string | null;
  status: TagihanStatus;
  total_dibayar: number;
  total_hutang: number;
  sisa_hutang: number;
  keuntungan_estimasi: number;
  denda_persen_per_hari: number;
  catatan: string;
  metode_pembayaran: string;
  sumber_modal: 'modal_terpisah' | 'modal_bergulir' | 'dana_luar';
  jenis_tempo: JenisTempo;
  tgl_bayar_tanggal: string | null;
  tgl_tempo_tanggal: string | null;
  tgl_bayar_hari: number | null;
  tgl_tempo_hari: number | null;
  kuantitas: string | null;
  created_at: string;
  updated_at: string;
}
