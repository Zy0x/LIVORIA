import { describe, expect, it } from 'vitest';

import { calculatePaymentTotals, validateQuickPay } from '../domain/tagihan-payment';
import type { Tagihan } from '@/shared/domain/tagihan/tagihan.types';

function makeTagihan(overrides: Partial<Tagihan> = {}): Tagihan {
  return {
    id: 'tagihan-1',
    user_id: 'user-1',
    debitur_nama: 'Budi',
    debitur_kontak: '',
    barang_nama: 'Laptop',
    harga_awal: 12_000_000,
    bunga_persen: 0,
    jangka_waktu_bulan: 12,
    cicilan_per_bulan: 1_000_000,
    tanggal_mulai: '2026-01-10',
    tanggal_jatuh_tempo: '2026-02-05',
    tanggal_mulai_bayar: '2026-01-25',
    status: 'aktif',
    total_dibayar: 0,
    total_hutang: 12_000_000,
    sisa_hutang: 12_000_000,
    keuntungan_estimasi: 0,
    denda_persen_per_hari: 0,
    catatan: '',
    metode_pembayaran: '',
    sumber_modal: 'modal_terpisah',
    jenis_tempo: 'bulanan',
    tgl_bayar_tanggal: '2026-01-25',
    tgl_tempo_tanggal: '2026-02-05',
    tgl_bayar_hari: null,
    tgl_tempo_hari: null,
    kuantitas: null,
    created_at: '2026-01-10T00:00:00.000Z',
    updated_at: '2026-01-10T00:00:00.000Z',
    ...overrides,
  };
}

describe('tagihan payment domain', () => {
  it('calculates partial payment totals without changing active status', () => {
    const totals = calculatePaymentTotals(makeTagihan(), 500_000);

    expect(totals.totalDibayar).toBe(500_000);
    expect(totals.sisaHutang).toBe(11_500_000);
    expect(totals.status).toBe('aktif');
    expect(totals.isLunas).toBe(false);
  });

  it('calculates full payment totals as paid off', () => {
    const totals = calculatePaymentTotals(makeTagihan(), 12_000_000);

    expect(totals.totalDibayar).toBe(12_000_000);
    expect(totals.sisaHutang).toBe(0);
    expect(totals.status).toBe('lunas');
    expect(totals.isLunas).toBe(true);
  });

  it('keeps existing overpayment behavior while clamping remaining debt', () => {
    const totals = calculatePaymentTotals(makeTagihan({ total_dibayar: 11_500_000, sisa_hutang: 500_000 }), 1_000_000);

    expect(totals.totalDibayar).toBe(12_500_000);
    expect(totals.sisaHutang).toBe(0);
    expect(totals.status).toBe('lunas');
    expect(totals.isLunas).toBe(true);
  });

  it('validates quick pay amount before mutation', () => {
    expect(validateQuickPay(makeTagihan(), 1_000_000)).toEqual({ valid: true, amount: 1_000_000 });
    expect(validateQuickPay(makeTagihan(), 0)).toMatchObject({ valid: false, amount: 0 });
    expect(validateQuickPay(makeTagihan({ status: 'lunas' }), 1_000_000)).toMatchObject({
      valid: false,
      amount: 1_000_000,
    });
  });
});

