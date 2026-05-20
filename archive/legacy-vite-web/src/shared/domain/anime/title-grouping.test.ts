import { describe, expect, it } from 'vitest';
import { buildGroupMap, extractBaseTitle, isMovieItem, sortGroupBySeason } from './title-grouping';

describe('title grouping domain', () => {
  it('extracts base title from sequel titles', () => {
    expect(extractBaseTitle('Sousou no Frieren Season 2')).toBe('sousou no frieren');
    expect(extractBaseTitle('Kimetsu no Yaiba: Hashira Training Arc')).toBe('kimetsu no yaiba');
  });

  it('groups serial seasons and keeps representative as latest season', () => {
    const result = buildGroupMap([
      { id: 's1', title: 'Series Alpha Season 1', season: 1, is_movie: false },
      { id: 's2', title: 'Series Alpha Season 2', season: 2, is_movie: false },
    ]);

    expect(result.displayList).toHaveLength(1);
    expect(result.displayList[0].id).toBe('s2');
    expect(result.stackCounts.s2).toBe(1);
    expect(result.groupMap.s2.map((item) => item.id)).toEqual(['s1', 's2']);
  });

  it('sorts movie franchise by release year and detects movie titles', () => {
    const sorted = sortGroupBySeason([
      { id: 'm2', title: 'Saga Movie 2', is_movie: true, release_year: 2025 },
      { id: 'm1', title: 'Saga Movie 1', is_movie: true, release_year: 2023 },
    ]);

    expect(sorted.map((item) => item.id)).toEqual(['m1', 'm2']);
    expect(isMovieItem({ id: 'movie', title: 'Random The Movie' })).toBe(true);
  });
});
