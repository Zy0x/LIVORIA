/**
 * useAnimeSearch.ts
 * 
 * Hook untuk pencarian anime/donghua di:
 * - MAL via Jikan API v4 (https://api.jikan.moe/v4) — tidak butuh API key
 * - AniList GraphQL API (https://graphql.anilist.co) — tidak butuh API key
 * 
 * Fitur:
 * - Debounce 600ms untuk mengurangi frekuensi request
 * - In-memory cache per session (hindari request duplikat)
 * - Auto-fill: title, studio, tahun rilis, MAL URL, AniList URL
 * - Graceful fallback jika salah satu API down
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AnimeSearchResult {
  mal_id?: number;
  anilist_id?: number;
  title: string;
  title_japanese?: string;
  cover_url?: string;
  year?: number;
  studios?: string;           // studio utama, join dengan ", "
  mal_url?: string;
  anilist_url?: string;
  episodes?: number;
  status?: string;
  synopsis?: string;
  score?: number;
  source?: string;            // Manga, Light Novel, Original, dll
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
const searchCache = new Map<string, AnimeSearchResult[]>();

// ─── Jikan API (MAL) ─────────────────────────────────────────────────────────
async function searchJikan(query: string): Promise<AnimeSearchResult[]> {
  const cacheKey = `jikan:${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  const res = await fetch(
    `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=8&sfw=true`,
    { signal: AbortSignal.timeout(5000) }
  );
  if (!res.ok) throw new Error(`Jikan error: ${res.status}`);
  const json = await res.json();

  const results: AnimeSearchResult[] = (json.data || []).map((item: any) => ({
    mal_id: item.mal_id,
    title: item.title_english || item.title,
    title_japanese: item.title_japanese,
    cover_url: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
    year: item.year || item.aired?.prop?.from?.year,
    studios: item.studios?.map((s: any) => s.name).join(', ') || '',
    mal_url: item.url,
    episodes: item.episodes,
    status: item.status,
    synopsis: item.synopsis,
    score: item.score,
    source: item.source,
  }));

  searchCache.set(cacheKey, results);
  return results;
}

// ─── AniList GraphQL API ──────────────────────────────────────────────────────
async function searchAniList(query: string): Promise<AnimeSearchResult[]> {
  const cacheKey = `anilist:${query.toLowerCase()}`;
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)!;

  const gql = `
    query ($search: String) {
      Page(page: 1, perPage: 8) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          startDate { year }
          studios(isMain: true) { nodes { name } }
          siteUrl
          episodes
          status
          description(asHtml: false)
          averageScore
          source
        }
      }
    }
  `;

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { search: query } }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();

  const results: AnimeSearchResult[] = (json.data?.Page?.media || []).map((item: any) => ({
    anilist_id: item.id,
    title: item.title.english || item.title.romaji,
    title_japanese: item.title.native,
    cover_url: item.coverImage?.extraLarge || item.coverImage?.large,
    year: item.startDate?.year,
    studios: item.studios?.nodes?.map((s: any) => s.name).join(', ') || '',
    anilist_url: item.siteUrl,
    episodes: item.episodes,
    status: item.status,
    synopsis: item.description?.replace(/<[^>]*>/g, '').slice(0, 300),
    score: item.averageScore ? item.averageScore / 10 : undefined,
    source: item.source,
  }));

  searchCache.set(cacheKey, results);
  return results;
}

// ─── Merge results: gabungkan MAL + AniList by title similarity ───────────────
function mergeResults(
  jikanResults: AnimeSearchResult[],
  anilistResults: AnimeSearchResult[]
): AnimeSearchResult[] {
  const merged: AnimeSearchResult[] = [...jikanResults];

  for (const al of anilistResults) {
    const alTitle = al.title.toLowerCase();
    const existing = merged.find(j => {
      const jTitle = j.title.toLowerCase();
      // Cukup mirip jika salah satu mengandung yang lain atau edit distance kecil
      return jTitle === alTitle || jTitle.includes(alTitle.slice(0, 10)) || alTitle.includes(jTitle.slice(0, 10));
    });

    if (existing) {
      // Enrich existing dengan data AniList
      existing.anilist_id = al.anilist_id;
      existing.anilist_url = al.anilist_url;
      if (!existing.year && al.year) existing.year = al.year;
      if (!existing.studios && al.studios) existing.studios = al.studios;
      if (!existing.cover_url && al.cover_url) existing.cover_url = al.cover_url;
    } else {
      // Tambah sebagai entri baru jika tidak ada di MAL
      merged.push(al);
    }
  }

  return merged.slice(0, 8);
}

// ─── Main hook ────────────────────────────────────────────────────────────────
export interface UseAnimeSearchOptions {
  debounceMs?: number;
  minChars?: number;
}

export function useAnimeSearch(options: UseAnimeSearchOptions = {}) {
  const { debounceMs = 600, minChars = 3 } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jikanOk, setJikanOk] = useState(true);
  const [anilistOk, setAnilistOk] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((q: string) => {
    setQuery(q);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!q.trim() || q.length < minChars) {
      setResults([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      let jikanResults: AnimeSearchResult[] = [];
      let anilistResults: AnimeSearchResult[] = [];

      // Jalankan paralel, handle error masing-masing
      const [jikanResult, anilistResult] = await Promise.allSettled([
        searchJikan(q),
        searchAniList(q),
      ]);

      if (jikanResult.status === 'fulfilled') {
        jikanResults = jikanResult.value;
        setJikanOk(true);
      } else {
        setJikanOk(false);
      }

      if (anilistResult.status === 'fulfilled') {
        anilistResults = anilistResult.value;
        setAnilistOk(true);
      } else {
        setAnilistOk(false);
      }

      if (jikanResults.length === 0 && anilistResults.length === 0) {
        setError('Tidak ada hasil ditemukan atau API sedang tidak tersedia.');
        setResults([]);
      } else {
        setResults(mergeResults(jikanResults, anilistResults));
        setError(null);
      }

      setIsSearching(false);
    }, debounceMs);
  }, [debounceMs, minChars]);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    query,
    results,
    isSearching,
    error,
    jikanOk,
    anilistOk,
    search,
    clearResults,
  };
}