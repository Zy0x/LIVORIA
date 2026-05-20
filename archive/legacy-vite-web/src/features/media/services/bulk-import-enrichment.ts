import type { BulkItem, SearchCandidate } from './bulk-import.types';
import {
  buildQueryVariants,
  calculateSeasonPenalty,
  detectCandidateSeason,
  extractBaseTitleFromApiTitle,
  extractCourFromTitle,
  extractSeasonFromTitle,
  getParentTitle,
  isCourMatch,
  mapStatus,
  normalizeTitle,
  similarity,
} from './bulk-import-normalization';

export type BulkImportLogType = 'info' | 'ok' | 'skip' | 'err';

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 1; i <= retries; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (r.status === 429) {
        await sleep(2500 * i);
        continue;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) {
      if (i === retries) throw e;
      await sleep(1500 * i);
    }
  }
}

export const ANILIST_GQL = `query($s:String){Page(page:1,perPage:8){media(search:$s,type:ANIME){
  id title{romaji english native}synonyms
  coverImage{extraLarge large}
  startDate{year}
  studios(isMain:true){nodes{name}}
  siteUrl episodes status
  description(asHtml:false)
  genres format duration averageScore
}}}`;

async function fetchCandidates(query: string, baseTitle: string): Promise<SearchCandidate[]> {
  const raw: SearchCandidate[] = [];

  await Promise.allSettled([
    (async () => {
      try {
        const r = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: ANILIST_GQL, variables: { s: query } }),
          signal: AbortSignal.timeout(8000),
        });
        const d = await r.json();
        for (const m of (d.data?.Page?.media || [])) {
          const titles = [m.title?.romaji, m.title?.english, m.title?.native, ...(m.synonyms || [])].filter(Boolean);
          const sim = Math.max(...titles.map((t: string) => similarity(baseTitle, t)));
          const apiTitle = m.title?.english || m.title?.romaji || '';
          raw.push({
            source: 'anilist',
            anilist_id: m.id,
            mal_id: null,
            title: apiTitle,
            title_english: m.title?.english || '',
            title_native: m.title?.native || '',
            cover_url: m.coverImage?.extraLarge || m.coverImage?.large || '',
            year: m.startDate?.year || null,
            episodes: m.episodes || null,
            score: m.averageScore ? m.averageScore / 10 : null,
            is_movie: m.format === 'MOVIE',
            similarity: sim,
            detectedSeason: detectCandidateSeason(apiTitle),
            _al: m,
            _jk: null,
          });
        }
      } catch {}
    })(),

    (async () => {
      try {
        const j = await fetchWithRetry(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=8`);
        for (const item of (j?.data || [])) {
          const titles = [
            item.title,
            item.title_english,
            item.title_japanese,
            ...(item.title_synonyms || []),
            ...(item.titles || []).map((t: any) => t.title),
          ].filter(Boolean);
          const sim = Math.max(...titles.map((t: string) => similarity(baseTitle, t)));
          const apiTitle = item.title_english || item.title || '';
          raw.push({
            source: 'jikan',
            mal_id: item.mal_id,
            anilist_id: null,
            title: apiTitle,
            title_native: item.title_japanese || '',
            cover_url: item.images?.jpg?.large_image_url || item.images?.jpg?.image_url || '',
            year: item.year || item.aired?.prop?.from?.year || null,
            episodes: item.episodes || null,
            score: item.score || null,
            is_movie: item.type === 'Movie',
            similarity: sim,
            detectedSeason: detectCandidateSeason(apiTitle),
            _al: null,
            _jk: item,
          });
        }
      } catch {}
    })(),
  ]);

  const seen = new Set<string>();
  const unique: SearchCandidate[] = [];
  for (const c of raw) {
    const k = `${c.source}-${c.anilist_id ?? ''}-${c.mal_id ?? ''}-${normalizeTitle(c.title)}`;
    if (!seen.has(k)) {
      seen.add(k);
      unique.push(c);
    }
  }
  return unique.sort((a, b) => b.similarity - a.similarity);
}

export async function searchWithAccuracy(title: string, season: number): Promise<SearchCandidate[]> {
  const variants = buildQueryVariants(title, season);
  const allResults = await Promise.all(variants.map(q => fetchCandidates(q, title)));
  const seen = new Set<string>();
  const unique: SearchCandidate[] = [];
  for (const batch of allResults) {
    for (const c of batch) {
      const k = `${c.source}-${c.anilist_id ?? ''}-${c.mal_id ?? ''}-${normalizeTitle(c.title)}`;
      if (!seen.has(k)) {
        seen.add(k);
        unique.push(c);
      }
    }
  }

  const withPenalty = unique.map(c => {
    const sim = c.similarity;
    const penalty = calculateSeasonPenalty(c.detectedSeason ?? null, season);
    let adjustedScore = sim - penalty;

    const targetCour = extractCourFromTitle(title);
    if (targetCour && !isCourMatch(targetCour, c.title)) {
      adjustedScore -= 0.4;
    }

    if (sim > 0.9 && (penalty > 0 || (targetCour && !isCourMatch(targetCour, c.title)))) {
      adjustedScore = Math.min(adjustedScore, 0.4);
    }

    return { ...c, _adjustedScore: Math.max(0, adjustedScore) };
  });

  withPenalty.sort((a, b) => (b as any)._adjustedScore - (a as any)._adjustedScore);
  const result = withPenalty.map(c => ({ ...c, similarity: (c as any)._adjustedScore }));
  return result.slice(0, 10);
}

export async function candidateToEnrichment(
  c: SearchCandidate,
  original: BulkItem,
  mediaType: 'anime' | 'donghua' = 'anime',
  addLog?: (msg: string, type: BulkImportLogType) => void,
): Promise<Partial<BulkItem>> {
  const al = c._al;
  const jk = c._jk;

  const bestTitle = (al?.title?.english || al?.title?.romaji) || (jk?.title_english || jk?.title) || original.title;
  const cover = al?.coverImage?.extraLarge || al?.coverImage?.large
    || jk?.images?.jpg?.large_image_url || jk?.images?.jpg?.image_url || '';

  const synopsisEn = al?.description
    ? al.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim()
    : jk?.synopsis
      ? jk.synopsis.replace(/\[Written by MAL Rewrite\]/g, '').trim()
      : '';
  const synopsisRaw = synopsisEn;

  const genreSet = new Set<string>();
  if (al?.genres) al.genres.forEach((g: string) => genreSet.add(g));
  if (jk?.genres) jk.genres.forEach((g: any) => genreSet.add(g.name));

  const studio = al?.studios?.nodes?.map((s: any) => s.name).join(', ')
    || jk?.studios?.map((s: any) => s.name).join(', ') || '';

  const year = al?.startDate?.year || jk?.year || jk?.aired?.prop?.from?.year || null;
  const episodes = al?.episodes || jk?.episodes || 0;
  const malId = jk?.mal_id || null;
  const anilistId = al?.id || null;
  const anilistUrl = al?.siteUrl || null;
  const malUrl = malId ? `https://myanimelist.net/anime/${malId}` : null;
  const isMovie = al?.format === 'MOVIE' || jk?.type === 'Movie';

  let dur: number | null = null;
  if (al?.duration) dur = al.duration;
  else if (jk?.duration) {
    const m = jk.duration.match(/(\d+)\s*min/);
    if (m) dur = +m[1];
  }

  const apiStatus = mapStatus(al?.status || jk?.status);

  let season = original.season >= 1 ? original.season : 1;
  let cour = original.cour || '';
  let parentTitle = original.parent_title || '';

  if (!isMovie) {
    if (!cour) {
      const detectedCour = extractCourFromTitle(original.title);
      if (detectedCour) cour = detectedCour;
    }
    if (!cour) {
      const detectedCourApi = extractCourFromTitle(bestTitle);
      if (detectedCourApi) cour = detectedCourApi;
    }
    if (original.season < 1) {
      const detectedSeasonFromOriginal = extractSeasonFromTitle(original.title);
      if (detectedSeasonFromOriginal && detectedSeasonFromOriginal >= 1) {
        season = detectedSeasonFromOriginal;
      }
    }
    if (season > 1 && !parentTitle) {
      const baseFromOriginal = extractBaseTitleFromApiTitle(original.title);
      if (baseFromOriginal && baseFromOriginal !== original.title) {
        parentTitle = baseFromOriginal;
      } else {
        parentTitle = getParentTitle(original.title, season);
      }
    }
  }

  let rating = original.rating || 0;
  const apiScore = al?.averageScore ? al.averageScore / 10 : jk?.score || 0;
  if (apiScore > 0 && rating === 0) {
    rating = Math.min(10, Math.round(apiScore * 10) / 10);
  }

  void mediaType;
  void addLog;

  return {
    title: bestTitle,
    cover_url: cover,
    synopsis: synopsisRaw,
    genre: [...genreSet].slice(0, 8).join(', '),
    studio,
    release_year: year,
    episodes,
    rating,
    mal_id: malId,
    anilist_id: anilistId,
    mal_url: malUrl || '',
    anilist_url: anilistUrl || '',
    is_movie: isMovie,
    duration_minutes: dur,
    status: apiStatus || original.status,
    season,
    cour,
    parent_title: parentTitle,
    enriched: true,
    enrichSource: [al ? 'AniList' : '', jk ? 'MAL' : ''].filter(Boolean).join('+') || c.source,
    matchConfidence: 'high',
    matchScore: c.similarity,
  };
}
