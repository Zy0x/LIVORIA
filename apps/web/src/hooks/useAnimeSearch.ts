/**
 * useAnimeSearch.ts
 *
 * Hook untuk pencarian anime/donghua di:
 * - MAL via Jikan API v4 (https://api.jikan.moe/v4) — tidak butuh API key
 * - AniList GraphQL API (https://graphql.anilist.co) — tidak butuh API key
 *
 * Terjemahan sinopsis menggunakan MyMemory API (gratis) -> Supabase Edge Function (Groq/Gemini) fallback.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface AnimeSearchResult {
  mal_id?: number;
  anilist_id?: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  title_indonesian?: string;
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
  duration_minutes?: number | null;
  aired?: string;
  season?: string;
  season_year?: number;
  is_movie?: boolean;
  media_type?: string;
}

interface NamedApiNode {
  name?: string;
}

interface JikanAnimeItem {
  aired?: { prop?: { from?: { year?: number } }; string?: string };
  duration?: string;
  episodes?: number | null;
  genres?: NamedApiNode[];
  images?: { jpg?: { image_url?: string; large_image_url?: string } };
  mal_id?: number;
  rating?: string;
  score?: number | null;
  season?: string;
  source?: string;
  status?: string;
  studios?: NamedApiNode[];
  synopsis?: string | null;
  themes?: NamedApiNode[];
  title?: string;
  title_english?: string | null;
  title_japanese?: string | null;
  type?: string;
  url?: string;
  year?: number | null;
}

interface AniListMediaItem {
  averageScore?: number | null;
  coverImage?: { extraLarge?: string; large?: string };
  description?: string | null;
  duration?: number | null;
  episodes?: number | null;
  format?: string | null;
  genres?: string[];
  id?: number;
  season?: string | null;
  seasonYear?: number | null;
  siteUrl?: string;
  source?: string;
  startDate?: { year?: number | null };
  status?: string;
  studios?: { nodes?: NamedApiNode[] };
  title?: { english?: string | null; native?: string | null; romaji?: string | null };
}

interface MyMemoryMatch {
  translation?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const json = await res.json() as { data?: JikanAnimeItem[] };

  const results: AnimeSearchResult[] = (json.data || []).map((item) => {
    const genreNames: string[] = [
      ...(item.genres || []).map((g) => g.name),
      ...(item.themes || []).map((t) => t.name),
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
      studios: item.studios?.map((s) => s.name).join(', ') || '',
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
  const json = await res.json() as { data?: { Page?: { media?: AniListMediaItem[] } } };

  const results: AnimeSearchResult[] = (json.data?.Page?.media || []).map((item) => {
    const synopsisRaw = item.description?.replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim() || '';
    const format: string = item.format || '';
    const isMovie = detectIsMovie(format);
    const durationMin = item.duration ? Number(item.duration) : null;

    return {
      anilist_id: item.id,
      title: item.title?.english || item.title?.romaji || '',
      title_english: item.title?.english || undefined,
      title_japanese: item.title?.native || undefined,
      cover_url: item.coverImage?.extraLarge || item.coverImage?.large,
      year: item.startDate?.year,
      studios: item.studios?.nodes?.map((s) => s.name).join(', ') || '',
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

  // 1. Try MyMemory (Free, no key)
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
          const matches = data.matches as MyMemoryMatch[] | undefined;
          if (matches && matches.length > 0) {
            const bestMatch = matches.find((m) => m.translation && m.translation.toLowerCase() !== chunk.toLowerCase());
            translatedChunks.push(bestMatch ? bestMatch.translation : chunk);
          } else {
            translatedChunks.push(chunk);
          }
        }
      } else {
        throw new Error('MyMemory: no translation');
      }
      if (chunks.length > 1) await new Promise(r => setTimeout(r, 300));
    }

    const result = translatedChunks.join(' ');
    translationCache.set(cacheKey, result);
    return result;
  } catch (err) {
    logger.warn('[translate] MyMemory gagal, trying Edge Function fallback:', err);
  }

  // 2. Fallback: use ai-titles edge function (uses Groq/Gemini)
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data, error } = await supabase.functions.invoke('ai-titles', {
      body: { action: 'translate_synopsis', text },
    });
    if (error) throw error;
    if (data?.translated) {
      translationCache.set(cacheKey, data.translated);
      return data.translated;
    }
  } catch (err) {
    logger.error('[translate] Edge Function fallback failed:', err);
  }

  return text; // Final fallback: original text
}

function splitIntoChunks(text: string, maxLength: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length <= maxLength) {
      currentChunk += sentence;
    } else {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = sentence;
    }
  }
  if (currentChunk) chunks.push(currentChunk.trim());
  return chunks;
}

// ─── React Hook ───────────────────────────────────────────────────────────────

interface UseAnimeSearchOptions {
  debounceMs?: number;
  minChars?: number;
}

export function useAnimeSearch(options: UseAnimeSearchOptions = {}) {
  const { debounceMs = 500, minChars = 3 } = options;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jikanOk, setJikanOk] = useState(false);
  const [anilistOk, setAnilistOk] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < minChars) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    setError(null);
    setJikanOk(false);
    setAnilistOk(false);

    try {
      const [jikanResults, anilistResults] = await Promise.allSettled([
        searchJikan(searchQuery),
        searchAniList(searchQuery),
      ]);

      const mergedMap = new Map<string, AnimeSearchResult>();

      if (jikanResults.status === 'fulfilled') {
        setJikanOk(true);
        jikanResults.value.forEach(item => {
          const key = item.title.toLowerCase();
          mergedMap.set(key, item);
        });
      }

      if (anilistResults.status === 'fulfilled') {
        setAnilistOk(true);
        anilistResults.value.forEach(item => {
          const key = item.title.toLowerCase();
          const existing = mergedMap.get(key);
          if (existing) {
            mergedMap.set(key, { ...existing, ...item, mal_id: existing.mal_id, anilist_id: item.anilist_id });
          } else {
            mergedMap.set(key, item);
          }
        });
      }

      const finalResults = Array.from(mergedMap.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
      setResults(finalResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencari anime');
    } finally {
      setIsSearching(false);
    }
  }, [minChars]);

  const search = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setError(null);
  }, []);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query && query.trim().length >= minChars) {
      searchTimeout.current = setTimeout(() => performSearch(query), debounceMs);
    } else {
      setResults([]);
    }
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [query, performSearch, debounceMs, minChars]);

  return { query, setQuery, results, loading: isSearching, error, isSearching, jikanOk, anilistOk, search, clearResults };
}
