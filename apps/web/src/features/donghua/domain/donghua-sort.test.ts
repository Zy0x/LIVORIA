import { describe, expect, it } from 'vitest';
import type { DonghuaItem } from '@/lib/types';
import { sortDonghuaItems } from './donghua-sort';

function donghua(overrides: Partial<DonghuaItem>): DonghuaItem {
  return {
    id: overrides.id ?? 'id',
    user_id: 'user',
    title: overrides.title ?? 'Title',
    status: overrides.status ?? 'planned',
    genre: '',
    rating: overrides.rating ?? 0,
    episodes: overrides.episodes ?? 0,
    episodes_watched: 0,
    cover_url: '',
    synopsis: '',
    notes: '',
    season: 1,
    cour: '',
    streaming_url: '',
    schedule: overrides.schedule ?? '',
    parent_title: '',
    is_favorite: false,
    is_bookmarked: false,
    is_movie: false,
    duration_minutes: null,
    is_hentai: false,
    release_year: overrides.release_year,
    studio: null,
    mal_url: null,
    anilist_url: null,
    mal_id: null,
    anilist_id: null,
    alternative_titles: null,
    watch_status: overrides.watch_status,
    watched_at: overrides.watched_at,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  };
}

describe('donghua sort domain', () => {
  it('sorts terbaru by created_at desc before pagination', () => {
    const result = sortDonghuaItems(
      [
        donghua({ id: 'old', title: 'Old', created_at: '2025-01-01T00:00:00.000Z' }),
        donghua({ id: 'new', title: 'New', created_at: '2026-01-01T00:00:00.000Z' }),
      ],
      'terbaru',
      false,
      'original',
    );

    expect(result.map((item) => item.id)).toEqual(['new', 'old']);
  });

  it('sorts tahun_terbaru by release year and uses created_at as tie-breaker', () => {
    const result = sortDonghuaItems(
      [
        donghua({ id: 'older-add', release_year: 2026, created_at: '2026-01-01T00:00:00.000Z' }),
        donghua({ id: 'older-year', release_year: 2024, created_at: '2026-05-01T00:00:00.000Z' }),
        donghua({ id: 'newer-add', release_year: 2026, created_at: '2026-03-01T00:00:00.000Z' }),
      ],
      'tahun_terbaru',
      false,
      'original',
    );

    expect(result.map((item) => item.id)).toEqual(['newer-add', 'older-add', 'older-year']);
  });

  it('sorts grouped cards by the newest item inside each group', () => {
    const oldRepresentative = donghua({ id: 'rep-old', title: 'Series A S2', created_at: '2025-01-01T00:00:00.000Z' });
    const newGroupItem = donghua({ id: 'new-inside-group', title: 'Series A S1', created_at: '2026-05-01T00:00:00.000Z' });
    const standalone = donghua({ id: 'standalone', title: 'Standalone', created_at: '2026-01-01T00:00:00.000Z' });

    const result = sortDonghuaItems(
      [standalone, oldRepresentative],
      'terbaru',
      false,
      'original',
      {
        [oldRepresentative.id]: [newGroupItem, oldRepresentative],
        [standalone.id]: [standalone],
      },
    );

    expect(result.map((item) => item.id)).toEqual(['rep-old', 'standalone']);
  });
});
