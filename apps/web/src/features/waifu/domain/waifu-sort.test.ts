import { describe, expect, it } from 'vitest';
import type { WaifuItem } from '../types/waifu.types';
import { sortWaifuItems } from './waifu-sort';

function waifu(overrides: Partial<WaifuItem>): WaifuItem {
  return {
    id: overrides.id ?? 'id',
    user_id: 'user',
    name: overrides.name ?? 'Name',
    source: overrides.source ?? '',
    source_type: overrides.source_type ?? 'anime',
    tier: overrides.tier ?? 'B',
    image_url: '',
    notes: '',
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('waifu sort domain', () => {
  it('sorts terbaru by created_at desc', () => {
    expect(
      sortWaifuItems(
        [
          waifu({ id: 'old', created_at: '2025-01-01T00:00:00.000Z' }),
          waifu({ id: 'new', created_at: '2026-01-01T00:00:00.000Z' }),
        ],
        'terbaru',
      ).map((item) => item.id),
    ).toEqual(['new', 'old']);
  });

  it('sorts tier from S to C and keeps new items first inside the same tier', () => {
    expect(
      sortWaifuItems(
        [
          waifu({ id: 'c', tier: 'C' }),
          waifu({ id: 's-old', tier: 'S', created_at: '2025-01-01T00:00:00.000Z' }),
          waifu({ id: 's-new', tier: 'S', created_at: '2026-01-01T00:00:00.000Z' }),
        ],
        'tier',
      ).map((item) => item.id),
    ).toEqual(['s-new', 's-old', 'c']);
  });
});
