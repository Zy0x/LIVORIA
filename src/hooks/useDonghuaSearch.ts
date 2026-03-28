/**
 * useDonghuaSearch.ts — LIVORIA
 *
 * Pencarian Donghua dengan sistem 4 layer untuk menangani perbedaan nama:
 *   - Bahasa China (Pinyin): Dou Po Cangqiong
 *   - Bahasa Inggris: Battle Through The Heavens
 *   - Singkatan: BTTH, SASO, JWSZ
 *   - Terjemahan alternatif: Fights Break Sphere
 *
 * LAYER 1 — Alias database lokal (sangat cepat, offline)
 * LAYER 2 — Normalisasi + fuzzy matching (Levenshtein, pinyin strip)
 * LAYER 3 — Groq AI expand query ke nama alternatif (async, butuh API key)
 * LAYER 4 — Search ulang Jikan + AniList dengan semua alias yang ditemukan
 *
 * CARA PAKAI — sama persis seperti useAnimeSearch:
 *   const { results, isSearching, search, clearResults, jikanOk, anilistOk } = useDonghuaSearch({ debounceMs: 600 });
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type { AnimeSearchResult } from './useAnimeSearch';
export type { AnimeSearchResult };

// ─── LAYER 1: Database alias lokal ───────────────────────────────────────────
// Format: [canonical_search_term, [...aliases]]
// canonical = kata kunci yang paling cocok untuk Jikan/AniList
// aliases = semua variasi nama yang mungkin diketik user

const DONGHUA_ALIAS_DB: Array<{ canonical: string; aliases: string[]; abbr?: string[] }> = [
  {
    canonical: 'Battle Through the Heavens',
    aliases: ['Dou Po Cangqiong', 'Fights Break Sphere', 'Doupo Cangqiong', 'Fight Break Sphere', 'Battle of Heaven', 'Dou Break Sphere'],
    abbr: ['BTTH', 'DPC', 'FBS'],
  },
  {
    canonical: 'Soul Land',
    aliases: ['Douluo Dalu', 'Douluo Continent', 'Spirit Land', 'Combat Continent', 'The Land of Soul'],
    abbr: ['DD', 'SL', 'DLD'],
  },
  {
    canonical: 'The King\'s Avatar',
    aliases: ['Quan Zhi Gao Shou', 'Full-Time Expert', 'All Out Master', 'Quanzhi Gaoshou'],
    abbr: ['QZGS', 'TKA', 'KA'],
  },
  {
    canonical: 'Martial Universe',
    aliases: ['Wu Dong Qian Kun', 'Wu Dong Qian Kun', 'Martial Movement Upheaval'],
    abbr: ['WDQK', 'MU'],
  },
  {
    canonical: 'Perfect World',
    aliases: ['Wan Jie Xian Zong', 'Wanjie Xianzong', 'Perfect World Donghua'],
    abbr: ['PW', 'WJXZ'],
  },
  {
    canonical: 'Stellar Transformations',
    aliases: ['Xing Chen Bian', 'Xingchen Bian', 'Cosmic Changes', 'Star Transformations'],
    abbr: ['XCB', 'ST'],
  },
  {
    canonical: 'Jade Dynasty',
    aliases: ['Zhu Xian', 'Zhu Xian Donghua', 'Jade Dynasty Animated'],
    abbr: ['ZX', 'JD'],
  },
  {
    canonical: 'A Record of a Mortal\'s Journey to Immortality',
    aliases: [
      'Fan Ren Xiu Xian Zhuan', 'Fanren Xiuxian Zhuan', 'Mortal Cultivation Chronicle',
      'A Mortal\'s Journey', 'Ordinary Person\'s Journey to Immortality',
    ],
    abbr: ['RMJI', 'FARMJI', 'FRXXZ'],
  },
  {
    canonical: 'Against the Gods',
    aliases: ['Ni Tian Xie Shen', 'Nitianxieshen', 'Against Heaven Evil God'],
    abbr: ['ATG', 'NTXS'],
  },
  {
    canonical: 'Tales of Demons and Gods',
    aliases: ['Yao Shen Ji', 'Yaoshenji', 'Demon God Record', 'Demon and God Record'],
    abbr: ['TDG', 'YSJ'],
  },
  {
    canonical: 'The Daily Life of the Immortal King',
    aliases: ['Xian Wang De Richang Shenghuo', 'Immortal King Daily Life'],
    abbr: ['DLIK', 'XWDR', 'DLIR'],
  },
  {
    canonical: 'Desolate Era',
    aliases: ['Mang Huang Ji', 'Manhuang Ji', 'Vast Wilderness', 'Primordial Era'],
    abbr: ['DE', 'MHJ'],
  },
  {
    canonical: 'Swallowed Star',
    aliases: ['Tun Shi Xing Kong', 'Tunshi Xingkong', 'Star Swallowing', 'Devoured Stars'],
    abbr: ['SS', 'TSXK'],
  },
  {
    canonical: 'Coiling Dragon',
    aliases: ['Pan Long', 'Panlong', 'Twisting Dragon'],
    abbr: ['CD', 'PL'],
  },
  {
    canonical: 'I Shall Seal the Heavens',
    aliases: ['Wo Yu Feng Tian', 'Wo Yu Feng Tian', 'Seal the Heaven'],
    abbr: ['ISSTH', 'WYFT'],
  },
  {
    canonical: 'Renegade Immortal',
    aliases: ['Xian Ni', 'Xianni', 'Xian Ni Donghua'],
    abbr: ['RI', 'XN'],
  },
  {
    canonical: 'Peerless Martial God',
    aliases: ['Jue Shi Wu Shen', 'Jue Shi Wushen', 'Peerless War God'],
    abbr: ['PMG', 'JSWS'],
  },
  {
    canonical: 'Ancient Strengthening Technique',
    aliases: ['Tian Yuan Jue', 'Tianyuanjue', 'Ancient Body Technique'],
    abbr: ['AST', 'TYJ'],
  },
  {
    canonical: 'The Legend of the Dragon King',
    aliases: ['Long Wang Chuan Shuo', 'Soul Land 2', 'Douluo Dalu 2', 'Dragon King Legend'],
    abbr: ['LDK', 'LWCS', 'SL2', 'DD2'],
  },
  {
    canonical: 'Throne of Seal',
    aliases: ['Feng Shen Ji', 'Feng Yin Tian Xia', 'Fengsheng Ji'],
    abbr: ['TOS', 'FSJ'],
  },
  {
    canonical: 'Combat Continent',
    aliases: ['Douluo Dalu 3', 'Soul Land 3', 'Dragon King\'s Legend', 'Douro Continent 3'],
    abbr: ['DD3', 'SL3', 'CC'],
  },
  {
    canonical: 'Magic Chef of Ice and Fire',
    aliases: ['Bing Huo Mo Chu', 'Binghuomchu', 'Ice Fire Magic Kitchen'],
    abbr: ['MCIF', 'BHMC'],
  },
  {
    canonical: 'Wan Jie Fa Shen',
    aliases: ['Ten Thousand World Fa Shen', 'Myriad Realm Spirit'],
    abbr: ['WJFS'],
  },
  {
    canonical: 'Spirit Blade Mountain',
    aliases: ['Lingjian Shan', 'Wang Ling', 'Spirit Sword Mountain', 'Reikenzan'],
    abbr: ['SBM', 'LJS'],
  },
  {
    canonical: 'Hero',
    aliases: ['Wu Geng Ji', 'Wugenji', 'Afterglow', 'Return of the Condor Heroes'],
    abbr: ['WGJ'],
  },
  {
    canonical: 'Fog Hill of Five Elements',
    aliases: ['Wu Shan Wu Xing', 'Wushan Wuxing', 'Five Elements Mountain Fog'],
    abbr: ['FHFE', 'WWWX'],
  },
  {
    canonical: 'Rakshasa Street',
    aliases: ['Ye Ye Ye Gui Jie', 'Luocha Jie', 'Luocha Street'],
    abbr: ['RS'],
  },
  {
    canonical: 'Grandmaster of Demonic Cultivation',
    aliases: ['Mo Dao Zu Shi', 'MDZS', 'The Founder of Diabolism', 'Wei Wuxian'],
    abbr: ['MDZS', 'GMDC'],
  },
  {
    canonical: 'Heaven Official\'s Blessing',
    aliases: ['Tian Guan Ci Fu', 'TGCF', 'Hua Cheng', 'Xie Lian'],
    abbr: ['TGCF', 'HOB'],
  },
  {
    canonical: 'Scumbag System',
    aliases: ['Ren Zha Fanpai Zijiu Xitong', 'Scum Villain\'s Self-Saving System', 'SVSSS'],
    abbr: ['SVSSS', 'SCV'],
  },
  {
    canonical: 'The Apothecary Diaries',
    aliases: ['Kusuriya no Hitorigoto', 'Maomao', 'Drug Store Soliloquy'],
    abbr: ['TAD'],
  },
  {
    canonical: 'Dragon Prince Yuan',
    aliases: ['Yuan Zun', 'Yuan Zun Donghua', 'Yuanzun'],
    abbr: ['DPY', 'YZ'],
  },
  {
    canonical: 'The Outcast',
    aliases: ['Yi Ren Zhi Xia', 'One Man Under Heaven', 'Yiren Zhixia'],
    abbr: ['TOC', 'YRZX'],
  },
  {
    canonical: 'Apotheosis',
    aliases: ['Bai Lian Cheng Shen', 'Bailuancheng Shen', 'Refine Into God', 'Forge Into God'],
    abbr: ['APOTH', 'BLCS'],
  },
  {
    canonical: 'Xiao Zhan',
    aliases: ['Sean Xiao', 'Wang Yibo', 'Chen Qing Ling'],
    abbr: [],
  },
  {
    canonical: 'Beware of the Brothers',
    aliases: ['Xiao Xin Ge Ge', 'Careful Brothers'],
    abbr: [],
  },
  {
    canonical: 'Link Click',
    aliases: ['Shiguang Dailiren', 'Time Agent', 'Shi Guang Dai Li Ren'],
    abbr: ['LC', 'SGDLR'],
  },
  {
    canonical: 'Scissor Seven',
    aliases: ['Qi Ge Yi', 'Cike Wu Liuqi', 'Hitman 77', 'Killer 77'],
    abbr: ['S7', 'SS7'],
  },
  {
    canonical: 'Wan Jie Xian Zong',
    aliases: ['Ten Thousand Realms Immortal Sect', 'Myriad Realms Immortal Sect'],
    abbr: ['WJXZ'],
  },
  {
    canonical: 'Cang Yuan Tu',
    aliases: ['Source of Cangyuan', 'Cangyuan Map'],
    abbr: ['CYT'],
  },
  {
    canonical: 'The Heaven Sword and Dragon Saber',
    aliases: ['Yi Tian Tu Long Ji', 'Heaven Sword Dragon Saber', 'Heavenly Sword Dragon Slaying Saber'],
    abbr: ['ITTLJ', 'HSDS'],
  },
  {
    canonical: 'Martial Master',
    aliases: ['Wu Shen Zhu Zai', 'Martial God Master', 'Wushen Zhuzai', 'God of Martial Arts'],
    abbr: ['MM', 'WSZZ', 'GMA'],
  },
  {
    canonical: 'Magic Empress',
    aliases: ['Ling Jian Zun', 'Ling Long', 'Linglong'],
    abbr: ['ME', 'LJZ'],
  },
  {
    canonical: 'Spirit Realm',
    aliases: ['Ling Yu', 'Soul Domain', 'Lingyu'],
    abbr: ['SR', 'LY'],
  },
  {
    canonical: 'Child of Light',
    aliases: ['Guang Zhi Zi', 'Child of Radiance', 'Guangzhi Zi'],
    abbr: ['COL', 'GZZ'],
  },
  {
    canonical: 'Shrouding the Heavens',
    aliases: ['Zhe Tian', 'Zhetian', 'Cover the Sky', 'Covering the Heavens'],
    abbr: ['STH', 'ZT'],
  },
  {
    canonical: 'Bai Yao Pu',
    aliases: ['Herbal Manual', 'Hundred Herbal Records'],
    abbr: ['BYP'],
  },
  {
    canonical: 'The Smiling Proud Wanderer',
    aliases: ['Xiao Ao Jiang Hu', 'Laughing Arrogantly in Rivers and Lakes'],
    abbr: ['SPW', 'XAJH'],
  },
  {
    canonical: 'Legend of Exorcism',
    aliases: ['Luo Xiao Hei', 'The Legend of Luo Xiaohei', 'Luo Xiaohei Zhan Ji'],
    abbr: ['LOE', 'LXH'],
  },
  {
    canonical: 'Di Wang Gong Lue',
    aliases: ['A Gallop Through the Emperor', 'Imperial Strategy'],
    abbr: ['DWGL'],
  },
  {
    canonical: 'The Blood of Youth',
    aliases: ['Shao Nian Ge Xing', 'Youth Blood Song', 'Shaonian Gexing'],
    abbr: ['TBY', 'SNGG'],
  },
  {
    canonical: 'Great Sage Equalling Heaven',
    aliases: ['Da Sheng Gui Lai', 'Monkey King Returns', 'Return of the Great Sage'],
    abbr: ['GSEH', 'DSGOL'],
  },
  {
    canonical: 'Faraway Wanderers',
    aliases: ['Shan He Ling', 'Word of Honor', 'Ye Baiyi', 'Zhou Zishu'],
    abbr: ['WOH', 'SHL', 'FW'],
  },
  {
    canonical: 'Spirit Cage',
    aliases: ['Ling Long: Incarnation', 'Linglong'],
    abbr: ['SC'],
  },
];

// ─── Normalisasi teks ─────────────────────────────────────────────────────────

/** Hapus karakter non-alfanumerik, lowercase, hapus spasi berlebih */
function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/['\-–—:·•]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Strip pinyin tone marks (ā→a, é→e, dll) */
function stripTones(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Singkatan dari judul: "Battle Through The Heavens" → "BTTH" */
function makeAbbr(title: string): string {
  return title
    .split(/\s+/)
    .filter(w => w.length > 2 || /^[A-Z]/.test(w))
    .map(w => w[0].toUpperCase())
    .join('');
}

/** Hitung Levenshtein distance antara dua string */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Similarity score 0-1 */
function similarity(a: string, b: string): number {
  const na = normalize(stripTones(a));
  const nb = normalize(stripTones(b));
  if (na === nb) return 1;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(na, nb) / maxLen;
}

// ─── LAYER 1: Cari di alias database ─────────────────────────────────────────
function searchAliasDB(query: string): string[] {
  const q = normalize(stripTones(query));
  const qUpper = query.toUpperCase().replace(/\s+/g, '');
  const results: string[] = [];

  for (const entry of DONGHUA_ALIAS_DB) {
    // Cek abbreviation (exact match)
    if (entry.abbr?.some(a => a.toUpperCase() === qUpper || a.toUpperCase() === query.toUpperCase())) {
      results.push(entry.canonical);
      continue;
    }

    // Cek canonical
    if (similarity(query, entry.canonical) >= 0.75) {
      results.push(entry.canonical);
      continue;
    }

    // Cek semua alias
    const aliasMatch = entry.aliases.some(alias => {
      const s = similarity(query, alias);
      return s >= 0.75;
    });
    if (aliasMatch) {
      results.push(entry.canonical);
      continue;
    }

    // Cek prefix / substring
    const normCanon = normalize(stripTones(entry.canonical));
    const normAllAliases = [entry.canonical, ...entry.aliases].map(a => normalize(stripTones(a)));
    if (q.length >= 4 && normAllAliases.some(a => a.includes(q) || q.includes(a.substring(0, Math.min(a.length, q.length + 3))))) {
      results.push(entry.canonical);
    }
  }

  return [...new Set(results)];
}

// ─── LAYER 2: Fuzzy search langsung ke API ───────────────────────────────────
// Tidak ada extra step — Jikan/AniList sudah punya fuzzy search sendiri
// Tapi kita normalisasi query dulu sebelum dikirim

function prepareQueryVariants(query: string): string[] {
  const variants = new Set<string>();
  variants.add(query.trim());

  const normalized = normalize(stripTones(query));
  if (normalized !== query.toLowerCase()) variants.add(normalized);

  // Coba hapus spasi (pinyin sering ditulis tanpa spasi)
  variants.add(query.replace(/\s+/g, ''));

  // Coba buat singkatan dari query multi-kata
  const words = query.trim().split(/\s+/);
  if (words.length >= 2) {
    const abbr = words.map(w => w[0]).join('').toUpperCase();
    if (abbr.length >= 2) variants.add(abbr);
  }

  return [...variants].filter(v => v.length >= 2);
}

// ─── LAYER 3: Groq AI expand query ──────────────────────────────────────────
const groqCache = new Map<string, string[]>();

async function expandQueryWithGroq(query: string): Promise<string[]> {
  if (groqCache.has(query)) return groqCache.get(query)!;

  const GROQ_API_KEY = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (!GROQ_API_KEY) return [];

  const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-8b-8192', 'gemma2-9b-it'];

  const prompt = `You are an expert on Chinese animated series (Donghua/Chinese anime). 
The user is searching for a Donghua with this query: "${query}"

This could be:
- A Chinese pinyin name (e.g. "Dou Po Cangqiong")
- An English title (e.g. "Battle Through the Heavens")
- An abbreviation (e.g. "BTTH")
- A partial or misspelled name

Provide up to 5 alternative search terms that could help find this Donghua on MyAnimeList or AniList. 
Include both the Chinese pinyin name and the English name if you know them.

Respond ONLY with a JSON array of strings, no explanation. Example: ["Battle Through the Heavens", "Dou Po Cangqiong", "Fights Break Sphere"]

If you don't know what this refers to, return: []`;

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
          max_tokens: 200,
          temperature: 0.1,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) continue;
      const data = await response.json();
      const text = data.choices?.[0]?.message?.content?.trim() || '[]';

      // Bersihkan response
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed: string[] = JSON.parse(cleaned);
      if (Array.isArray(parsed) && parsed.length > 0) {
        groqCache.set(query, parsed);
        return parsed;
      }
    } catch {
      // lanjut ke model berikutnya
    }
  }

  groqCache.set(query, []);
  return [];
}

