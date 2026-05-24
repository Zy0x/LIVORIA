import { describe, expect, it } from 'vitest';
import type { ObatItem } from '../types/obat.types';
import { sortObatItems } from './obat-sort';

function obat(overrides: Partial<ObatItem>): ObatItem {
  return {
    id: overrides.id ?? 'id',
    user_id: 'user',
    name: overrides.name ?? 'Name',
    type: overrides.type ?? 'Lainnya',
    dosage: '',
    usage_info: '',
    notes: '',
    frequency: '',
    side_effects: '',
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('obat sort domain', () => {
  it('sorts terbaru by created_at desc', () => {
    expect(
      sortObatItems(
        [
          obat({ id: 'old', created_at: '2025-01-01T00:00:00.000Z' }),
          obat({ id: 'new', created_at: '2026-01-01T00:00:00.000Z' }),
        ],
        'terbaru',
      ).map((item) => item.id),
    ).toEqual(['new', 'old']);
  });
});
