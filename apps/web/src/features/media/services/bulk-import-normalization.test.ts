import { describe, expect, it } from 'vitest';
import {
  buildBulkItemFromRaw,
  getParentTitle,
  interpretNote,
  scoreToConfidence,
} from './bulk-import-normalization';

describe('bulk import normalization', () => {
  it('preserves Livoria export fields and marks rich rows as enriched', () => {
    const item = buildBulkItemFromRaw({
      title: 'Sample Anime Season 2',
      status: 'completed',
      watch_status: 'watched',
      watched_at: '2026-05-20T00:00:00.000Z',
      cover_url: 'https://example.test/cover.jpg',
      genre: 'Action',
      synopsis: 'Story',
      mal_id: 123,
      alternative_titles: JSON.stringify({ english: ['Sample'] }),
      episodes: 12,
      episodes_watched: 12,
      is_favorite: 'true',
      is_bookmarked: '0',
    });

    expect(item).toMatchObject({
      title: 'Sample Anime Season 2',
      status: 'completed',
      watch_status: 'watched',
      watched_at: '2026-05-20T00:00:00.000Z',
      enriched: true,
      enrichSource: 'Import',
      matchConfidence: 'high',
      episodes: 12,
      episodes_watched: 12,
      is_favorite: true,
      is_bookmarked: false,
    });
  });

  it('falls back invalid enum values safely', () => {
    const item = buildBulkItemFromRaw({
      title: 'Invalid Status Row',
      status: 'done',
      watch_status: 'finished',
    });

    expect(item?.status).toBe('planned');
    expect(item?.watch_status).toBe('none');
  });

  it('keeps legacy note shortcuts for favorite and bookmark flags', () => {
    expect(interpretNote('*')).toEqual({ is_favorite: true, is_bookmarked: true });
    expect(interpretNote('**')).toEqual({ is_favorite: false, is_bookmarked: true });
    expect(interpretNote('OP')).toEqual({ is_favorite: true, is_bookmarked: false });
  });

  it('keeps confidence and parent title helpers stable', () => {
    expect(scoreToConfidence(0.8)).toBe('high');
    expect(scoreToConfidence(0.5)).toBe('medium');
    expect(scoreToConfidence(0.2)).toBe('low');
    expect(scoreToConfidence(0)).toBe('none');
    expect(getParentTitle('Example Anime Season 3', 3)).toBe('Example Anime');
  });
});

