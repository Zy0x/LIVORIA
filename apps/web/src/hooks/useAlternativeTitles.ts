/**
 * useAlternativeTitles.ts
 *
 * Semua tugas AI untuk enrichment dan translation lewat Supabase Edge Functions.
 * Client tidak lagi memanggil provider AI secara langsung.
 */

export interface AlternativeTitles {
  stored_title?: string;
  title_romaji?: string;
  title_native?: string;
  title_english?: string;
  title_indonesian?: string;
  title_mal?: string;
  title_anilist?: string;
  synonyms?: string[];
  _status?: 'idle' | 'loading' | 'done' | 'error';
}

// Cache
const altTitleCache = new Map<string, { data: AlternativeTitles; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000;

function getCached(key: string): AlternativeTitles | null {
  const entry = altTitleCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { altTitleCache.delete(key); return null; }
  return entry.data;
}

function setCached(key: string, data: AlternativeTitles): void {
  altTitleCache.set(key, { data, ts: Date.now() });
}

function norm(s?: string | null): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// Critical: extract season/part information from a title.
export interface SeasonInfo {
  season: number | null;
  part: number | null;
  cour: number | null;
}

export function extractSeasonInfo(title: string): SeasonInfo {
  const t = title;
  let season: number | null = null;
  let part: number | null = null;
  let cour: number | null = null;

  const seasonNumMatch = t.match(/\bseason\s+(\d+)\b/i) || t.match(/\bS(\d+)\b(?!\s*eason)/i);
  if (seasonNumMatch) season = parseInt(seasonNumMatch[1], 10);

  if (!season) {
    const ordinalMatch = t.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i);
    if (ordinalMatch) season = parseInt(ordinalMatch[1], 10);
  }

  if (!season) {
    const romanMap: Record<string, number> = { 'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8 };
    const romanMatch = t.match(/\s+(II|III|IV|VI|VII|VIII)(?:\s|$)/i);
    if (romanMatch) season = romanMap[romanMatch[1].toUpperCase()] ?? null;
  }

  if (!season) {
    const jpMatch = t.match(/\u7b2c(\d+)\u671f/);
    if (jpMatch) season = parseInt(jpMatch[1], 10);
  }

  const partMatch = t.match(/\bpart\s*(\d+)\b/i) || t.match(/\bpart\s+(II|III|IV)\b/i);
  if (partMatch) {
    const v = partMatch[1];
    const romanPartMap: Record<string, number> = { 'II': 2, 'III': 3, 'IV': 4 };
    part = romanPartMap[v.toUpperCase()] ?? parseInt(v, 10);
    if (isNaN(part)) part = null;
  }

  const courMatch = t.match(/\bcour\s+(\d+)\b/i) || t.match(/\b(\d+)(?:st|nd|rd|th)\s+cour\b/i);
  if (courMatch) cour = parseInt(courMatch[1], 10);

  if (!cour) {
    const jpCourMatch = t.match(/\u7b2c(\d+)\u30af\u30fc\u30eb/);
    if (jpCourMatch) cour = parseInt(jpCourMatch[1], 10);
  }

  return { season, part, cour };
}

function extractBaseTitle(title: string): string {
  return title
    .replace(/\s+\d+(?:st|nd|rd|th)\s+season\b.*/gi, '')
    .replace(/\s+season\s+\d+.*/gi, '')
    .replace(/\s+s\d+\b.*/i, '')
    .replace(/\s+part\s*\d+.*/gi, '')
    .replace(/\s+cour\s+\d+.*/gi, '')
    .replace(/\s+(?:II|III|IV|VI|VII|VIII)(?:\s|$).*/i, '')
    .replace(/\s+\u7b2c\d+\u671f.*/g, '')
    .replace(/\s+\u7b2c\d+\u30af\u30fc\u30eb.*/g, '')
    .replace(/:\s*.+$/, '')
    .trim();
}

function tokenSimilarity(a: string, b: string): number {
  const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'to', 'and', 'season', 'part', 'cour', 'nd', 'rd', 'st', 'th', 'final']);
  const tokenize = (s: string): Set<string> => {
    const tokens = s.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(t => t.length > 1 && !stopWords.has(t));
    return new Set(tokens);
  };
  const tokA = tokenize(a);
  const tokB = tokenize(b);
  if (tokA.size === 0 || tokB.size === 0) return 0;
  let intersection = 0;
  for (const t of tokA) if (tokB.has(t)) intersection++;
  const union = new Set([...tokA, ...tokB]).size;
  return union === 0 ? 0 : intersection / union;
}

