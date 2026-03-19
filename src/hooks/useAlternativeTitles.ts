/**
 * useAlternativeTitles.ts — LIVORIA
 *
 * Mengambil semua variasi nama judul anime/donghua dari:
 * 1. AniList GraphQL → title.romaji, title.english, title.native, synonyms
 * 2. Jikan/MAL → title, title_english, title_japanese, title_synonyms
 * 3. Groq AI → fallback jika data tidak lengkap (terutama nama Indonesia)
 *
 * Output: AlternativeTitles object dengan field terpisah per bahasa/tipe.
 *
 * PENTING: Nama Database (yang disimpan user), Jepang/China, Inggris WAJIB ada
 * jika memang berbeda — ini krusial untuk pencarian.
 */

export interface AlternativeTitles {
  /** Nama yang disimpan user di database (bisa berbeda dari semua nama resmi) */
  stored_title?: string;
  /** Nama Romaji Jepang (e.g. "Shingeki no Kyojin") atau Pinyin China (e.g. "Dou Po Cangqiong") */
  title_romaji?: string;
  /** Nama native (Kanji Jepang e.g. "進撃の巨人" atau Hanzi China e.g. "斗破苍穹") */
  title_native?: string;
  /** Nama bahasa Inggris resmi */
  title_english?: string;
  /** Nama bahasa Indonesia (jika ada terjemahan resmi atau umum dipakai) */
  title_indonesian?: string;
  /** Nama yang dipakai di MAL */
  title_mal?: string;
  /** Nama yang dipakai di AniList */
  title_anilist?: string;
  /** Sinonim / alias lainnya */
  synonyms?: string[];
  /** Status fetch: 'idle' | 'loading' | 'done' | 'error' */
  _status?: 'idle' | 'loading' | 'done' | 'error';
}

// ─── Cache ─────────────────────────────────────────────────────────────────
const altTitleCache = new Map<string, AlternativeTitles>();

