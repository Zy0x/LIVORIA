import { describe, expect, it } from 'vitest';
import {
  calculateCicilanFromInstallment,
  previewJadwalPembayaran,
} from './tagihan-form-helpers';

describe('tagihan form helpers', () => {
  it('keeps installment-based reverse calculation stable', () => {
    const result = calculateCicilanFromInstallment(1_000_000, 120_000, 10);

    expect(result).toEqual({
      totalHutang: 1_200_000,
      cicilanPerBulan: 120_000,
      keuntunganEstimasi: 200_000,
      bungaEfektifPerBulan: 2,
      bungaEfektifPerTahun: 24,
      bungaEfektifPerHari: 0.0667,
    });
  });

  it('detects cross-month payment windows', () => {
    expect(previewJadwalPembayaran('2026-05-25', '2026-06-05')).toContain('lintas bulan');
    expect(previewJadwalPembayaran('2026-05-05', '2026-05-25')).toContain('setiap bulan');
    expect(previewJadwalPembayaran('', '2026-05-25')).toBeNull();
  });
});

