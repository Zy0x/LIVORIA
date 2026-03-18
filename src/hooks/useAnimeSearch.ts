/**
 * useAnimeSearch.ts
 *
 * Hook untuk pencarian anime/donghua di:
 * - MAL via Jikan API v4 (https://api.jikan.moe/v4) — tidak butuh API key
 * - AniList GraphQL API (https://graphql.anilist.co) — tidak butuh API key
 *
 * Auto-detect Movie:
 * - Jikan: type === 'Movie'
 * - AniList: format === 'MOVIE'
 *
 * Terjemahan sinopsis menggunakan MyMemory API (gratis) → Groq fallback → original.
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
  /** Duration in minutes (parsed from Jikan duration string or AniList duration field) */
  duration_minutes?: number | null;
  aired?: string;
  season?: string;
  season_year?: number;
  /** True jika MAL type = 'Movie' atau AniList format = 'MOVIE' */
  is_movie?: boolean;
  /** Raw type/format string dari API (cth: 'TV', 'Movie', 'OVA', 'MOVIE', 'ONA') */
  media_type?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse durasi dari string Jikan (cth: "1 hr. 45 min." → 105) */
function parseDurationMinutes(durationStr?: string): number | null {
  if (!durationStr) return null;
  const lower = durationStr.toLowerCase();
  let total = 0;
  const hrMatch = lower.match(/(\d+)\s*hr/);
  const minMatch = lower.match(/(\d+)\s*min/);
  if (hrMatch) total += parseInt(hrMatch[1], 10) * 60;
  if (minMatch) total += parseInt(minMatch[1], 10);
  return total > 0 ? total : null;
}

/** Deteksi apakah type/format string mengindikasikan movie */
function detectIsMovie(type?: string): boolean {
  if (!type) return false;
  const t = type.toUpperCase();
  return t === 'MOVIE' || t === 'FILM';
}

// ─── Cache ────────────────────────────────────────────────────────────────────
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
    const mediaType: string = item.type || '';
    const isMovie = detectIsMovie(mediaType);
    const durationMin = parseDurationMinutes(item.duration);

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
      duration_minutes: durationMin,
      aired: item.aired?.string,
      season: item.season,
      season_year: item.year,
      is_movie: isMovie,
      media_type: mediaType,
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
          format
          duration
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
    const format: string = item.format || '';
    const isMovie = detectIsMovie(format);
    // AniList duration is already in minutes per episode (for movies = total duration)
    const durationMin = item.duration ? Number(item.duration) : null;

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
      is_movie: isMovie,
      media_type: format,
      duration: item.duration ? `${item.duration} min` : undefined,
      duration_minutes: durationMin,
    };
  });

  searchCache.set(cacheKey, results);
  return results;
}

// ─── Translation cache ────────────────────────────────────────────────────────
const translationCache = new Map<string, string>();

export async function translateToIndonesian(text: string): Promise<string> {
  if (!text || text.trim().length === 0) return '';

  const cacheKey = text.slice(0, 200);
  if (translationCache.has(cacheKey)) return translationCache.get(cacheKey)!;

  try {
    const chunks = splitIntoChunks(text, 480);
    const translatedChunks: string[] = [];

    for (const chunk of chunks) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|id`;
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`MyMemory error: ${res.status}`);
      const data = await res.json();

      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        if (translated.toLowerCase() !== chunk.toLowerCase()) {
          translatedChunks.push(translated);
        } else {
          const matches = data.matches;
          if (matches && matches.length > 0) {
            const bestMatch = matches.find((m: any) => m.translation && m.translation.toLowerCase() !== chunk.toLowerCase());
            translatedChunks.push(bestMatch ? bestMatch.translation : chunk);
          } else {
            translatedChunks.push(chunk);
          }
        }
      } else {
        throw new Error('MyMemory: no translation');
      }
      if (chunks.length > 1) await sleep(300);
    }

    const result = translatedChunks.join(' ');
    translationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[translate] MyMemory gagal:', err);
  }

  const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (GROQ_API_KEY) {
    const GROQ_MODELS = [
      'llama-3.3-70b-versatile',
      'llama3-8b-8192',
      'gemma2-9b-it',
    ];

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
                  'Kamu adalah penerjemah profesional. Terjemahkan teks berikut ke Bahasa Indonesia yang natural, mudah dipahami, dan sesuai konteks anime/donghua. Berikan HANYA terjemahannya saja tanpa penjelasan tambahan.',
              },
              { role: 'user', content: text },
            ],
          }),
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const translated = data.choices?.[0]?.message?.content?.trim() || text;
        translationCache.set(cacheKey, translated);
        return translated;
      } catch (err) {
        console.warn(`[translate] Groq model ${model} error:`, err);
      }
    }
  }

  console.warn('[translate] Semua strategi gagal. Menggunakan teks asli.');
  return text;
}

function splitIntoChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= maxLen) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) chunks.push(current);
      if (sentence.length > maxLen) {
        const subParts = sentence.split(/,\s*/);
        let sub = '';
        for (const part of subParts) {
          if ((sub + ', ' + part).length <= maxLen) {
            sub = sub ? sub + ', ' + part : part;
          } else {
            if (sub) chunks.push(sub);
            sub = part;
          }
        }
        if (sub) current = sub;
        else current = '';
      } else {
        current = sentence;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Merge results ────────────────────────────────────────────────────────────
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

      // Movie detection: either source marks it as movie = it's a movie
      if (al.is_movie) existing.is_movie = true;
      if (!existing.is_movie && existing.is_movie !== true) {
        existing.is_movie = existing.is_movie || false;
      }

      // Duration: AniList duration_minutes for movies is total; Jikan is per episode
      if (!existing.duration_minutes && al.duration_minutes) {
        existing.duration_minutes = al.duration_minutes;
      }
      if (!existing.media_type && al.media_type) {
        existing.media_type = al.media_type;
      }
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