// ─── AniList fetch ──────────────────────────────────────────────────────────
async function fetchAniListTitles(
  anilistId?: number | null,
  searchTitle?: string
): Promise<Partial<AlternativeTitles>> {
  const gql = anilistId
    ? `query ($id: Int) {
        Media(id: $id, type: ANIME) {
          title { romaji english native }
          synonyms
        }
      }`
    : `query ($search: String) {
        Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          title { romaji english native }
          synonyms
        }
      }`;

  const variables = anilistId ? { id: anilistId } : { search: searchTitle };

  const res = await fetch('https://graphql.anilist.co', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  const json = await res.json();
  const media = json.data?.Media;
  if (!media) return {};

  return {
    title_romaji: media.title?.romaji || undefined,
    title_english: media.title?.english || undefined,
    title_native: media.title?.native || undefined,
    synonyms: (media.synonyms || []).filter((s: string) => s && s.trim().length > 0),
  };
}

// ─── Jikan/MAL fetch ────────────────────────────────────────────────────────
async function fetchJikanTitles(
  malId?: number | null,
  searchTitle?: string
): Promise<Partial<AlternativeTitles>> {
  let endpoint: string;

  if (malId) {
    endpoint = `https://api.jikan.moe/v4/anime/${malId}`;
  } else if (searchTitle) {
    endpoint = `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(searchTitle)}&limit=1&sfw=false`;
  } else {
    return {};
  }

  const res = await fetch(endpoint, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) throw new Error(`Jikan HTTP ${res.status}`);
  const json = await res.json();

  // Single item endpoint vs search endpoint
  const item = malId ? json.data : json.data?.[0];
  if (!item) return {};

  const synonyms: string[] = [];
  if (item.title_synonyms?.length) synonyms.push(...item.title_synonyms.filter(Boolean));

  // titles array (lebih lengkap dari Jikan v4)
  if (item.titles?.length) {
    for (const t of item.titles) {
      if (t.title && t.title.trim() && !synonyms.includes(t.title)) {
        synonyms.push(t.title);
      }
    }
  }

  return {
    title_romaji: item.title || undefined,
    title_english: item.title_english || undefined,
    title_native: item.title_japanese || undefined,
    title_mal: item.title || undefined,
    synonyms: [...new Set(synonyms)].filter(s => s.trim().length > 0),
  };
}

// ─── Groq AI fallback untuk nama Indonesia & lengkapi yang kosong ────────────
async function enrichWithGroq(
  titles: AlternativeTitles,
  mediaType: 'anime' | 'donghua'
): Promise<Partial<AlternativeTitles>> {
  const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (!GROQ_API_KEY) return {};

  // Hanya panggil Groq jika ada yang kosong
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

  const cacheKey = `groq:${mainTitle.toLowerCase()}`;
  if (altTitleCache.has(cacheKey)) return altTitleCache.get(cacheKey) || {};

  const prompt = `You are an expert on ${mediaType === 'donghua' ? 'Chinese animation (Donghua)' : 'Japanese animation (Anime)'}.

For the title: "${mainTitle}"
${titles.title_native ? `Native title: "${titles.title_native}"` : ''}
${titles.title_romaji ? `Romaji/Pinyin: "${titles.title_romaji}"` : ''}

Provide the following information as JSON (only if you are confident):
{
  "title_indonesian": "Indonesian title if officially licensed or commonly known in Indonesia, or null",
  "title_native": "${mediaType === 'donghua' ? 'Chinese characters (Hanzi)' : 'Japanese Kanji/Hiragana'} if not already provided, or null",
  "title_romaji": "${mediaType === 'donghua' ? 'Pinyin romanization' : 'Romaji'} if not already provided, or null",
  "title_english": "Official English title if not already provided, or null",
  "additional_synonyms": ["any other well-known alternative titles in any language", "abbreviations like BTTH, SNK, etc."]
}

Respond ONLY with valid JSON. No explanation. If unsure, use null.`;

  const MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'gemma2-9b-it'];

  for (const model of MODELS) {
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
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content?.trim() || '{}';
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      const result: Partial<AlternativeTitles> = {};
      if (parsed.title_indonesian) result.title_indonesian = parsed.title_indonesian;
      if (parsed.title_native && !titles.title_native) result.title_native = parsed.title_native;
      if (parsed.title_romaji && !titles.title_romaji) result.title_romaji = parsed.title_romaji;
      if (parsed.title_english && !titles.title_english) result.title_english = parsed.title_english;
      if (parsed.additional_synonyms?.length) {
        result.synonyms = [
          ...(titles.synonyms || []),
          ...parsed.additional_synonyms.filter((s: string) => s && s.trim()),
        ];
      }

      altTitleCache.set(cacheKey, result);
      return result;
    } catch {
      continue;
    }
  }

  return {};
}

// ─── Deduplikasi dan normalisasi ─────────────────────────────────────────────
function deduplicateTitles(titles: AlternativeTitles): AlternativeTitles {
  const seen = new Set<string>();
  const normalize = (s?: string) => s?.toLowerCase().trim() || '';

  // Kumpulkan semua nilai utama
  const mainValues = [
    normalize(titles.stored_title),
    normalize(titles.title_romaji),
    normalize(titles.title_native),
    normalize(titles.title_english),
    normalize(titles.title_indonesian),
    normalize(titles.title_mal),
    normalize(titles.title_anilist),
  ].filter(Boolean);

  mainValues.forEach(v => seen.add(v));

  // Filter synonyms — hilangkan duplikat dari nilai utama
  const filteredSynonyms = (titles.synonyms || []).filter(s => {
    const n = normalize(s);
    if (!n || seen.has(n)) return false;
    seen.add(n);
    return true;
  });

  return { ...titles, synonyms: filteredSynonyms };
}

