/**
 * useAnimeSearch.ts
 *
 * Hook untuk pencarian anime/donghua di:
 * - MAL via Jikan API v4 (https://api.jikan.moe/v4) — tidak butuh API key
 * - AniList GraphQL API (https://graphql.anilist.co) — tidak butuh API key
 *
 * Terjemahan sinopsis menggunakan Groq API langsung (tanpa Edge Function)
 * karena Edge Function /translate-synopsis mengembalikan 401.
 *
 * Fallback: jika GROQ API gagal, gunakan sinopsis bahasa Inggris asli.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface AnimeSearchResult {
  mal_id?: number;
  anilist_id?: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  cover_url?: string;
  year?: number;
  studios?: string;
  mal_url?: string;
  anilist_url?: string;
  episodes?: number;
  status?: string;
  synopsis?: string;
  synopsis_en?: string;
  score?: number;
  source?: string;
  genres?: string[];
  rating?: string;
  duration?: string;
  aired?: string;
  // Season/cour info from MAL
  season?: string;      // e.g. "summer", "winter"
  season_year?: number; // e.g. 2024
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

  const results: AnimeSearchResult[] = (json.data || []).map((item: any) => {
    const genreNames: string[] = [
      ...(item.genres || []).map((g: any) => g.name),
      ...(item.themes || []).map((t: any) => t.name),
    ].filter(Boolean);

    const synopsisRaw = item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim() || '';

    return {
      mal_id: item.mal_id,
      title: item.title_english || item.title,
      title_english: item.title_english,
      title_japanese: item.title_japanese,
      cover_url: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url,
      year: item.year || item.aired?.prop?.from?.year,
      studios: item.studios?.map((s: any) => s.name).join(', ') || '',
      mal_url: item.url,
      episodes: item.episodes || undefined,
      status: item.status,
      synopsis: synopsisRaw,
      synopsis_en: synopsisRaw,
      score: item.score,
      source: item.source,
      genres: genreNames,
      rating: item.rating,
      duration: item.duration,
      aired: item.aired?.string,
      season: item.season,
      season_year: item.year,
    };
  });

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
          genres
          season
          seasonYear
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

  const results: AnimeSearchResult[] = (json.data?.Page?.media || []).map((item: any) => {
    const synopsisRaw = item.description?.replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim() || '';
    return {
      anilist_id: item.id,
      title: item.title.english || item.title.romaji,
      title_english: item.title.english,
      title_japanese: item.title.native,
      cover_url: item.coverImage?.extraLarge || item.coverImage?.large,
      year: item.startDate?.year,
      studios: item.studios?.nodes?.map((s: any) => s.name).join(', ') || '',
      anilist_url: item.siteUrl,
      episodes: item.episodes || undefined,
      status: item.status,
      synopsis: synopsisRaw,
      synopsis_en: synopsisRaw,
      score: item.averageScore ? item.averageScore / 10 : undefined,
      source: item.source,
      genres: item.genres || [],
      season: item.season?.toLowerCase(),
      season_year: item.seasonYear,
    };
  });

  searchCache.set(cacheKey, results);
  return results;
}

// ─── Translate synopsis ke Bahasa Indonesia via Groq API langsung ─────────────
// Tidak menggunakan Edge Function karena mengembalikan 401.
// Menggunakan VITE_GROQ_API_KEY dari env, atau fallback ke teks asli.
const translationCache = new Map<string, string>();

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'gemma2-9b-it',
];

export async function translateToIndonesian(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return '';

  const cacheKey = text.slice(0, 100);
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;

  const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

  if (!GROQ_API_KEY) {
    console.warn('[translate] VITE_GROQ_API_KEY tidak ditemukan. Menggunakan teks asli.');
    return text;
  }

  // Coba setiap model secara berurutan jika ada error
  for (const model of GROQ_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content:
                'Kamu adalah penerjemah profesional. Terjemahkan teks berikut ke Bahasa Indonesia yang natural, mudah dipahami, dan sesuai konteks anime/donghua. Berikan HANYA terjemahannya saja tanpa penjelasan tambahan, tanpa tanda petik, dan tanpa awalan seperti "Terjemahan:" atau sejenisnya.',
            },
            {
              role: 'user',
              content: text,
            },
          ],
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[translate] Model ${model} gagal (${response.status}):`, errText);
        continue; // coba model berikutnya
      }

      const data = await response.json();
      const translated = data.choices?.[0]?.message?.content?.trim() || text;
      translationCache.set(cacheKey, translated);
      return translated;
    } catch (err) {
      console.warn(`[translate] Model ${model} error:`, err);
      // lanjut ke model berikutnya
    }
  }

  // Semua model gagal → gunakan teks asli
  console.warn('[translate] Semua model Groq gagal. Menggunakan teks asli.');
  return text;
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
      return (
        jTitle === alTitle ||
        jTitle.includes(alTitle.slice(0, 10)) ||
        alTitle.includes(jTitle.slice(0, 10))
      );
    });

    if (existing) {
      existing.anilist_id = al.anilist_id;
      existing.anilist_url = al.anilist_url;
      if (!existing.year && al.year) existing.year = al.year;
      if (!existing.studios && al.studios) existing.studios = al.studios;
      // Prefer AniList cover (higher resolution)
      if (al.cover_url) existing.cover_url = al.cover_url;
      if (!existing.episodes && al.episodes) existing.episodes = al.episodes;
      if (!existing.synopsis && al.synopsis) {
        existing.synopsis = al.synopsis;
        existing.synopsis_en = al.synopsis_en;
      }
      if (al.genres && al.genres.length > 0) {
        const existingGenres = existing.genres || [];
        existing.genres = Array.from(new Set([...existingGenres, ...al.genres]));
      }
      if (!existing.season && al.season) existing.season = al.season;
      if (!existing.season_year && al.season_year) existing.season_year = al.season_year;
      if (!existing.score && al.score) existing.score = al.score;
    } else {
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

  const search = useCallback(
    (q: string) => {
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

        const [jikanResult, anilistResult] = await Promise.allSettled([
          searchJikan(q),
          searchAniList(q),
        ]);

        let jikanResults: AnimeSearchResult[] = [];
        let anilistResults: AnimeSearchResult[] = [];

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
    },
    [debounceMs, minChars]
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

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