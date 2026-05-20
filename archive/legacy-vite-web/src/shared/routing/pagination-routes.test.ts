import { describe, expect, it } from 'vitest';
import { getPaginatedFeatureBase, isSameFeaturePaginationNavigation } from './pagination-routes';

describe('pagination route helpers', () => {
  it('detects supported feature pagination routes', () => {
    expect(getPaginatedFeatureBase('/anime')).toBe('/anime');
    expect(getPaginatedFeatureBase('/anime/page=2')).toBe('/anime');
    expect(getPaginatedFeatureBase('/waifu/page=4')).toBe('/waifu');
    expect(getPaginatedFeatureBase('/settings/page=2')).toBeNull();
  });

  it('only skips top scroll for same-feature pagination changes', () => {
    expect(isSameFeaturePaginationNavigation('/anime', '/anime/page=2')).toBe(true);
    expect(isSameFeaturePaginationNavigation('/anime/page=2', '/anime/page=3')).toBe(true);
    expect(isSameFeaturePaginationNavigation('/anime/page=2', '/donghua/page=2')).toBe(false);
    expect(isSameFeaturePaginationNavigation('/anime/page=2', '/anime/detail/1')).toBe(false);
  });
});
