/**
 * useAlternativeTitles.ts — LIVORIA (FIXED v3)
 *
 * PERBAIKAN KRITIS v3:
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. EKSTRAKSI SEASON/PART YANG AKURAT
 *    - extractSeasonInfo() mengekstrak nomor season DAN part dari stored_title
 *      dengan mendukung semua format: "Season 4", "4th Season", "S4", "Part 2",
 *      "Cour 2", "第4期", dll.
 *    - Nomor yang diekstrak digunakan sebagai SUMBER KEBENARAN TUNGGAL.
 *
 * 2. SELEKSI KANDIDAT BERDASARKAN SEASON YANG SAMA
 *    - pickBestMatchingCandidate() memilih kandidat dari API yang memiliki
 *      nomor season SAMA dengan stored_title, bukan hanya similarity judul.
 *    - Mencegah kasus "Season 4 dipetakan ke Season 2" dari API.
 *
 * 3. KONSTRUKSI JUDUL ALTERNATIF YANG BENAR
 *    - buildCorrectTitle() membangun judul alternatif dengan mengganti
 *      penomoran season/part dari kandidat API dengan yang ada di stored_title.
 *    - Misalnya: stored="Season 4 Part 2", kandidat API="2nd Season Part 2"
 *      → output = versi dengan "Season 4 Part 2" bukan "2nd Season Part 2"
 *
 * 4. VALIDASI DAN KOREKSI TERJEMAHAN INDONESIA
 *    - validateAndFixSeasonInTranslation() memvalidasi bahwa terjemahan
 *      Indonesia menggunakan nomor season/part yang benar sesuai stored_title.
 *    - Auto-koreksi jika AI salah memberikan nomor season.
 *
 * 5. SISTEM CACHE YANG TEPAT
 *    - Cache key berbasis stored_title sehingga entri berbeda tidak saling
 *      mencemari hasil meski judulnya mirip.
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

// ─── Cache ────────────────────────────────────────────────────────────────────
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

// ─── KRITIS: Ekstraksi info season/part dari judul ────────────────────────────
/**
 * Mengekstrak nomor season dan part/cour dari judul.
 * Mendukung semua format populer.
 *
 * Contoh:
 *   "That Time I Got Reincarnated as a Slime Season 4 Part 2" → { season: 4, part: 2 }
 *   "Tensei Shitara Slime Datta Ken 4th Season Part 2" → { season: 4, part: 2 }
 *   "Attack on Titan Final Season Part 3" → { season: null, part: 3 }
 *   "Re:Zero Season 2" → { season: 2, part: null }
 *   "Sword Art Online" → { season: null, part: null }
 */
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

  // ── Season detection ───────────────────────────────────────────────────────
  // "Season 4", "season 4", "S4", "S 4"
  const seasonNumMatch = t.match(/\bseason\s+(\d+)\b/i) ||
    t.match(/\bS(\d+)\b(?!\s*eason)/i);
  if (seasonNumMatch) {
    season = parseInt(seasonNumMatch[1], 10);
  }

  // "4th Season", "2nd Season", "3rd Season", "1st Season"
  if (!season) {
    const ordinalMatch = t.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i);
    if (ordinalMatch) {
      season = parseInt(ordinalMatch[1], 10);
    }
  }

  // Roman numerals at end: "II", "III", "IV", "V", "VI"
  if (!season) {
    const romanMap: Record<string, number> = {
      'II': 2, 'III': 3, 'IV': 4, 'V': 5, 'VI': 6, 'VII': 7, 'VIII': 8,
    };
    const romanMatch = t.match(/\s+(II|III|IV|VI|VII|VIII)(?:\s|$)/i);
    if (romanMatch) {
      season = romanMap[romanMatch[1].toUpperCase()] ?? null;
    }
  }

  // Japanese: "第4期", "第2期"
  if (!season) {
    const jpMatch = t.match(/第(\d+)期/);
    if (jpMatch) {
      season = parseInt(jpMatch[1], 10);
    }
  }

  // ── Part detection ──────────────────────────────────────────────────────────
  // "Part 2", "Part II", "Part2"
  const partMatch = t.match(/\bpart\s*(\d+)\b/i) ||
    t.match(/\bpart\s+(II|III|IV)\b/i);
  if (partMatch) {
    const v = partMatch[1];
    const romanPartMap: Record<string, number> = { 'II': 2, 'III': 3, 'IV': 4 };
    part = romanPartMap[v.toUpperCase()] ?? parseInt(v, 10);
    if (isNaN(part)) part = null;
  }

  // ── Cour detection ─────────────────────────────────────────────────────────
  // "Cour 2", "2nd Cour"
  const courMatch = t.match(/\bcour\s+(\d+)\b/i) ||
    t.match(/\b(\d+)(?:st|nd|rd|th)\s+cour\b/i);
  if (courMatch) {
    cour = parseInt(courMatch[1], 10);
  }

  // Japanese cour: "第2クール"
  if (!cour) {
    const jpCourMatch = t.match(/第(\d+)クール/);
    if (jpCourMatch) {
      cour = parseInt(jpCourMatch[1], 10);
    }
  }

  return { season, part, cour };
}

