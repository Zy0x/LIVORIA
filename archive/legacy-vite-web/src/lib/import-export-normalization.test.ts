import { describe, expect, it } from 'vitest';

import {
  castCSVValue,
  parseCSVLine,
  sanitizeImportRow,
} from './import-export-normalization';

describe('import-export normalization helpers', () => {
  it('casts CSV scalar values before schema validation', () => {
    expect(castCSVValue('is_movie', '1')).toBe(true);
    expect(castCSVValue('is_hentai', 'false')).toBe(false);
    expect(castCSVValue('rating', '8.5')).toBe(8.5);
    expect(castCSVValue('mal_id', '')).toBeNull();
    expect(castCSVValue('status', 'invalid')).toBe('planned');
    expect(castCSVValue('watch_status', 'watched')).toBe('watched');
  });

  it('parses quoted CSV fields with commas and escaped quotes', () => {
    expect(parseCSVLine('title,notes,"genre, extra","quote ""inside"""')).toEqual([
      'title',
      'notes',
      'genre, extra',
      'quote "inside"',
    ]);
  });

  it('sanitizes media import rows without carrying unsafe identity fields', () => {
    const sanitized = sanitizeImportRow({
      id: 'keep-out',
      user_id: 'keep-out',
      title: 'Sample',
      status: 'completed',
      genre: 'Action',
      rating: '7.5',
      episodes: '12',
      is_favorite: 'true',
      is_bookmarked: '0',
      alternative_titles: '["Alt"]',
      watch_status: 'unknown',
      watched_at: 'not-a-date',
    });

    expect(sanitized).toMatchObject({
      title: 'Sample',
      status: 'completed',
      genre: 'Action',
      rating: 7.5,
      episodes: 12,
      episodes_watched: 12,
      is_favorite: true,
      is_bookmarked: false,
      alternative_titles: '["Alt"]',
      watch_status: 'none',
      watched_at: null,
    });
    expect(sanitized).not.toHaveProperty('id');
    expect(sanitized).not.toHaveProperty('user_id');
  });
});