function pickBestMatchingCandidate(candidates: (string | undefined | null)[], storedTitle: string): string {
  const validCandidates = candidates.filter((c): c is string => !!(c && c.trim()));
  if (validCandidates.length === 0) return '';
  const storedInfo = extractSeasonInfo(storedTitle);
  const storedBase = extractBaseTitle(storedTitle);
  const scored = validCandidates.map(candidate => {
    const candidateInfo = extractSeasonInfo(candidate);
    const candidateBase = extractBaseTitle(candidate);
    const baseSim = tokenSimilarity(storedBase, candidateBase);
    let score = baseSim;
    if (storedInfo.season !== null && candidateInfo.season !== null) {
      if (storedInfo.season === candidateInfo.season) score += 0.5;
      else score -= 0.4;
    }
    if (storedInfo.part !== null && candidateInfo.part !== null) {
      if (storedInfo.part === candidateInfo.part) score += 0.2;
      else score -= 0.3;
    }
    return { candidate, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

function buildCorrectedTitle(apiTitle: string, storedTitle: string): string {
  const storedInfo = extractSeasonInfo(storedTitle);
  const apiInfo = extractSeasonInfo(apiTitle);
  const apiBase = extractBaseTitle(apiTitle);
  if (storedInfo.season === null && storedInfo.part === null && storedInfo.cour === null) return apiTitle;
  if (storedInfo.season === apiInfo.season && storedInfo.part === apiInfo.part && storedInfo.cour === apiInfo.cour) return apiTitle;
  let suffix = '';
  if (storedInfo.season !== null) {
    const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
    const ordinal = ordinals[storedInfo.season] || `${storedInfo.season}th`;
    if (/\d+(?:st|nd|rd|th)\s+season/i.test(apiTitle)) suffix += ` ${ordinal} Season`;
    else suffix += ` Season ${storedInfo.season}`;
  }
  if (storedInfo.part !== null) suffix += ` Part ${storedInfo.part}`;
  else if (storedInfo.cour !== null) suffix += ` Cour ${storedInfo.cour}`;
  return (apiBase + suffix).trim();
}

// Edge function helpers
async function callAiTitlesEdgeFunction(action: string, body: any): Promise<any> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase.functions.invoke('ai-titles', {
      body: { action, ...body },
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error(`Edge function 'ai-titles' (${action}) failed:`, err);
    return null;
  }
}

// AniList fetch
async function fetchAniListTitles(anilistId?: number | null, searchTitle?: string): Promise<Partial<AlternativeTitles>> {
  const gql = anilistId
    ? `query($id:Int){Media(id:$id,type:ANIME){title{romaji english native}synonyms}}`
    : `query($s:String){Media(search:$s,type:ANIME,sort:SEARCH_MATCH){title{romaji english native}synonyms}}`;
  const variables = anilistId ? { id: anilistId } : { s: searchTitle };
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables }),
    });
    if (!res.ok) return {};
    const json = await res.json();
    const media = json.data?.Media;
    if (!media) return {};
    return {
      title_romaji: media.title?.romaji || undefined,
      title_english: media.title?.english || undefined,
      title_native: media.title?.native || undefined,
      synonyms: (media.synonyms as string[] || []).filter((s: string) => s?.trim()),
    };
  } catch { return {}; }
}

// Jikan/MAL fetch
async function fetchJikanTitles(malId?: number | null, searchTitle?: string): Promise<Partial<AlternativeTitles>> {
  const endpoint = malId ? `https://api.jikan.moe/v4/anime/${malId}` : searchTitle ? `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTitle)}&limit=1&sfw=false` : null;
  if (!endpoint) return {};
  try {
    const res = await fetch(endpoint);
    if (!res.ok) return {};
    const json = await res.json();
    const item = malId ? json.data : json.data?.[0];
    if (!item) return {};
    const synonyms: string[] = [];
    if (Array.isArray(item.title_synonyms)) synonyms.push(...item.title_synonyms.filter(Boolean));
    if (Array.isArray(item.titles)) {
      for (const t of item.titles) if (t?.title?.trim() && !synonyms.includes(t.title)) synonyms.push(t.title);
    }
    return {
      title_romaji: item.title || undefined,
      title_english: item.title_english || undefined,
      title_native: item.title_japanese || undefined,
      title_mal: item.title || undefined,
      synonyms: [...new Set(synonyms)].filter(s => s.trim()),
    };
  } catch { return {}; }
}

