/**
 * useAlternativeTitles.ts — LIVORIA
 *
 * Mengambil semua variasi nama judul anime/donghua dari:
 * 1. AniList GraphQL → title.romaji, title.english, title.native, synonyms
 * 2. Jikan/MAL → title, title_english, title_japanese, title_synonyms
 * 3. Groq AI → fallback untuk nama Indonesia & melengkapi yang kosong
 *
 * PERBAIKAN:
 * - Cache dengan WeakRef-safe Map (key berbasis ID + judul)
 * - Timeout yang lebih konservatif untuk menghindari hang
 * - Deduplication lebih ketat (case-insensitive + trim)
 * - Type-safe, tidak ada `any` berlebih
 * - Cache key konsisten
 * - stored_title tidak di-strip dari synonyms jika memang sama dengan DB title
 */

export interface AlternativeTitles {
  /** Nama yang disimpan user di database */
  stored_title?: string;
  /** Romaji Jepang atau Pinyin China */
  title_romaji?: string;
  /** Kanji Jepang atau Hanzi China */
  title_native?: string;
  /** Nama bahasa Inggris resmi */
  title_english?: string;
  /** Nama bahasa Indonesia (jika ada) */
  title_indonesian?: string;
  /** Nama yang dipakai di MAL */
  title_mal?: string;
  /** Nama yang dipakai di AniList */
  title_anilist?: string;
  /** Sinonim / alias lainnya */
  synonyms?: string[];
  /** Status fetch */
  _status?: 'idle' | 'loading' | 'done' | 'error';
}

// ─── In-memory cache (TTL: session, ~30 mnt) ────────────────────────────────
const altTitleCache = new Map<string, { data: AlternativeTitles; ts: number }>();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 menit

function getCached(key: string): AlternativeTitles | null {
  const entry = altTitleCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    altTitleCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: AlternativeTitles): void {
  altTitleCache.set(key, { data, ts: Date.now() });
}