// ─── Main function: fetch semua nama alternatif ─────────────────────────────
export async function fetchAlternativeTitles(params: {
  malId?: number | null;
  anilistId?: number | null;
  storedTitle?: string;
  mediaType?: 'anime' | 'donghua';
}): Promise<AlternativeTitles> {
  const { malId, anilistId, storedTitle, mediaType = 'anime' } = params;

  const cacheKey = `alt:${malId || ''}:${anilistId || ''}:${storedTitle || ''}`;
  if (altTitleCache.has(cacheKey)) {
    return altTitleCache.get(cacheKey)!;
  }

  let result: AlternativeTitles = {
    stored_title: storedTitle,
    _status: 'loading',
  };

  // Paralel fetch AniList + Jikan
  const [anilistData, jikanData] = await Promise.allSettled([
    fetchAniListTitles(anilistId, storedTitle),
    fetchJikanTitles(malId, storedTitle),
  ]);

  // Merge: AniList prioritas untuk native & romaji, Jikan sebagai fallback
  if (anilistData.status === 'fulfilled') {
    const al = anilistData.value;
    result.title_romaji = al.title_romaji;
    result.title_native = al.title_native;
    result.title_english = al.title_english;
    result.title_anilist = al.title_romaji || al.title_english;
    result.synonyms = al.synonyms || [];
  }

  if (jikanData.status === 'fulfilled') {
    const jk = jikanData.value;
    // Jika AniList sudah ada data, Jikan sebagai tambahan
    if (!result.title_romaji) result.title_romaji = jk.title_romaji;
    if (!result.title_native) result.title_native = jk.title_native;
    if (!result.title_english) result.title_english = jk.title_english;
    result.title_mal = jk.title_mal;
    // Gabungkan synonyms
    const existingSyns = new Set((result.synonyms || []).map(s => s.toLowerCase()));
    const newSyns = (jk.synonyms || []).filter(s => !existingSyns.has(s.toLowerCase()));
    result.synonyms = [...(result.synonyms || []), ...newSyns];
  }

  // Groq enrichment (async, non-blocking jika tidak ada nama Indonesia)
  try {
    const groqData = await enrichWithGroq(result, mediaType);
    if (groqData.title_indonesian) result.title_indonesian = groqData.title_indonesian;
    if (groqData.title_native && !result.title_native) result.title_native = groqData.title_native;
    if (groqData.title_romaji && !result.title_romaji) result.title_romaji = groqData.title_romaji;
    if (groqData.title_english && !result.title_english) result.title_english = groqData.title_english;
    if (groqData.synonyms?.length) {
      const existingSyns = new Set((result.synonyms || []).map(s => s.toLowerCase()));
      const newSyns = groqData.synonyms.filter(s => !existingSyns.has(s.toLowerCase()));
      result.synonyms = [...(result.synonyms || []), ...newSyns];
    }
  } catch {
    // Groq gagal → lanjut tanpa enrichment
  }

  result._status = 'done';
  result = deduplicateTitles(result);

  altTitleCache.set(cacheKey, result);
  return result;
}

// ─── Serialize/Deserialize untuk penyimpanan ke Supabase ────────────────────
// Disimpan sebagai JSON string di kolom `alternative_titles`

export function serializeAlternativeTitles(titles: AlternativeTitles): string {
  const { _status, ...rest } = titles;
  return JSON.stringify(rest);
}

export function deserializeAlternativeTitles(json?: string | null): AlternativeTitles | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AlternativeTitles;
  } catch {
    return null;
  }
}

// ─── Helper: mendapatkan label bahasa ───────────────────────────────────────
export function getTitleLanguageLabel(mediaType: 'anime' | 'donghua'): {
  native: string;
  romaji: string;
} {
  if (mediaType === 'donghua') {
    return { native: 'Hanzi (中文)', romaji: 'Pinyin' };
  }
  return { native: 'Kanji (日本語)', romaji: 'Romaji' };
}

// ─── Helper: build display list untuk UI ────────────────────────────────────
export interface TitleDisplayItem {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: string;
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

  // MAL title jika berbeda
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

  // AniList title jika berbeda
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