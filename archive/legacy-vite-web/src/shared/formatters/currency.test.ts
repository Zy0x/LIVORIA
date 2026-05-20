import { describe, expect, it } from 'vitest';
import { formatCompactIDR, formatCurrencyIDR } from './currency';

describe('currency formatters', () => {
  it('formats IDR without decimal digits', () => {
    const formatted = formatCurrencyIDR(1_250_000);

    expect(formatted).toContain('Rp');
    expect(formatted).toContain('1.250.000');
  });

  it('formats compact Indonesian currency labels', () => {
    expect(formatCompactIDR(999)).toBe('999');
    expect(formatCompactIDR(25_000)).toBe('25rb');
    expect(formatCompactIDR(1_500_000)).toBe('1.5jt');
    expect(formatCompactIDR(2_000_000_000)).toBe('2.0M');
  });
});
