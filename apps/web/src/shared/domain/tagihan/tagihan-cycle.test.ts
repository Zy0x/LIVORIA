import { describe, expect, it } from 'vitest';
import { getActivePeriod, getReminderStatus, isTagihanDueInMonth } from './tagihan-cycle';
import type { Tagihan } from './tagihan.types';

function localDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

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

describe('tagihan cycle domain', () => {
  it('builds cross-month active payment windows from concrete dates', () => {
    const period = getActivePeriod(makeTagihan(), new Date('2026-01-26T00:00:00'));

    expect(period.periodIndex).toBe(1);
    expect(localDateKey(period.windowStart)).toBe('2026-01-25');
    expect(localDateKey(period.windowEnd)).toBe('2026-02-05');
    expect(period.isPaid).toBe(false);
  });

  it('marks unpaid period as critical on due date', () => {
    const reminder = getReminderStatus(makeTagihan(), new Date('2026-02-05T00:00:00'));

    expect(reminder.level).toBe('critical');
    expect(reminder.period?.periodIndex).toBe(1);
  });

  it('includes cross-month due windows in both payment range months', () => {
    const tagihan = makeTagihan();

    expect(isTagihanDueInMonth(tagihan, 2026, 0, 'tempo', new Date('2026-01-26T00:00:00'))).toBe(true);
    expect(isTagihanDueInMonth(tagihan, 2026, 1, 'tempo', new Date('2026-01-26T00:00:00'))).toBe(true);
  });
});