// ─── LAYER 4: Search ke Jikan (MAL) + AniList ───────────────────────────────
const apiCache = new Map<string, AnimeSearchResult[]>();

async function searchJikanDonghua(query: string): Promise<AnimeSearchResult[]> {
  const cacheKey = `jikan:${query.toLowerCase()}`;
  if (apiCache.has(cacheKey)) return apiCache.get(cacheKey)!;

  try {
    const res = await fetch(
      `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=8&sfw=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) throw new Error(`Jikan ${res.status}`);
    const json = await res.json();

    const results: AnimeSearchResult[] = (json.data || []).map((item: any) => {
      const genreNames: string[] = [
        ...(item.genres || []).map((g: any) => g.name),
        ...(item.themes || []).map((t: any) => t.name),
      ].filter(Boolean);

      const synopsisRaw = item.synopsis?.replace(/\[Written by MAL Rewrite\]/g, '').trim() || '';
      const mediaType: string = item.type || '';
      const isMovie = mediaType.toUpperCase() === 'MOVIE' || mediaType.toUpperCase() === 'FILM';
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
        is_movie: isMovie,
        media_type: mediaType,
      } as AnimeSearchResult;
    });

    apiCache.set(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

async function searchAniListDonghua(query: string): Promise<AnimeSearchResult[]> {
  const cacheKey = `anilist:${query.toLowerCase()}`;
  if (apiCache.has(cacheKey)) return apiCache.get(cacheKey)!;

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

  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables: { search: query } }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const json = await res.json();

    const results: AnimeSearchResult[] = (json.data?.Page?.media || []).map((item: any) => {
      const synopsisRaw = item.description?.replace(/<[^>]*>/g, '').replace(/\n{3,}/g, '\n\n').trim() || '';
      const format: string = item.format || '';
      const isMovie = format.toUpperCase() === 'MOVIE';
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
      } as AnimeSearchResult;
    });

    apiCache.set(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

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

// ─── Merge + deduplikasi hasil ────────────────────────────────────────────────
function mergeResults(allResults: AnimeSearchResult[]): AnimeSearchResult[] {
  const merged: Map<string, AnimeSearchResult> = new Map();

  for (const r of allResults) {
    const key = r.mal_id?.toString() || r.anilist_id?.toString() || normalize(r.title);

    if (merged.has(key)) {
      // Merge data dari sumber berbeda
      const existing = merged.get(key)!;
      if (!existing.anilist_id && r.anilist_id) existing.anilist_id = r.anilist_id;
      if (!existing.mal_id && r.mal_id) existing.mal_id = r.mal_id;
      if (!existing.cover_url && r.cover_url) existing.cover_url = r.cover_url;
      if (!existing.synopsis && r.synopsis) { existing.synopsis = r.synopsis; existing.synopsis_en = r.synopsis_en; }
      if (!existing.score && r.score) existing.score = r.score;
      if (r.genres?.length && (!existing.genres?.length || existing.genres.length < r.genres.length)) {
        existing.genres = [...new Set([...(existing.genres || []), ...(r.genres || [])])];
      }
    } else {
      merged.set(key, { ...r });
    }
  }

  return Array.from(merged.values()).slice(0, 10);
}

// ─── Throttle untuk Jikan rate limiting (3 req/detik) ───────────────────────
let lastJikanRequest = 0;
async function throttledJikanSearch(query: string): Promise<AnimeSearchResult[]> {
  const now = Date.now();
  const delay = Math.max(0, 350 - (now - lastJikanRequest));
  if (delay > 0) await new Promise(r => setTimeout(r, delay));
  lastJikanRequest = Date.now();
  return searchJikanDonghua(query);
}

// ─── Export: translateToIndonesian (reuse dari useAnimeSearch) ───────────────
// Import ini perlu disesuaikan dengan path project kamu
// AnimeSearchResult already re-exported via line 21

// ─── Interface hook ───────────────────────────────────────────────────────────
export interface UseDonghuaSearchOptions {
  debounceMs?: number;
  minChars?: number;
}

export function useDonghuaSearch(options: UseDonghuaSearchOptions = {}) {
  const { debounceMs = 700, minChars = 2 } = options;

  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jikanOk, setJikanOk] = useState(true);
  const [anilistOk, setAnilistOk] = useState(true);
  const [searchLayer, setSearchLayer] = useState<'alias' | 'fuzzy' | 'ai' | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || query.length < minChars) {
      setResults([]);
      setError(null);
      setSearchLayer(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      setError(null);
      setSearchLayer(null);

      const allApiResults: AnimeSearchResult[] = [];
      const queriesSearched = new Set<string>();

      // ── LAYER 1: Alias database lokal ──────────────────────────────────────
      const aliasMatches = searchAliasDB(query);

      // ── LAYER 2: Variasi query dari normalisasi ─────────────────────────────
      const queryVariants = prepareQueryVariants(query);

      // Kumpulkan semua query terms untuk dipakai di Layer 4
      const allSearchTerms = [
        ...aliasMatches,         // dari alias DB
        ...queryVariants,         // variasi normalisasi
      ];

      // Jika alias ditemukan, tandai layer
      if (aliasMatches.length > 0) {
        setSearchLayer('alias');
      } else {
        setSearchLayer('fuzzy');
      }

      // ── LAYER 3: Groq AI expand (async, jalan paralel) ────────────────────
      // Mulai Groq request segera agar berjalan paralel dengan API search
      const groqPromise = expandQueryWithGroq(query);

      // ── LAYER 4: Search ke API dengan semua query terms ───────────────────
      // Ambil max 3 query terms terbaik untuk mencegah rate limit
      const priorityTerms = allSearchTerms.slice(0, 3);
      if (priorityTerms.length === 0) priorityTerms.push(query);

      // Search semua terms secara paralel (Jikan rate-limited, AniList bebas)
      const searchPromises = priorityTerms
        .filter(term => {
          if (queriesSearched.has(term.toLowerCase())) return false;
          queriesSearched.add(term.toLowerCase());
          return true;
        })
        .flatMap(term => [
          searchJikanDonghua(term),
          searchAniListDonghua(term),
        ]);

      const searchResults = await Promise.allSettled(searchPromises);

      let jikanSuccess = false;
      let anilistSuccess = false;

      for (const result of searchResults) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
          allApiResults.push(...result.value);
          // Deteksi source dari URL atau struktur data
          const hasJikan = result.value.some(r => r.mal_id);
          const hasAnilist = result.value.some(r => r.anilist_id && !r.mal_id);
          if (hasJikan) jikanSuccess = true;
          if (hasAnilist) anilistSuccess = true;
        }
      }

      // ── Tunggu Groq dan gunakan hasilnya jika hasil API masih minim ────────
      if (allApiResults.length < 3) {
        const groqTerms = await groqPromise;

        if (groqTerms.length > 0) {
          setSearchLayer('ai');

          // Search dengan Groq terms (max 2 tambahan)
          const newTerms = groqTerms
            .filter(t => !queriesSearched.has(t.toLowerCase()))
            .slice(0, 2);

          if (newTerms.length > 0) {
            const groqSearches = await Promise.allSettled(
              newTerms.flatMap(term => [
                searchJikanDonghua(term),
                searchAniListDonghua(term),
              ])
            );

            for (const result of groqSearches) {
              if (result.status === 'fulfilled' && result.value.length > 0) {
                allApiResults.push(...result.value);
                if (result.value.some(r => r.mal_id)) jikanSuccess = true;
                if (result.value.some(r => r.anilist_id && !r.mal_id)) anilistSuccess = true;
              }
            }
          }
        }
      } else {
        // Cancel Groq jika sudah ada hasil cukup
        groqPromise.catch(() => {}); // suppress unhandled
      }

      setJikanOk(jikanSuccess || allApiResults.some(r => r.mal_id !== undefined));
      setAnilistOk(anilistSuccess || allApiResults.some(r => r.anilist_id !== undefined));

      if (allApiResults.length === 0) {
        setError(
          aliasMatches.length > 0
            ? `Nama alternatif ditemukan (${aliasMatches[0]}), tapi API tidak merespons. Coba lagi.`
            : `Tidak ada hasil untuk "${query}". Coba nama lain, judul bahasa Inggris, atau singkatan.`
        );
        setResults([]);
      } else {
        setResults(mergeResults(allApiResults));
        setError(null);
      }

      setIsSearching(false);
    }, debounceMs);
  }, [debounceMs, minChars]);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setSearchLayer(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    results,
    isSearching,
    error,
    jikanOk,
    anilistOk,
    searchLayer, // 'alias' | 'fuzzy' | 'ai' | null — untuk debug/UI indicator
    search,
    clearResults,
  };
}

// ─── Export helper untuk dipakai di AnimeExtraFields.tsx ─────────────────────
export { searchAliasDB, prepareQueryVariants };