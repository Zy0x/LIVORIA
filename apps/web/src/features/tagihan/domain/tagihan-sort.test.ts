import { describe, expect, it } from 'vitest';
import type { Tagihan } from '../types/tagihan.types';
import { sortTagihanItems } from './tagihan-sort';

function tagihan(overrides: Partial<Tagihan>): Tagihan {
  return {
    id: overrides.id ?? 'id',
    user_id: 'user',
    debitur_nama: overrides.debitur_nama ?? 'Debitur',
    debitur_kontak: '',
    barang_nama: overrides.barang_nama ?? 'Barang',
    harga_awal: 0,
    bunga_persen: 0,
    jangka_waktu_bulan: 1,
    cicilan_per_bulan: 0,
    tanggal_mulai: '2026-01-01',
    tanggal_jatuh_tempo: overrides.tanggal_jatuh_tempo ?? null,
    tanggal_mulai_bayar: null,
    status: overrides.status ?? 'aktif',
    total_dibayar: 0,
    total_hutang: 0,
    sisa_hutang: overrides.sisa_hutang ?? 0,
    keuntungan_estimasi: 0,
    denda_persen_per_hari: 0,
    catatan: '',
    metode_pembayaran: '',
    sumber_modal: 'modal_terpisah',
    jenis_tempo: 'bulanan',
    tgl_bayar_tanggal: null,
    tgl_tempo_tanggal: null,
    tgl_bayar_hari: null,
    tgl_tempo_hari: null,
    kuantitas: null,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('tagihan sort domain', () => {
  it('sorts terbaru by created_at desc', () => {
    expect(
      sortTagihanItems(
        [
          tagihan({ id: 'old', created_at: '2025-01-01T00:00:00.000Z' }),
          tagihan({ id: 'new', created_at: '2026-01-01T00:00:00.000Z' }),
        ],
        'terbaru',
      ).map((item) => item.id),
    ).toEqual(['new', 'old']);
  });

  it('sorts jatuh_tempo by nearest due date with empty due date last', () => {
    expect(
      sortTagihanItems(
        [
          tagihan({ id: 'empty', tanggal_jatuh_tempo: null }),
          tagihan({ id: 'late', tanggal_jatuh_tempo: '2026-03-10' }),
          tagihan({ id: 'soon', tanggal_jatuh_tempo: '2026-02-10' }),
        ],
        'jatuh_tempo',
      ).map((item) => item.id),
    ).toEqual(['soon', 'late', 'empty']);
  });
});