function validateAndFixSeasonInTranslation(translation: string, storedTitle: string): string {
  const storedInfo = extractSeasonInfo(storedTitle);
  let fixed = translation;
  if (storedInfo.season !== null) {
    fixed = fixed.replace(/musim\s+\d+/gi, `Musim ${storedInfo.season}`).replace(/season\s+\d+/gi, `Season ${storedInfo.season}`);
    const hasSeason = /musim\s+\d+/i.test(fixed) || /season\s+\d+/i.test(fixed);
    if (!hasSeason && storedInfo.season > 1) fixed += ` Musim ${storedInfo.season}`;
  }
  if (storedInfo.part !== null) {
    fixed = fixed.replace(/bagian\s+\d+/gi, `Bagian ${storedInfo.part}`).replace(/part\s+\d+/gi, `Bagian ${storedInfo.part}`);
    const hasPart = /bagian\s+\d+/i.test(fixed) || /part\s+\d+/i.test(fixed);
    if (!hasPart && (storedInfo.part > 1 || storedInfo.season !== null)) fixed += ` Bagian ${storedInfo.part}`;
  }
  return fixed.trim();
}

function isValidIndonesianTitle(candidate: string): boolean {
  if (!candidate || candidate.trim().length === 0) return false;
  const c = candidate.trim();
  if (c.length > 200 || c.includes('"') || c.includes('{') || c.includes('[')) return false;
  if (/^(the title|this is|in indonesian|terjemahan|jawaban|note:|keep|original)/i.test(c)) return false;
  return true;
}

function deduplicateTitles(titles: AlternativeTitles): AlternativeTitles {
  const seen = new Set<string>();
  const add = (s?: string) => { const n = norm(s); if (n) seen.add(n); };
  add(titles.stored_title); add(titles.title_romaji); add(titles.title_native); add(titles.title_english); add(titles.title_indonesian); add(titles.title_mal); add(titles.title_anilist);
  const filteredSynonyms = (titles.synonyms || []).filter(s => {
    const n = norm(s);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });
  return { ...titles, synonyms: filteredSynonyms };
}

export async function fetchAlternativeTitles(params: {
  malId?: number | null;
  anilistId?: number | null;
  storedTitle?: string;
  mediaType?: 'anime' | 'donghua';
}): Promise<AlternativeTitles> {
  const { malId, anilistId, storedTitle, mediaType = 'anime' } = params;
  const cacheKey = ['alt_v6', malId || '', anilistId || '', norm(storedTitle), mediaType].join(':');
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let result: AlternativeTitles = { stored_title: storedTitle, _status: 'loading' };
  const storedSeasonInfo = storedTitle ? extractSeasonInfo(storedTitle) : { season: null, part: null, cour: null };

  const [anilistResult, jikanResult] = await Promise.allSettled([
    fetchAniListTitles(anilistId, storedTitle),
    fetchJikanTitles(malId, storedTitle),
  ]);

  const allEnglishCandidates: string[] = [];
  const allRomajiCandidates: string[] = [];
  const allNativeCandidates: string[] = [];
  let allSynonyms: string[] = [];

  if (anilistResult.status === 'fulfilled') {
    const al = anilistResult.value;
    if (al.title_english) allEnglishCandidates.push(al.title_english);
    if (al.title_romaji) allRomajiCandidates.push(al.title_romaji);
    if (al.title_native) allNativeCandidates.push(al.title_native);
    allSynonyms = [...allSynonyms, ...(al.synonyms || [])];
  }

  if (jikanResult.status === 'fulfilled') {
    const jk = jikanResult.value;
    if (jk.title_english) allEnglishCandidates.push(jk.title_english);
    if (jk.title_romaji) allRomajiCandidates.push(jk.title_romaji);
    if (jk.title_native) allNativeCandidates.push(jk.title_native);
    if (jk.title_mal) result.title_mal = jk.title_mal;
    allSynonyms = [...allSynonyms, ...(jk.synonyms || [])];
  }

  if (storedTitle && storedTitle.trim()) {
    if (allEnglishCandidates.length > 0) {
      const bestEn = pickBestMatchingCandidate(allEnglishCandidates, storedTitle);
      if (bestEn) result.title_english = buildCorrectedTitle(bestEn, storedTitle);
    }
    if (allRomajiCandidates.length > 0) {
      const bestRomaji = pickBestMatchingCandidate(allRomajiCandidates, storedTitle);
      if (bestRomaji) result.title_romaji = buildCorrectedTitle(bestRomaji, storedTitle);
    }
    if (allNativeCandidates.length > 0) {
      const bestNative = pickBestMatchingCandidate(allNativeCandidates, storedTitle);
      if (bestNative) result.title_native = buildCorrectedTitle(bestNative, storedTitle);
    }
  } else {
    result.title_english = allEnglishCandidates[0];
    result.title_romaji = allRomajiCandidates[0];
    result.title_native = allNativeCandidates[0];
  }

  result.synonyms = [...new Set(allSynonyms)].filter(s => s?.trim());

  // STEP 3: Enrich and translate via Edge Function
  const needsEnrich = !result.title_english || !result.title_romaji || !result.title_native;
  if (needsEnrich) {
    const enrichData = await callAiTitlesEdgeFunction('enrich_titles', {
      titles: {
        stored_title: result.stored_title,
        title_english: result.title_english,
        title_romaji: result.title_romaji,
        title_native: result.title_native,
        season: storedSeasonInfo.season,
        part: storedSeasonInfo.part,
      },
      mediaType,
    });
    if (enrichData) {
      if (!result.title_english && enrichData.title_english) result.title_english = enrichData.title_english;
      if (!result.title_romaji && enrichData.title_romaji) result.title_romaji = enrichData.title_romaji;
      if (!result.title_native && enrichData.title_native) result.title_native = enrichData.title_native;
    }
  }

  if (!result.title_indonesian) {
    const idData = await callAiTitlesEdgeFunction('translate_indonesian', {
      titles: {
        stored_title: result.stored_title,
        title_english: result.title_english,
        title_romaji: result.title_romaji,
        title_native: result.title_native,
        season: storedSeasonInfo.season,
        part: storedSeasonInfo.part,
      },
      mediaType,
    });
    if (idData?.title_indonesian && isValidIndonesianTitle(idData.title_indonesian)) {
      result.title_indonesian = storedTitle ? validateAndFixSeasonInTranslation(idData.title_indonesian, storedTitle) : idData.title_indonesian;
    }
  }

  // Final correction
  if (storedTitle && (storedSeasonInfo.season !== null || storedSeasonInfo.part !== null)) {
    if (result.title_english) result.title_english = buildCorrectedTitle(result.title_english, storedTitle);
    if (result.title_romaji) result.title_romaji = buildCorrectedTitle(result.title_romaji, storedTitle);
    if (result.title_native) result.title_native = buildCorrectedTitle(result.title_native, storedTitle);
    if (result.title_indonesian) result.title_indonesian = validateAndFixSeasonInTranslation(result.title_indonesian, storedTitle);
  }

  if (!result.title_english) result.title_english = result.title_romaji || storedTitle || '';
  if (!result.title_romaji) result.title_romaji = result.title_english || storedTitle || '';

  result._status = 'done';
  result = deduplicateTitles(result);
  setCached(cacheKey, result);
  return result;
}

