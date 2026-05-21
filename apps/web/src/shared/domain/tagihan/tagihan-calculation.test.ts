import { describe, expect, it } from 'vitest';

import { calculateTagihan, reverseCalculateTagihan } from './tagihan-calculation';

describe('tagihan calculation domain', () => {
  it('calculates yearly interest as monthly effective rate', () => {
    const result = calculateTagihan(12_000_000, 12, 12, 'tahunan');

    expect(result.totalHutang).toBe(13_440_000);
    expect(result.cicilanPerBulan).toBe(1_120_000);
    expect(result.keuntunganEstimasi).toBe(1_440_000);
    expect(result.bungaEfektifPerBulan).toBe(1);
    expect(result.bungaEfektifPerTahun).toBe(12);
    expect(result.bungaEfektifPerHari).toBe(0.0333);
  });

  it('calculates monthly interest without period conversion', () => {
    const result = calculateTagihan(10_000_000, 2, 10, 'bulanan');

    expect(result.totalHutang).toBe(12_000_000);
    expect(result.cicilanPerBulan).toBe(1_200_000);
    expect(result.keuntunganEstimasi).toBe(2_000_000);
    expect(result.bungaEfektifPerBulan).toBe(2);
    expect(result.bungaEfektifPerTahun).toBe(24);
    expect(result.bungaEfektifPerHari).toBe(0.0667);
  });

  it('calculates daily interest using 30 day monthly conversion', () => {
    const result = calculateTagihan(1_000_000, 0.1, 2, 'harian');

    expect(result.totalHutang).toBe(1_060_000);
    expect(result.cicilanPerBulan).toBe(530_000);
    expect(result.keuntunganEstimasi).toBe(60_000);
    expect(result.bungaEfektifPerBulan).toBe(3);
    expect(result.bungaEfektifPerTahun).toBe(36);
    expect(result.bungaEfektifPerHari).toBe(0.1);
  });

  it('reverse-calculates interest and installment from final debt amount', () => {
    const result = reverseCalculateTagihan(10_000_000, 12_000_000, 10);

    expect(result.totalHutang).toBe(12_000_000);
    expect(result.cicilanPerBulan).toBe(1_200_000);
    expect(result.keuntunganEstimasi).toBe(2_000_000);
    expect(result.bungaEfektifPerBulan).toBe(2);
    expect(result.bungaEfektifPerTahun).toBe(24);
    expect(result.bungaEfektifPerHari).toBe(0.0667);
  });

  it('returns zero totals for invalid reverse calculation input', () => {
    expect(reverseCalculateTagihan(0, 12_000_000, 10)).toEqual({
      totalHutang: 0,
      cicilanPerBulan: 0,
      keuntunganEstimasi: 0,
      bungaEfektifPerBulan: 0,
      bungaEfektifPerTahun: 0,
      bungaEfektifPerHari: 0,
    });

    expect(reverseCalculateTagihan(10_000_000, 12_000_000, 0)).toEqual({
      totalHutang: 0,
      cicilanPerBulan: 0,
      keuntunganEstimasi: 0,
      bungaEfektifPerBulan: 0,
      bungaEfektifPerTahun: 0,
      bungaEfektifPerHari: 0,
    });
  });
});
