import { describe, expect, it } from 'vitest';

import {
  getActivePeriod,
  getBillingPeriod,
  getPaymentInfo,
  getReminderStatus,
  isTagihanDueInMonth,
  isTagihanOverdue,
} from '../domain/tagihan-cycle';
import type { Tagihan } from '@/shared/domain/tagihan/tagihan.types';

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
  it('keeps normal installment period and payment info stable', () => {
    const tagihan = makeTagihan();
    const period = getBillingPeriod(tagihan, 1);
    const info = getPaymentInfo(tagihan, new Date('2026-01-26T00:00:00'));

    expect(period.periodIndex).toBe(1);
    expect(period.periodLabel.toLowerCase()).toContain('januari');
    expect(info.paidCount).toBe(0);
    expect(info.nextPaymentIndex).toBe(1);
    expect(info.note).toBe('Cicilan bulan ke-1 (Januari 2026)');
  });

  it('builds cross-month active payment windows from concrete dates', () => {
    const period = getActivePeriod(makeTagihan(), new Date('2026-01-26T00:00:00'));

    expect(period.periodIndex).toBe(1);
    expect(localDateKey(period.windowStart)).toBe('2026-01-25');
    expect(localDateKey(period.windowEnd)).toBe('2026-02-05');
    expect(period.isPaid).toBe(false);
  });

  it('marks paid-off bills as having no reminder', () => {
    const reminder = getReminderStatus(
      makeTagihan({ status: 'lunas', total_dibayar: 12_000_000, sisa_hutang: 0 }),
      new Date('2026-02-06T00:00:00')
    );

    expect(reminder.level).toBe('none');
    expect(reminder.period).toBeNull();
  });

  it('marks unpaid period as overdue after due date', () => {
    const reminder = getReminderStatus(makeTagihan(), new Date('2026-02-06T00:00:00'));

    expect(reminder.level).toBe('overdue');
    expect(reminder.period?.periodIndex).toBe(1);
    expect(isTagihanOverdue(makeTagihan(), new Date('2026-02-06T00:00:00'))).toBe(true);
  });

  it('does not mark paid or postponed bills as overdue', () => {
    const today = new Date('2026-02-06T00:00:00');

    expect(isTagihanOverdue(makeTagihan({ status: 'lunas' }), today)).toBe(false);
    expect(isTagihanOverdue(makeTagihan({ status: 'ditunda' }), today)).toBe(false);
  });

  it('includes cross-month due windows in both payment range months', () => {
    const tagihan = makeTagihan();

    expect(isTagihanDueInMonth(tagihan, 2026, 0, 'tempo', new Date('2026-01-26T00:00:00'))).toBe(true);
    expect(isTagihanDueInMonth(tagihan, 2026, 1, 'tempo', new Date('2026-01-26T00:00:00'))).toBe(true);
  });

  it('treats total paid greater than or equal to total debt as completed for reminders', () => {
    const reminder = getReminderStatus(
      makeTagihan({ status: 'aktif', total_dibayar: 12_000_000, sisa_hutang: 0 }),
      new Date('2026-12-10T00:00:00')
    );

    expect(reminder.level).toBe('none');
    expect(reminder.message).toBe('Semua cicilan sudah lunas.');
  });
});