export function serializeAlternativeTitles(titles: AlternativeTitles): string {
  const { _status, ...rest } = titles;
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) if (v !== undefined && v !== null && v !== '') clean[k] = v;
  return JSON.stringify(clean);
}

export function deserializeAlternativeTitles(json?: string | null): AlternativeTitles | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as AlternativeTitles;
  } catch { return null; }
}

export function getTitleLanguageLabel(mediaType: 'anime' | 'donghua'): { native: string; romaji: string; } {
  if (mediaType === 'donghua') return { native: 'Hanzi (\u4e2d\u6587)', romaji: 'Pinyin' };
  return { native: 'Kanji (\u65e5\u672c\u8a9e)', romaji: 'Romaji' };
}

export interface TitleDisplayItem { label: string; value: string; badge: string; badgeColor: string; }

export function buildTitleDisplayList(titles: AlternativeTitles, mediaType: 'anime' | 'donghua'): TitleDisplayItem[] {
  const langLabels = getTitleLanguageLabel(mediaType);
  const items: TitleDisplayItem[] = [];
  if (titles.title_english) items.push({ label: 'Inggris', value: titles.title_english, badge: 'EN', badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' });
  if (titles.title_romaji) items.push({ label: langLabels.romaji, value: titles.title_romaji, badge: mediaType === 'donghua' ? 'PY' : 'JP', badgeColor: 'bg-red-500/15 text-red-600 dark:text-red-400' });
  if (titles.title_native) items.push({ label: langLabels.native, value: titles.title_native, badge: mediaType === 'donghua' ? 'ZH' : 'JA', badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' });
  if (titles.title_indonesian) items.push({ label: 'Indonesia', value: titles.title_indonesian, badge: 'ID', badgeColor: 'bg-green-500/15 text-green-600 dark:text-green-400' });
  if (titles.title_mal && titles.title_mal !== titles.title_english && titles.title_mal !== titles.title_romaji) items.push({ label: 'MyAnimeList', value: titles.title_mal, badge: 'MAL', badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300' });
  if (titles.title_anilist && titles.title_anilist !== titles.title_english && titles.title_anilist !== titles.title_romaji) items.push({ label: 'AniList', value: titles.title_anilist, badge: 'AL', badgeColor: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' });
  return items;
}
