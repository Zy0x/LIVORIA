import { describe, expect, it } from 'vitest';
import type { AnimeItem } from '@/lib/types';
import { filterAnimeDisplayItems, getUsedAnimeGenres } from './anime-filter';
import { buildWatchStatusPayload } from './watch-status';
import { buildGroupMap } from './title-grouping';

function anime(overrides: Partial<AnimeItem>): AnimeItem {
  return {
    id: overrides.id ?? 'id',
    user_id: 'user',
    title: overrides.title ?? 'Title',
    status: overrides.status ?? 'planned',
    genre: overrides.genre ?? '',
    rating: overrides.rating ?? 0,
    episodes: overrides.episodes ?? 0,
    episodes_watched: overrides.episodes_watched ?? 0,
    cover_url: '',
    synopsis: '',
    notes: '',
    season: overrides.season ?? 1,
    cour: overrides.cour ?? '',
    streaming_url: '',
    schedule: overrides.schedule ?? '',
    parent_title: overrides.parent_title ?? '',
    is_favorite: overrides.is_favorite ?? false,
    is_bookmarked: overrides.is_bookmarked ?? false,
    is_movie: overrides.is_movie ?? false,
    duration_minutes: overrides.duration_minutes ?? null,
    is_hentai: overrides.is_hentai,
    release_year: overrides.release_year,
    studio: overrides.studio,
    mal_url: null,
    anilist_url: null,
    mal_id: null,
    anilist_id: null,
    alternative_titles: overrides.alternative_titles,
    watch_status: overrides.watch_status,
    watched_at: overrides.watched_at,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00.000Z',
  };
}

const baseState = {
  filter: 'all' as const,
  search: '',
  debouncedSearch: '',
  genreFilter: 'all',
  watchStatusFilter: 'all' as const,
  showFavoriteOnly: false,
  showBookmarkOnly: false,
  showHentaiOnly: false,
  movieFilter: 'all' as const,
  sortMode: 'terbaru' as const,
  sortReverse: false,
};

describe('anime filter domain', () => {
  it('filters representative groups when any group item matches', () => {
    const grouped = buildGroupMap([
      anime({ id: 's1', title: 'Series Alpha Season 1', status: 'completed', season: 1 }),
      anime({ id: 's2', title: 'Series Alpha Season 2', status: 'on-going', season: 2 }),
    ]);

    const result = filterAnimeDisplayItems({
      displayList: grouped.displayList,
      groupMap: grouped.groupMap,
      state: { ...baseState, filter: 'completed' },
      titleLang: 'original',
    });

    expect(result.map((item) => item.id)).toEqual(['s2']);
  });

  it('searches alternative titles and keeps genre list stable', () => {
    const item = anime({
      id: 'frieren',
      title: 'Sousou no Frieren',
      genre: 'Fantasy, Drama',
      alternative_titles: JSON.stringify({ title_english: 'Frieren: Beyond Journey End' }),
    });
    const grouped = buildGroupMap([item]);

    const result = filterAnimeDisplayItems({
      displayList: grouped.displayList,
      groupMap: grouped.groupMap,
      state: { ...baseState, debouncedSearch: 'journey' },
      titleLang: 'original',
    });

    expect(result).toHaveLength(1);
    expect(getUsedAnimeGenres([item])).toEqual(['Drama', 'Fantasy']);
  });

  it('builds watched payload with timestamp only for watched status', () => {
    expect(buildWatchStatusPayload('watching')).toEqual({
      watch_status: 'watching',
      watched_at: null,
    });
    expect(buildWatchStatusPayload('watched').watched_at).toEqual(expect.any(String));
  });
});