/**
 * Mengekstrak judul dasar tanpa season/part indicator.
 * "That Time I Got Reincarnated as a Slime Season 4 Part 2"
 * → "That Time I Got Reincarnated as a Slime"
 */
function extractBaseTitle(title: string): string {
  return title
    .replace(/\s+\d+(?:st|nd|rd|th)\s+season\b.*/gi, '')
    .replace(/\s+season\s+\d+.*/gi, '')
    .replace(/\s+s\d+\b.*/i, '')
    .replace(/\s+part\s*\d+.*/gi, '')
    .replace(/\s+cour\s+\d+.*/gi, '')
    .replace(/\s+(?:II|III|IV|VI|VII|VIII)(?:\s|$).*/i, '')
    .replace(/\s+第\d+期.*/g, '')
    .replace(/\s+第\d+クール.*/g, '')
    .replace(/:\s*.+$/, '') // Remove subtitles like ": Final Chapter"
    .trim();
}

// ─── Token similarity untuk fallback ─────────────────────────────────────────
function tokenSimilarity(a: string, b: string): number {
  const stopWords = new Set(['the', 'a', 'an', 'of', 'in', 'to', 'and', 'season', 'part', 'cour', 'nd', 'rd', 'st', 'th', 'final']);

  const tokenize = (s: string): Set<string> => {
    const tokens = s
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !stopWords.has(t));
    return new Set(tokens);
  };

  const tokA = tokenize(a);
  const tokB = tokenize(b);
  if (tokA.size === 0 || tokB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokA) {
    if (tokB.has(t)) intersection++;
  }

  const union = new Set([...tokA, ...tokB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * KRITIS: Memilih kandidat terbaik yang memiliki nomor season SAMA.
 *
 * Algoritma:
 * 1. Ekstrak season dari stored_title sebagai referensi
 * 2. Prioritaskan kandidat yang base titlenya mirip DAN season-nya sama
 * 3. Jika tidak ada yang season-nya sama, gunakan yang paling mirip base title-nya
 */
function pickBestMatchingCandidate(
  candidates: (string | undefined | null)[],
  storedTitle: string
): string {
  const validCandidates = candidates.filter((c): c is string => !!(c && c.trim()));
  if (validCandidates.length === 0) return '';

  const storedInfo = extractSeasonInfo(storedTitle);
  const storedBase = extractBaseTitle(storedTitle);

  // Skor setiap kandidat
  const scored = validCandidates.map(candidate => {
    const candidateInfo = extractSeasonInfo(candidate);
    const candidateBase = extractBaseTitle(candidate);
    const baseSim = tokenSimilarity(storedBase, candidateBase);

    let score = baseSim;

    // Bonus besar jika season sama
    if (storedInfo.season !== null && candidateInfo.season !== null) {
      if (storedInfo.season === candidateInfo.season) {
        score += 0.5; // big bonus
      } else {
        score -= 0.4; // heavy penalty for wrong season
      }
    }

    // Bonus jika part sama
    if (storedInfo.part !== null && candidateInfo.part !== null) {
      if (storedInfo.part === candidateInfo.part) {
        score += 0.2;
      } else {
        score -= 0.3;
      }
    }

    // Bonus jika cour sama
    if (storedInfo.cour !== null && candidateInfo.cour !== null) {
      if (storedInfo.cour === candidateInfo.cour) {
        score += 0.2;
      } else {
        score -= 0.3;
      }
    }

    return { candidate, score, candidateInfo };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].candidate;
}

/**
 * KRITIS: Membangun judul yang benar dengan season/part dari stored_title.
 *
 * Jika base title sama tapi season berbeda, ganti penomoran season dengan
 * yang ada di stored_title.
 *
 * Contoh:
 *   stored = "That Time I Got Reincarnated as a Slime Season 4 Part 2"
 *   apiTitle = "Tensei Shitara Slime Datta Ken 2nd Season Part 2"
 *   → Pertahankan apiTitle tapi ganti "2nd Season Part 2" → "4th Season Part 2"
 *   (atau lebih baik: hanya pakai base title dari API + season suffix dari stored)
 */
function buildCorrectedTitle(
  apiTitle: string,
  storedTitle: string
): string {
  const storedInfo = extractSeasonInfo(storedTitle);
  const apiInfo = extractSeasonInfo(apiTitle);
  const apiBase = extractBaseTitle(apiTitle);

  // Jika tidak ada info season di stored, kembalikan apiTitle apa adanya
  if (storedInfo.season === null && storedInfo.part === null && storedInfo.cour === null) {
    return apiTitle;
  }

  // Jika season sama, tidak perlu koreksi
  if (
    storedInfo.season === apiInfo.season &&
    storedInfo.part === apiInfo.part &&
    storedInfo.cour === apiInfo.cour
  ) {
    return apiTitle;
  }

  // Bangun suffix yang benar dari stored_title
  let suffix = '';

  if (storedInfo.season !== null) {
    const ordinals = ['', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
    const ordinal = ordinals[storedInfo.season] || `${storedInfo.season}th`;

    // Deteksi format season dari apiTitle untuk mempertahankan konsistensi
    if (/\d+(?:st|nd|rd|th)\s+season/i.test(apiTitle)) {
      suffix += ` ${ordinal} Season`;
    } else {
      suffix += ` Season ${storedInfo.season}`;
    }
  }

  if (storedInfo.part !== null) {
    suffix += ` Part ${storedInfo.part}`;
  } else if (storedInfo.cour !== null) {
    suffix += ` Cour ${storedInfo.cour}`;
  }

  return (apiBase + suffix).trim();
}

// ─── Groq API helpers ─────────────────────────────────────────────────────────
function getGroqKey(): string | null {
  return (import.meta as any).env?.VITE_GROQ_API_KEY || null;
}

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'gemma2-9b-it',
];

async function callGroq(prompt: string, maxTokens = 500): Promise<string | null> {
  const key = getGroqKey();
  if (!key) return null;

  for (const model of GROQ_MODELS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const text = (data.choices?.[0]?.message?.content || '').trim();
      if (text) return text;
    } catch {
      clearTimeout(timer);
    }
  }
  return null;
}

// ─── Edge function fallback ───────────────────────────────────────────────────
async function translateViaEdgeFunction(
  titles: AlternativeTitles,
  mediaType: 'anime' | 'donghua',
): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase.functions.invoke('translate-title', {
      body: {
        titles: [{
          stored_title: titles.stored_title || '',
          title_english: titles.title_english || '',
          title_romaji: titles.title_romaji || '',
          title_native: titles.title_native || '',
        }],
        mediaType,
      },
    });
    if (error || !data?.translations) return null;
    const key = titles.stored_title || titles.title_english || titles.title_romaji || '';
    return data.translations[key] || null;
  } catch {
    return null;
  }
}