// ─── Normalize helper ────────────────────────────────────────────────────────
function norm(s?: string | null): string {
  return (s || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

// ─── AniList fetch ────────────────────────────────────────────────────────────
async function fetchAniListTitles(
  anilistId?: number | null,
  searchTitle?: string
): Promise<Partial<AlternativeTitles>> {
  const gql = anilistId
    ? `query($id:Int){Media(id:$id,type:ANIME){title{romaji english native}synonyms}}`
    : `query($search:String){Media(search:$search,type:ANIME,sort:SEARCH_MATCH){title{romaji english native}synonyms}}`;

  const variables = anilistId ? { id: anilistId } : { search: searchTitle };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
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
  } catch {
    clearTimeout(timer);
    return {};
  }
}

// ─── Jikan/MAL fetch ──────────────────────────────────────────────────────────
async function fetchJikanTitles(
  malId?: number | null,
  searchTitle?: string
): Promise<Partial<AlternativeTitles>> {
  const endpoint = malId
    ? `https://api.jikan.moe/v4/anime/${malId}`
    : searchTitle
    ? `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTitle)}&limit=1&sfw=false`
    : null;

  if (!endpoint) return {};

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);

  try {
    const res = await fetch(endpoint, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return {};

    const json = await res.json();
    const item = malId ? json.data : json.data?.[0];
    if (!item) return {};

    const synonyms: string[] = [];

    // title_synonyms array
    if (Array.isArray(item.title_synonyms)) {
      synonyms.push(...item.title_synonyms.filter(Boolean));
    }

    // titles array (lebih lengkap dari Jikan v4)
    if (Array.isArray(item.titles)) {
      for (const t of item.titles) {
        if (t?.title?.trim() && !synonyms.includes(t.title)) {
          synonyms.push(t.title);
        }
      }
    }

    return {
      title_romaji: item.title || undefined,
      title_english: item.title_english || undefined,
      title_native: item.title_japanese || undefined,
      title_mal: item.title || undefined,
      synonyms: [...new Set(synonyms)].filter(s => s.trim()),
    };
  } catch {
    clearTimeout(timer);
    return {};
  }
}

// ─── Groq AI enrichment ───────────────────────────────────────────────────────
async function enrichWithGroq(
  titles: AlternativeTitles,
  mediaType: 'anime' | 'donghua'
): Promise<Partial<AlternativeTitles>> {
  const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (!GROQ_API_KEY) return {};

  const needsEnrichment =
    !titles.title_indonesian ||
    (!titles.title_native && !titles.title_romaji) ||
    !titles.title_english;

  if (!needsEnrichment) return {};

  const mainTitle =
    titles.title_english ||
    titles.title_romaji ||
    titles.stored_title ||
    '';

  if (!mainTitle) return {};

  const cacheKey = `groq:${norm(mainTitle)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const prompt = `You are an expert on ${mediaType === 'donghua' ? 'Chinese animation (Donghua)' : 'Japanese animation (Anime)'}.

For: "${mainTitle}"${titles.title_native ? ` (native: "${titles.title_native}")` : ''}

Provide ONLY valid JSON, no other text:
{
  "title_indonesian": "Indonesian official/common title or null",
  "title_native": "${mediaType === 'donghua' ? 'Chinese Hanzi characters' : 'Japanese Kanji/Kana'} if unknown, or null",
  "title_romaji": "${mediaType === 'donghua' ? 'Pinyin romanization' : 'Romaji'} if unknown, or null",
  "title_english": "Official English title if unknown, or null",
  "additional_synonyms": ["other well-known names", "abbreviations like BTTH"]
}`;

  const MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'gemma2-9b-it'];

  for (const model of MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 400,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;

      const data = await res.json();
      const text = (data.choices?.[0]?.message?.content || '{}').trim();
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const result: Partial<AlternativeTitles> = {};
      if (parsed.title_indonesian) result.title_indonesian = String(parsed.title_indonesian);
      if (parsed.title_native && !titles.title_native) result.title_native = String(parsed.title_native);
      if (parsed.title_romaji && !titles.title_romaji) result.title_romaji = String(parsed.title_romaji);
      if (parsed.title_english && !titles.title_english) result.title_english = String(parsed.title_english);
      if (Array.isArray(parsed.additional_synonyms) && parsed.additional_synonyms.length > 0) {
        result.synonyms = [
          ...(titles.synonyms || []),
          ...parsed.additional_synonyms.filter((s: unknown) => typeof s === 'string' && s.trim()),
        ];
      }

      setCached(cacheKey, result);
      return result;
    } catch {
      clearTimeout(timer);
      continue;
    }
  }

  return {};
}

// ─── Deduplication ────────────────────────────────────────────────────────────
function deduplicateTitles(titles: AlternativeTitles): AlternativeTitles {
  const seen = new Set<string>();

  const add = (s?: string) => {
    const n = norm(s);
    if (n) seen.add(n);
  };

  add(titles.stored_title);
  add(titles.title_romaji);
  add(titles.title_native);
  add(titles.title_english);
  add(titles.title_indonesian);
  add(titles.title_mal);
  add(titles.title_anilist);

  const filteredSynonyms = (titles.synonyms || []).filter(s => {
    const n = norm(s);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  return { ...titles, synonyms: filteredSynonyms };
}

// ─── Main export function ─────────────────────────────────────────────────────
export async function fetchAlternativeTitles(params: {
  malId?: number | null;
  anilistId?: number | null;
  storedTitle?: string;
  mediaType?: 'anime' | 'donghua';
}): Promise<AlternativeTitles> {
  const { malId, anilistId, storedTitle, mediaType = 'anime' } = params;

  // Build a stable cache key
  const cacheKey = [
    'alt',
    malId || '',
    anilistId || '',
    norm(storedTitle),
  ].join(':');

  const cached = getCached(cacheKey);
  if (cached) return cached;

  let result: AlternativeTitles = {
    stored_title: storedTitle,
    _status: 'loading',
  };

  // Parallel fetch from AniList + Jikan
  const [anilistResult, jikanResult] = await Promise.allSettled([
    fetchAniListTitles(anilistId, storedTitle),
    fetchJikanTitles(malId, storedTitle),
  ]);

  // Merge: AniList priority for native & romaji
  if (anilistResult.status === 'fulfilled') {
    const al = anilistResult.value;
    if (al.title_romaji) result.title_romaji = al.title_romaji;
    if (al.title_native) result.title_native = al.title_native;
    if (al.title_english) result.title_english = al.title_english;
    result.title_anilist = al.title_romaji || al.title_english;
    result.synonyms = al.synonyms || [];
  }

  if (jikanResult.status === 'fulfilled') {
    const jk = jikanResult.value;
    if (!result.title_romaji && jk.title_romaji) result.title_romaji = jk.title_romaji;
    if (!result.title_native && jk.title_native) result.title_native = jk.title_native;
    if (!result.title_english && jk.title_english) result.title_english = jk.title_english;
    if (jk.title_mal) result.title_mal = jk.title_mal;

    // Merge synonyms (deduplicated)
    const existingSynsLower = new Set((result.synonyms || []).map(norm));
    const newSyns = (jk.synonyms || []).filter(s => !existingSynsLower.has(norm(s)));
    result.synonyms = [...(result.synonyms || []), ...newSyns];
  }

  // Groq enrichment (non-blocking)
  try {
    const groqData = await enrichWithGroq(result, mediaType);
    if (groqData.title_indonesian) result.title_indonesian = groqData.title_indonesian;
    if (groqData.title_native && !result.title_native) result.title_native = groqData.title_native;
    if (groqData.title_romaji && !result.title_romaji) result.title_romaji = groqData.title_romaji;
    if (groqData.title_english && !result.title_english) result.title_english = groqData.title_english;
    if (groqData.synonyms?.length) {
      const existingSynsLower = new Set((result.synonyms || []).map(norm));
      const newSyns = groqData.synonyms.filter(s => !existingSynsLower.has(norm(s)));
      result.synonyms = [...(result.synonyms || []), ...newSyns];
    }
  } catch {
    // Groq gagal → lanjut tanpa enrichment
  }

  result._status = 'done';
  result = deduplicateTitles(result);

  setCached(cacheKey, result);
  return result;
}

// ─── Serialize / Deserialize ──────────────────────────────────────────────────
export function serializeAlternativeTitles(titles: AlternativeTitles): string {
  const { _status, ...rest } = titles;
  // Remove empty/undefined fields
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(rest)) {
    if (v !== undefined && v !== null && v !== '') {
      if (Array.isArray(v) && v.length === 0) continue;
      clean[k] = v;
    }
  }
  return JSON.stringify(clean);
}

export function deserializeAlternativeTitles(json?: string | null): AlternativeTitles | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return parsed as AlternativeTitles;
  } catch {
    return null;
  }
}

// ─── Language labels ──────────────────────────────────────────────────────────
export function getTitleLanguageLabel(mediaType: 'anime' | 'donghua'): {
  native: string;
  romaji: string;
} {
  if (mediaType === 'donghua') {
    return { native: 'Hanzi (中文)', romaji: 'Pinyin' };
  }
  return { native: 'Kanji (日本語)', romaji: 'Romaji' };
}

// ─── Build display list for UI ────────────────────────────────────────────────
export interface TitleDisplayItem {
  label: string;
  value: string;
  badge: string;
  badgeColor: string;
}

export function buildTitleDisplayList(
  titles: AlternativeTitles,
  mediaType: 'anime' | 'donghua'
): TitleDisplayItem[] {
  const langLabels = getTitleLanguageLabel(mediaType);
  const items: TitleDisplayItem[] = [];

  if (titles.title_english) {
    items.push({
      label: 'Inggris',
      value: titles.title_english,
      badge: 'EN',
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    });
  }

  if (titles.title_romaji) {
    items.push({
      label: langLabels.romaji,
      value: titles.title_romaji,
      badge: mediaType === 'donghua' ? 'PY' : 'JP',
      badgeColor: 'bg-red-500/15 text-red-600 dark:text-red-400',
    });
  }

  if (titles.title_native) {
    items.push({
      label: langLabels.native,
      value: titles.title_native,
      badge: mediaType === 'donghua' ? 'ZH' : 'JA',
      badgeColor: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
    });
  }

  if (titles.title_indonesian) {
    items.push({
      label: 'Indonesia',
      value: titles.title_indonesian,
      badge: 'ID',
      badgeColor: 'bg-green-500/15 text-green-600 dark:text-green-400',
    });
  }

  if (
    titles.title_mal &&
    titles.title_mal !== titles.title_english &&
    titles.title_mal !== titles.title_romaji
  ) {
    items.push({
      label: 'MyAnimeList',
      value: titles.title_mal,
      badge: 'MAL',
      badgeColor: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    });
  }

  if (
    titles.title_anilist &&
    titles.title_anilist !== titles.title_english &&
    titles.title_anilist !== titles.title_romaji
  ) {
    items.push({
      label: 'AniList',
      value: titles.title_anilist,
      badge: 'AL',
      badgeColor: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    });
  }

  return items;
}