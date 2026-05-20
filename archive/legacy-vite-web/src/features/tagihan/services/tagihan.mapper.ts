import type { Struk, Tagihan, TagihanHistory, TagihanStatus } from '../types/tagihan.types';

const statusValues = new Set<TagihanStatus>(['aktif', 'lunas', 'overdue', 'ditunda']);

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value == null ? fallback : String(value);
}

function toNullableString(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStatus(value: unknown): TagihanStatus {
  return statusValues.has(value as TagihanStatus) ? (value as TagihanStatus) : 'aktif';
}

export function mapTagihan(row: any): Tagihan {
  return {
    id: toString(row.id),
    user_id: toString(row.user_id),
    debitur_nama: toString(row.debitur_nama),
    debitur_kontak: toString(row.debitur_kontak),
    barang_nama: toString(row.barang_nama),
    harga_awal: toNumber(row.harga_awal),
    bunga_persen: toNumber(row.bunga_persen),
    jangka_waktu_bulan: toNumber(row.jangka_waktu_bulan),
    cicilan_per_bulan: toNumber(row.cicilan_per_bulan),
    tanggal_mulai: toString(row.tanggal_mulai),
    tanggal_jatuh_tempo: toString(row.tanggal_jatuh_tempo),
    tanggal_mulai_bayar: toNullableString(row.tanggal_mulai_bayar),
    status: toStatus(row.status),
    total_dibayar: toNumber(row.total_dibayar),
    total_hutang: toNumber(row.total_hutang),
    sisa_hutang: toNumber(row.sisa_hutang),
    keuntungan_estimasi: toNumber(row.keuntungan_estimasi),
    denda_persen_per_hari: toNumber(row.denda_persen_per_hari),
    catatan: toString(row.catatan),
    metode_pembayaran: toString(row.metode_pembayaran),
    sumber_modal: row.sumber_modal === 'modal_bergulir' || row.sumber_modal === 'dana_luar'
      ? row.sumber_modal
      : 'modal_terpisah',
    jenis_tempo: row.jenis_tempo === 'berjangka' ? 'berjangka' : 'bulanan',
    tgl_bayar_tanggal: toNullableString(row.tgl_bayar_tanggal),
    tgl_tempo_tanggal: toNullableString(row.tgl_tempo_tanggal),
    tgl_bayar_hari: toNullableNumber(row.tgl_bayar_hari),
    tgl_tempo_hari: toNullableNumber(row.tgl_tempo_hari),
    kuantitas: toNullableString(row.kuantitas),
    created_at: toString(row.created_at),
    updated_at: toString(row.updated_at),
  };
}

export function mapTagihanList(rows: any[] | null | undefined): Tagihan[] {
  return (rows ?? []).map(mapTagihan);
}

export function mapHistory(row: any): TagihanHistory {
  return {
    id: toString(row.id),
    tagihan_id: toString(row.tagihan_id),
    user_id: toString(row.user_id),
    aksi: toString(row.aksi),
    detail: toString(row.detail),
    jumlah: toNumber(row.jumlah),
    created_at: toString(row.created_at),
  };
}

export function mapHistoryList(rows: any[] | null | undefined): TagihanHistory[] {
  return (rows ?? []).map(mapHistory);
}

export function mapStruk(row: any): Struk {
  return {
    id: toString(row.id),
    tagihan_id: toString(row.tagihan_id),
    user_id: toString(row.user_id),
    file_url: toString(row.file_url),
    file_name: toString(row.file_name),
    file_type: toString(row.file_type),
    keterangan: toString(row.keterangan),
    uploaded_at: toString(row.uploaded_at),
  };
}

export function mapStrukList(rows: any[] | null | undefined): Struk[] {
  return (rows ?? []).map(mapStruk);
}

