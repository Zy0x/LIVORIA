/**
 * alternativeTitlesSearch.ts — LIVORIA
 *
 * Utility untuk pencarian anime/donghua menggunakan alternative_titles
 * yang tersimpan di database lokal.
 *
 * Fitur:
 * - Pencarian fuzzy menggunakan semua variasi nama
 * - Tidak perlu fetch ulang — pakai data dari Supabase
 * - Mendukung: romaji, native (kanji/hanzi), english, indonesian, synonyms
 */

import { deserializeAlternativeTitles, type AlternativeTitles } from '@/hooks/useAlternativeTitles';

export interface SearchableItem {
  id: string;
  title: string;
  alternative_titles?: string | null;
  [key: string]: any;
}

/**
 * Ekstrak semua string yang bisa dicari dari item
 */
export function extractSearchableStrings(item: SearchableItem): string[] {
  const strings: string[] = [item.title.toLowerCase()];

  if (!item.alternative_titles) return strings;

  const altTitles = deserializeAlternativeTitles(item.alternative_titles);
  if (!altTitles) return strings;

  const fields: (keyof AlternativeTitles)[] = [
    'title_english',
    'title_romaji',
    'title_native',
    'title_indonesian',
    'title_mal',
    'title_anilist',
    'stored_title',
  ];

  for (const field of fields) {
    const val = altTitles[field];
    if (typeof val === 'string' && val.trim()) {
      strings.push(val.toLowerCase());
    }
  }

  // Synonyms
  if (Array.isArray(altTitles.synonyms)) {
    for (const syn of altTitles.synonyms) {
      if (syn?.trim()) strings.push(syn.toLowerCase());
    }
  }

  // Deduplicate
  return [...new Set(strings)];
}

/**
 * Normalisasi string untuk pencarian
 * - lowercase, strip tone marks, strip tanda baca berlebih
 */
function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip tone marks (pinyin, dll)
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Cek apakah item cocok dengan query
 */
export function itemMatchesQuery(item: SearchableItem, query: string): boolean {
  if (!query.trim()) return true;

  const normalizedQuery = normalizeQuery(query);
  const searchableStrings = extractSearchableStrings(item);

  for (const str of searchableStrings) {
    const normalizedStr = normalizeQuery(str);
    if (normalizedStr.includes(normalizedQuery)) return true;
  }

  return false;
}

/**
 * Filter items berdasarkan query, menggunakan alternative_titles
 */
export function filterItemsByQuery<T extends SearchableItem>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items;
  return items.filter(item => itemMatchesQuery(item, query));
}

/**
 * Hitung relevance score untuk sorting hasil pencarian
 * Score lebih tinggi = lebih relevan
 */
export function getRelevanceScore(item: SearchableItem, query: string): number {
  const normalizedQuery = normalizeQuery(query);
  const searchableStrings = extractSearchableStrings(item);

  let score = 0;

  for (let i = 0; i < searchableStrings.length; i++) {
    const str = normalizeQuery(searchableStrings[i]);

    if (str === normalizedQuery) {
      // Exact match — tertinggi, prioritas berdasarkan posisi field
      score += 100 - i;
    } else if (str.startsWith(normalizedQuery)) {
      // Starts with
      score += 50 - i;
    } else if (str.includes(normalizedQuery)) {
      // Contains
      score += 20 - Math.min(i, 15);
    }
  }

  return score;
}

/**
 * Filter + sort items berdasarkan relevansi query
 */
export function searchItems<T extends SearchableItem>(
  items: T[],
  query: string
): T[] {
  if (!query.trim()) return items;

  const matched = items.filter(item => itemMatchesQuery(item, query));

  // Sort by relevance score (descending)
  return matched.sort((a, b) => {
    const scoreA = getRelevanceScore(a, query);
    const scoreB = getRelevanceScore(b, query);
    return scoreB - scoreA;
  });
}