// ─── AniList fetch ────────────────────────────────────────────────────────────
async function fetchAniListTitles(
  anilistId?: number | null,
  searchTitle?: string,
): Promise<Partial<AlternativeTitles>> {
  const gql = anilistId
    ? `query($id:Int){Media(id:$id,type:ANIME){title{romaji english native}synonyms}}`
    : `query($s:String){Media(search:$s,type:ANIME,sort:SEARCH_MATCH){title{romaji english native}synonyms}}`;

  const variables = anilistId ? { id: anilistId } : { s: searchTitle };
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
  searchTitle?: string,
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
    if (Array.isArray(item.title_synonyms)) synonyms.push(...item.title_synonyms.filter(Boolean));
    if (Array.isArray(item.titles)) {
      for (const t of item.titles) {
        if (t?.title?.trim() && !synonyms.includes(t.title)) synonyms.push(t.title);
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

// ─── KRITIS: Terjemah ke Indonesia dengan validasi season ─────────────────────
/**
 * Memvalidasi bahwa terjemahan memiliki nomor season/part yang BENAR.
 * Jika AI salah, koreksi otomatis.
 */
function validateAndFixSeasonInTranslation(
  translation: string,
  storedTitle: string
): string {
  const storedInfo = extractSeasonInfo(storedTitle);
  let fixed = translation;

  // Fix season number
  if (storedInfo.season !== null) {
    // Ganti semua variasi penomoran musim yang salah
    fixed = fixed
      // "Musim X" / "Season X" → pastikan benar
      .replace(/musim\s+\d+/gi, `Musim ${storedInfo.season}`)
      .replace(/season\s+\d+/gi, `Season ${storedInfo.season}`);

    // Pastikan ada "Musim X" jika stored_title punya season
    const hasSeasonInTranslation =
      /musim\s+\d+/i.test(fixed) ||
      /season\s+\d+/i.test(fixed);

    if (!hasSeasonInTranslation && storedInfo.season > 1) {
      fixed += ` Musim ${storedInfo.season}`;
    }
  }

  // Fix part number
  if (storedInfo.part !== null) {
    fixed = fixed
      .replace(/bagian\s+\d+/gi, `Bagian ${storedInfo.part}`)
      .replace(/part\s+\d+/gi, `Bagian ${storedInfo.part}`);

    const hasPartInTranslation =
      /bagian\s+\d+/i.test(fixed) ||
      /part\s+\d+/i.test(fixed);

    if (!hasPartInTranslation && (storedInfo.part > 1 || storedInfo.season !== null)) {
      fixed += ` Bagian ${storedInfo.part}`;
    }
  }

  // Fix cour number
  if (storedInfo.cour !== null) {
    fixed = fixed
      .replace(/kour\s+\d+/gi, `Kour ${storedInfo.cour}`)
      .replace(/cour\s+\d+/gi, `Kour ${storedInfo.cour}`);
  }

  return fixed.trim();
}

/**
 * KRITIS: Terjemahkan judul ke Bahasa Indonesia.
 *
 * Menggunakan stored_title sebagai SUMBER KEBENARAN untuk:
 * 1. Nomor season/part yang benar
 * 2. Konteks terjemahan
 * 3. Validasi hasil
 */
async function translateToIndonesian(
  titles: AlternativeTitles,
  mediaType: 'anime' | 'donghua',
): Promise<string | null> {
  const key = getGroqKey();
  if (!key) return null;

  const storedTitle = titles.stored_title || '';
  const englishTitle = titles.title_english || '';
  const romajiTitle = titles.title_romaji || '';
  const nativeTitle = titles.title_native || '';

  const primarySource = storedTitle || englishTitle || romajiTitle;
  if (!primarySource) return null;

  // Cache key berbasis stored_title yang PRESISI (termasuk season/part)
  const cacheKey = `groq_id_v5:${norm(storedTitle || englishTitle)}:${mediaType}`;
  const cached = getCached(cacheKey);
  if (cached?.title_indonesian) return cached.title_indonesian;

  // Ekstrak info season dari stored_title untuk referensi
  const storedSeasonInfo = extractSeasonInfo(storedTitle);

  const isJapanese = mediaType === 'anime';
  const mediaLabel = isJapanese ? 'anime Jepang' : 'donghua China';

  // Bangun info konteks — stored_title sebagai acuan UTAMA dengan season yang jelas
  const titleInfo = [
    storedTitle && `- Judul di database (PALING AKURAT, gunakan ini sebagai acuan): "${storedTitle}"`,
    englishTitle && englishTitle !== storedTitle && `- Judul Inggris dari API (MUNGKIN nomor season-nya berbeda, ABAIKAN nomor season-nya): "${englishTitle}"`,
    romajiTitle && romajiTitle !== storedTitle && `- Romaji dari API (MUNGKIN nomor season-nya berbeda, ABAIKAN nomor season-nya): "${romajiTitle}"`,
    nativeTitle && `- Judul asli (${isJapanese ? 'Kanji' : 'Hanzi'}): "${nativeTitle}"`,
    storedSeasonInfo.season && `- NOMOR SEASON YANG BENAR: ${storedSeasonInfo.season} (WAJIB gunakan angka ini)`,
    storedSeasonInfo.part && `- NOMOR BAGIAN YANG BENAR: ${storedSeasonInfo.part} (WAJIB gunakan angka ini)`,
  ].filter(Boolean).join('\n');

  const prompt = `Kamu adalah penerjemah judul ${mediaLabel} ke Bahasa Indonesia.

JUDUL YANG PERLU DITERJEMAHKAN:
${titleInfo || `- Judul: "${primarySource}"`}

PERATURAN KETAT:
1. SELALU gunakan "Judul di database" sebagai acuan utama — ini yang paling akurat
2. Judul dari API (Inggris/Romaji) MUNGKIN memiliki nomor season yang BERBEDA — ABAIKAN nomor season dari API
3. Gunakan HANYA nomor season/bagian yang tertera di "NOMOR SEASON/BAGIAN YANG BENAR"
4. Jika tidak ada nomor season/bagian khusus, ikuti judul database apa adanya

ATURAN TERJEMAHAN:
[WAJIB TERJEMAHKAN ke Bahasa Indonesia jika judulnya berupa kalimat/frasa deskriptif:]
• "That Time I Got Reincarnated as a Slime Season 4 Part 2" → "Saat Aku Bereinkarnasi Menjadi Slime Musim 4 Bagian 2"
• "The Rising of the Shield Hero Season 3" → "Kebangkitan Pahlawan Perisai Musim 3"
• "Is It Wrong to Try to Pick Up Girls in a Dungeon? Season 4" → "Salahkah Mencari Gadis di Dungeon? Musim 4"
• "Mushoku Tensei: Jobless Reincarnation Season 2 Part 2" → "Mushoku Tensei: Reinkarnasi Pengangguran Musim 2 Bagian 2"

[PERTAHANKAN nama asli jika merupakan nama diri/proper noun:]
• "Naruto Shippuden", "Bleach: Thousand-Year Blood War", "One Piece" → tetap
• "Jujutsu Kaisen Season 2", "Sword Art Online" → tetap nama, terjemahkan season

PENOMORAN (WAJIB IKUTI ATURAN INI):
- "Season X" → "Musim X" (gunakan NOMOR yang sama dengan stored_title)
- "Part X" → "Bagian X" (gunakan NOMOR yang sama dengan stored_title)
- "Cour X" → "Bagian X" atau "Kour X"
- JANGAN ubah angkanya dari yang tertera di "NOMOR YANG BENAR"

Jawab HANYA dengan judul terjemahannya saja.
Jangan tulis penjelasan, tanda petik, atau awalan apapun.`;

  const result = await callGroq(prompt, 200);
  if (!result) return null;

  // Bersihkan output dari artefak AI
  let cleaned = result
    .replace(/^["'`«»„"‟'‛]+|["'`«»„"‟'‛]+$/g, '')
    .replace(/^(Jawaban|Terjemahan|Judul Indonesia|Judul|Answer|Title|Result|Indonesian)[:\s-]+/i, '')
    .replace(/\n.*/s, '')
    .trim();

  if (!cleaned || cleaned.length < 1 || cleaned.length > 250) return null;

  // KRITIS: Validasi dan koreksi nomor season/part
  cleaned = validateAndFixSeasonInTranslation(cleaned, storedTitle);

  // Simpan ke cache
  setCached(cacheKey, { title_indonesian: cleaned });
  return cleaned;
}

// ─── Isi field kosong via Groq ─────────────────────────────────────────────────
async function enrichMissingFieldsWithGroq(
  titles: AlternativeTitles,
  mediaType: 'anime' | 'donghua',
): Promise<Partial<AlternativeTitles>> {
  const key = getGroqKey();
  if (!key) return {};

  const mainTitle = titles.stored_title || titles.title_english || titles.title_romaji || '';
  if (!mainTitle) return {};

  const storedSeasonInfo = extractSeasonInfo(mainTitle);

  const needEnglish = !titles.title_english;
  const needRomaji = !titles.title_romaji;
  const needNative = !titles.title_native;

  if (!needEnglish && !needRomaji && !needNative) return {};

  const cacheKey = `groq_fields_v3:${mediaType}:${norm(mainTitle)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const isJapanese = mediaType === 'anime';
  const nativeScript = isJapanese ? 'Japanese Kanji/Kana' : 'Chinese Hanzi';
  const romajiType = isJapanese ? 'Romaji Hepburn' : 'Pinyin';

  const knownInfo = [
    titles.stored_title && `Stored (user's title, MOST ACCURATE): "${titles.stored_title}"`,
    titles.title_english && `English: "${titles.title_english}"`,
    titles.title_romaji && `${isJapanese ? 'Romaji' : 'Pinyin'}: "${titles.title_romaji}"`,
    titles.title_native && `Native: "${titles.title_native}"`,
    storedSeasonInfo.season && `CORRECT Season Number: ${storedSeasonInfo.season}`,
    storedSeasonInfo.part && `CORRECT Part Number: ${storedSeasonInfo.part}`,
  ].filter(Boolean).join(', ');

  const fields: string[] = [];
  if (needEnglish) fields.push(`"title_english": "official English title with CORRECT season ${storedSeasonInfo.season || ''} ${storedSeasonInfo.part ? 'Part ' + storedSeasonInfo.part : ''}"`);
  if (needRomaji) fields.push(`"title_romaji": "${romajiType} romanization with CORRECT season indicator"`);
  if (needNative) fields.push(`"title_native": "${nativeScript} script with CORRECT season indicator"`);

  const prompt = `You are an expert on ${isJapanese ? 'Japanese anime' : 'Chinese donghua'} with deep knowledge of all seasons and parts.
Known: ${knownInfo || `"${mainTitle}"`}

CRITICAL RULES:
1. The "Stored" title is the GROUND TRUTH — it has the CORRECT season and part numbers
2. The API titles may have DIFFERENT season numbers — use the CORRECT numbers from "Stored"
3. Make sure your output uses Season ${storedSeasonInfo.season || 'N/A'} ${storedSeasonInfo.part ? 'Part ' + storedSeasonInfo.part : ''} if applicable
4. Find the base series and provide the titles with the CORRECT season specification

Provide ONLY this JSON (no markdown, no explanation):
{${fields.join(', ')}}`;

  const raw = await callGroq(prompt, 400);
  if (!raw) return {};

  try {
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) return {};
    const parsed = JSON.parse(raw.substring(start, end + 1));

    const result: Partial<AlternativeTitles> = {};
    const storedTitle = titles.stored_title || '';

    if (needEnglish && typeof parsed.title_english === 'string' && parsed.title_english.trim()) {
      // Koreksi season jika perlu
      result.title_english = buildCorrectedTitle(parsed.title_english.trim(), storedTitle);
    }
    if (needRomaji && typeof parsed.title_romaji === 'string' && parsed.title_romaji.trim()) {
      result.title_romaji = buildCorrectedTitle(parsed.title_romaji.trim(), storedTitle);
    }
    if (needNative && typeof parsed.title_native === 'string' && parsed.title_native.trim()) {
      // Untuk native (kanji/hanzi), koreksi season jika ada
      result.title_native = buildCorrectedTitle(parsed.title_native.trim(), storedTitle);
    }

    setCached(cacheKey, result);
    return result;
  } catch {
    return {};
  }
}

// ─── Validasi hasil terjemahan ─────────────────────────────────────────────────
function isValidIndonesianTitle(candidate: string): boolean {
  if (!candidate || candidate.trim().length === 0) return false;
  const c = candidate.trim();
  if (c.length > 200) return false;
  if (c.includes('"') || c.includes('{') || c.includes('[')) return false;
  if (/^(the title|this is|in indonesian|terjemahan|jawaban|note:|keep|original)/i.test(c)) return false;
  if (/\b(means|translates to|literally means)\b/i.test(c)) return false;
  return true;
}

// ─── Deduplication ─────────────────────────────────────────────────────────────
function deduplicateTitles(titles: AlternativeTitles): AlternativeTitles {
  const seen = new Set<string>();
  const add = (s?: string) => { const n = norm(s); if (n) seen.add(n); };

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

// ─── MAIN EXPORT FUNCTION ─────────────────────────────────────────────────────
export async function fetchAlternativeTitles(params: {
  malId?: number | null;
  anilistId?: number | null;
  storedTitle?: string;
  mediaType?: 'anime' | 'donghua';
}): Promise<AlternativeTitles> {
  const { malId, anilistId, storedTitle, mediaType = 'anime' } = params;

  const cacheKey = [
    'alt_v5',
    malId || '',
    anilistId || '',
    norm(storedTitle),
    mediaType,
  ].join(':');

  const cached = getCached(cacheKey);
  if (cached) return cached;

  let result: AlternativeTitles = {
    stored_title: storedTitle,
    _status: 'loading',
  };

  // Ekstrak info season dari stored_title sebagai referensi global
  const storedSeasonInfo = storedTitle ? extractSeasonInfo(storedTitle) : { season: null, part: null, cour: null };

  // ── STEP 1: Parallel fetch AniList + Jikan ────────────────────────────────
  const [anilistResult, jikanResult] = await Promise.allSettled([
    fetchAniListTitles(anilistId, storedTitle),
    fetchJikanTitles(malId, storedTitle),
  ]);

  // Kumpulkan semua kandidat dari kedua sumber
  const allEnglishCandidates: string[] = [];
  const allRomajiCandidates: string[] = [];
  const allNativeCandidates: string[] = [];
  let allSynonyms: string[] = [];

  if (anilistResult.status === 'fulfilled') {
    const al = anilistResult.value;
    if (al.title_english) allEnglishCandidates.push(al.title_english);
    if (al.title_romaji) allRomajiCandidates.push(al.title_romaji);
    if (al.title_native) allNativeCandidates.push(al.title_native);
    result.title_anilist = al.title_romaji || al.title_english;
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

  // ── STEP 2: Pilih kandidat terbaik berdasarkan season yang sama ───────────
  if (storedTitle && storedTitle.trim()) {
    // Pilih English candidate yang base titlenya cocok
    if (allEnglishCandidates.length > 0) {
      const bestEn = pickBestMatchingCandidate(allEnglishCandidates, storedTitle);
      if (bestEn) {
        // Koreksi season jika perlu
        result.title_english = buildCorrectedTitle(bestEn, storedTitle);
      }
    }

    // Pilih Romaji candidate
    if (allRomajiCandidates.length > 0) {
      const bestRomaji = pickBestMatchingCandidate(allRomajiCandidates, storedTitle);
      if (bestRomaji) {
        result.title_romaji = buildCorrectedTitle(bestRomaji, storedTitle);
      }
    }

    // Untuk Native (kanji/hanzi): ambil yang paling relevan
    if (allNativeCandidates.length > 0) {
      const bestNative = pickBestMatchingCandidate(allNativeCandidates, storedTitle);
      if (bestNative) {
        result.title_native = buildCorrectedTitle(bestNative, storedTitle);
      }
    }
  } else {
    // Tidak ada stored_title, gunakan prioritas biasa
    result.title_english = allEnglishCandidates[0];
    result.title_romaji = allRomajiCandidates[0];
    result.title_native = allNativeCandidates[0];
  }

  // Simpan semua sinonim unik
  result.synonyms = [...new Set(allSynonyms)].filter(s => s?.trim());

  // ── STEP 3: Isi field yang kosong via Groq ────────────────────────────────
  try {
    const fieldData = await enrichMissingFieldsWithGroq(result, mediaType);
    if (!result.title_english && fieldData.title_english) result.title_english = fieldData.title_english;
    if (!result.title_romaji && fieldData.title_romaji) result.title_romaji = fieldData.title_romaji;
    if (!result.title_native && fieldData.title_native) result.title_native = fieldData.title_native;
  } catch {
    // lanjut tanpa isian tambahan
  }

  // ── STEP 4: Terjemahkan ke Indonesia ─────────────────────────────────────
  try {
    const idTitle = await translateToIndonesian(result, mediaType);
    if (idTitle && isValidIndonesianTitle(idTitle)) {
      result.title_indonesian = idTitle;
    }
  } catch {
    // gagal translate client-side
  }

  // Jika masih kosong, coba via Edge Function
  if (!result.title_indonesian || result.title_indonesian === result.title_english) {
    try {
      const edgeResult = await translateViaEdgeFunction(result, mediaType);
      if (edgeResult && isValidIndonesianTitle(edgeResult) && edgeResult !== result.title_english) {
        // Validasi season dari edge function result juga
        const fixedEdge = storedTitle
          ? validateAndFixSeasonInTranslation(edgeResult, storedTitle)
          : edgeResult;
        result.title_indonesian = fixedEdge;
      }
    } catch {
      // fallback silently
    }
  }

  // ── STEP 5: Final validation — pastikan semua title punya season benar ────
  if (storedTitle && (storedSeasonInfo.season !== null || storedSeasonInfo.part !== null)) {
    if (result.title_english) {
      const enInfo = extractSeasonInfo(result.title_english);
      if (storedSeasonInfo.season !== null && enInfo.season !== null &&
          enInfo.season !== storedSeasonInfo.season) {
        result.title_english = buildCorrectedTitle(result.title_english, storedTitle);
      }
    }
    if (result.title_romaji) {
      const romajiInfo = extractSeasonInfo(result.title_romaji);
      if (storedSeasonInfo.season !== null && romajiInfo.season !== null &&
          romajiInfo.season !== storedSeasonInfo.season) {
        result.title_romaji = buildCorrectedTitle(result.title_romaji, storedTitle);
      }
    }
    if (result.title_native) {
      const nativeInfo = extractSeasonInfo(result.title_native);
      if (storedSeasonInfo.season !== null && nativeInfo.season !== null &&
          nativeInfo.season !== storedSeasonInfo.season) {
        result.title_native = buildCorrectedTitle(result.title_native, storedTitle);
      }
    }
    if (result.title_indonesian) {
      result.title_indonesian = validateAndFixSeasonInTranslation(result.title_indonesian, storedTitle);
    }
  }

  // ── STEP 6: Final fallback ─────────────────────────────────────────────────
  if (!result.title_english) {
    result.title_english = result.title_romaji || storedTitle || '';
  }
  if (!result.title_romaji) {
    result.title_romaji = result.title_english || storedTitle || '';
  }

  result._status = 'done';
  result = deduplicateTitles(result);

  setCached(cacheKey, result);
  return result;
}

// ─── Serialize / Deserialize ──────────────────────────────────────────────────
export function serializeAlternativeTitles(titles: AlternativeTitles): string {
  const { _status, ...rest } = titles;
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
  if (mediaType === 'donghua') return { native: 'Hanzi (中文)', romaji: 'Pinyin' };
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
  mediaType: 'anime' | 'donghua',
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