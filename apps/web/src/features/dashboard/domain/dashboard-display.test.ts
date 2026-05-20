import { describe, expect, it } from 'vitest';

import {
  DASHBOARD_DAY_LABELS,
  DASHBOARD_DAY_ORDER,
  formatShortIDR,
  getMediaStatusLabel,
  getTodayDay,
} from './dashboard-display';

describe('dashboard-display domain helpers', () => {
  it('keeps dashboard day order and labels stable', () => {
    expect(DASHBOARD_DAY_ORDER).toEqual([
      'senin',
      'selasa',
      'rabu',
      'kamis',
      'jumat',
      'sabtu',
      'minggu',
    ]);
    expect(DASHBOARD_DAY_LABELS.senin).toBe('Senin');
    expect(getTodayDay(new Date(2026, 4, 18))).toBe('senin');
  });

  it('formats short rupiah values like the dashboard widgets', () => {
    expect(formatShortIDR(950)).toBe('950');
    expect(formatShortIDR(12_300)).toBe('12rb');
    expect(formatShortIDR(1_250_000)).toBe('1.3jt');
  });

  it('maps media status labels for dashboard display', () => {
    expect(getMediaStatusLabel('on-going')).toBe('On-Going');
    expect(getMediaStatusLabel('completed')).toBe('Selesai');
    expect(getMediaStatusLabel('planned')).toBe('Direncanakan');
  });
});
