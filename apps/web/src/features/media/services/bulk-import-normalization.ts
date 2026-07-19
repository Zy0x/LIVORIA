import type { BulkItem } from './bulk-import.types';

const VALID_STATUS = new Set(['on-going', 'completed', 'planned']);
const VALID_WATCH_STATUS = new Set(['none', 'want_to_watch', 'watching', 'watched']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function validateStatus(v: unknown): 'on-going' | 'completed' | 'planned' {
  const s = String(v || '').trim();
  return (VALID_STATUS.has(s) ? s : 'planned') as 'on-going' | 'completed' | 'planned';
}

export function validateWatchStatus(v: unknown): 'none' | 'want_to_watch' | 'watching' | 'watched' {
  const s = String(v || '').trim();
  return (VALID_WATCH_STATUS.has(s) ? s : 'none') as 'none' | 'want_to_watch' | 'watching' | 'watched';
}

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(the|a|an|no|wo|wa|ga|de|ni|to|season|part|cour)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    for (let j = 1; j <= n; j++) {
      dp[i][j] = i === 0 ? j
        : a[i - 1] === b[j - 1] ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function similarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (na === nb) return 1;
  if (!na || !nb) return 0;

  const wordsA = na.split(' ').filter(Boolean).sort();
  const wordsB = nb.split(' ').filter(Boolean).sort();
  if (wordsA.join(' ') === wordsB.join(' ')) return 0.98;

  const sh = na.length < nb.length ? na : nb;
  const lo = na.length < nb.length ? nb : na;
  if (lo.startsWith(sh) && sh.length >= 5) return 0.95;

  const tokA = new Set(na.split(' ').filter(t => t.length > 2));
  const tokB = new Set(nb.split(' ').filter(t => t.length > 2));
  const inter = [...tokA].filter(t => tokB.has(t)).length;
  const union = new Set([...tokA, ...tokB]).size;
  const jaccard = union > 0 ? inter / union : 0;
  const lev = 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);

  let score = Math.max(jaccard * 0.6 + lev * 0.4, lev * 0.3 + jaccard * 0.7);
  if (lo.includes(sh) && sh.length >= 4) score = Math.max(score, 0.85);
  return score;
}

export function extractSeasonFromTitle(title: string): number | null {
  const sMatch = title.match(/\b(?:season|s)\s*(\d+)\b/i);
  if (sMatch) {
    const n = parseInt(sMatch[1], 10);
    if (n >= 1 && n <= 25) return n;
  }

  const ordinalSeason = title.match(/\b(\d+)(?:st|nd|rd|th)\s+season\b/i);
  if (ordinalSeason) {
    const n = parseInt(ordinalSeason[1], 10);
    if (n >= 1 && n <= 25) return n;
  }

  const romanRegex = /\b(II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\b$/i;
  const romanSepRegex = /(?::\s*|\s+-\s+|\s+Part\s+)(II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)\b/i;
  const rMatch = title.match(romanRegex) || title.match(romanSepRegex);
  if (rMatch) {
    const roman = rMatch[1].toUpperCase();
    const romanMap: Record<string, number> = {
      I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12,
    };
    if (romanMap[roman]) return romanMap[roman];
  }

  const endNum = title.match(/\s+(\d+)$/);
  if (endNum) {
    const n = parseInt(endNum[1], 10);
    if (n >= 2 && n <= 15) return n;
  }

  return null;
}

export function extractCourFromTitle(title: string): string | null {
  const patterns = [
    /\b(part\s*\d+)\b/i,
    /\b(cour\s*\d+)\b/i,
    /\b(cours\s*\d+)\b/i,
    /\b(\d+st|\d+nd|\d+rd|\d+th)\s+cour/i,
  ];
  for (const p of patterns) {
    const m = title.match(p);
    if (m) return m[1];
  }
  return null;
}

export function extractBaseTitleFromApiTitle(title: string): string {
  return title
    .replace(/\s+(?:season|s)\s*\d+/gi, '')
    .replace(/\s+\d+(?:st|nd|rd|th)\s+season/gi, '')
    .replace(/\s+part\s*\d+/gi, '')
    .replace(/\s+cour\s*\d+/gi, '')
    .replace(/\s+(?:II|III|IV|V|VI|VII|VIII|IX|X|XI|XII)$/i, '')
    .replace(/\s+\d+$/, '')
    .trim();
}

export function getParentTitle(title: string, season: number): string {
  if (season <= 1) return '';
  const base = extractBaseTitleFromApiTitle(title);
  if (base && base !== title) return base;
  return title
    .replace(/\s+(season|s)\s*\d+/gi, '')
    .replace(/:\s*season.*/gi, '')
    .trim();
}

export function detectCandidateSeason(candidateTitle: string): number | null {
  const extracted = extractSeasonFromTitle(candidateTitle);
  if (extracted !== null) return extracted;
  return 1;
}

export function calculateSeasonPenalty(candidateSeason: number | null, targetSeason: number): number {
  if (candidateSeason === null) return 0;
  if (targetSeason <= 1 && candidateSeason <= 1) return 0;
  if (candidateSeason === targetSeason) return 0;
  const diff = Math.abs(candidateSeason - targetSeason);
  return Math.min(0.8, 0.4 + diff * 0.2);
}

export function buildQueryVariants(title: string, season: number): string[] {
  const v = new Set<string>();
  const base = title
    .replace(/\s+(season|s)\s*\d+/gi, '')
    .replace(/\s+(part|cour)\s*\d+/gi, '')
    .replace(/\s+\d+$/, '')
    .replace(/\s+(II|III|IV|VI|VII|VIII|IX|X)$/i, '')
    .trim();
  const cleanBase = base || title.trim();
  v.add(cleanBase);
  if (season > 1 && cleanBase) {
    v.add(`${cleanBase} season ${season}`);
    v.add(`${cleanBase} ${season}`);
  }
  return [...v].filter(x => x.length >= 2).slice(0, 3);
}

export function isCourMatch(targetCour: string, candidateTitle: string): boolean {
  if (!targetCour) return true;
  const cCour = extractCourFromTitle(candidateTitle);
  if (!cCour) return true;
  const nt = targetCour.toLowerCase().replace(/\s+/g, '');
  const nc = cCour.toLowerCase().replace(/\s+/g, '');
  return nt === nc;
}

export function scoreToConfidence(s: number): 'high' | 'medium' | 'low' | 'none' {
  if (s >= 0.75) return 'high';
  if (s >= 0.45) return 'medium';
  if (s > 0) return 'low';
  return 'none';
}

export function interpretNote(note: string): { is_favorite: boolean; is_bookmarked: boolean } {
  const n = (note || '').trim();
  if (n === '**') return { is_favorite: false, is_bookmarked: true };
  if (n === 'OP') return { is_favorite: true, is_bookmarked: false };
  if (n === '*') return { is_favorite: true, is_bookmarked: true };

  const hasDoubleStar = n.includes('**');
  const hasSingleStar = n.includes('*') && !hasDoubleStar;
  const hasOP = /\bOP\b/.test(n);

  if (hasSingleStar) return { is_favorite: true, is_bookmarked: true };
  if (hasDoubleStar) return { is_favorite: false, is_bookmarked: true };
  if (hasOP) return { is_favorite: true, is_bookmarked: false };
  if (n === 'Sad' || n === 'Romance') return { is_favorite: true, is_bookmarked: true };

  return { is_favorite: false, is_bookmarked: false };
}

export function mapStatus(s?: string): 'on-going' | 'completed' | 'planned' | null {
  if (!s) return null;
  const l = s.toLowerCase().replace(/_/g, ' ').trim();
  if (l.includes('releasing') || (l.includes('airing') && !l.includes('finished'))) return 'on-going';
  if (l.includes('finished') || l === 'completed' || l === 'cancelled') return 'completed';
  if (l.includes('not yet') || l === 'upcoming' || l === 'hiatus') return 'planned';
  return null;
}

export function buildBulkItemFromRaw(raw: unknown, defaultStatus: BulkItem['status'] = 'completed'): BulkItem | null {
  const obj = isRecord(raw) ? raw : {};
  const title = (
    obj.title || obj.Title || obj.judul || ''
  ).toString().trim();

  if (!title) return null;

  const bool = (v: unknown, fallback = false): boolean => {
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === '1' || v === 1) return true;
    if (v === 'false' || v === '0' || v === 0) return false;
    return fallback;
  };

  const num = (v: unknown, fallback: number | null = 0): number | null => {
    if (v === null || v === undefined || v === '' || v === 'null' || v === 'undefined') return fallback;
    const n = Number(v);
    return Number.isNaN(n) ? fallback : n;
  };

  const str = (v: unknown, fallback = ''): string => {
    if (v === null || v === undefined || v === 'null' || v === 'undefined') return fallback;
    return String(v).trim();
  };

  const noteRaw = str(obj.note ?? obj.notes ?? obj.Note ?? '');
  const { is_favorite: noteFav, is_bookmarked: noteBm } = interpretNote(noteRaw);

  const episodesTotal = num(obj.episodes ?? obj.Episodes, undefined) ?? undefined;
  const episodesWatched = (() => {
    const ew = num(obj.episodes_watched ?? obj.episodesWatched, -1);
    if (ew !== null && ew >= 0) return ew;
    const st = str(obj.status);
    if ((st === 'completed' || st === defaultStatus) && episodesTotal) return episodesTotal;
    return 0;
  })();

  const statusRaw = str(obj.status ?? obj.Status, defaultStatus);
  const status = validateStatus(statusRaw !== '' ? statusRaw : defaultStatus);
  const watchStatus = validateWatchStatus(obj.watch_status ?? obj.watchStatus);

  const watchedAtRaw = str(obj.watched_at ?? obj.watchedAt, '');
  const watchedAt = watchedAtRaw && watchedAtRaw !== 'null' ? watchedAtRaw : null;

  const altTitlesRaw = (() => {
    const v = obj.alternative_titles ?? obj.alternativeTitles;
    if (!v || v === 'null' || v === 'undefined' || v === '') return null;
    const s = String(v).trim();
    if (!s) return null;
    try {
      JSON.parse(s);
      return s;
    } catch {
      return null;
    }
  })();

  const isFromLivoriaExport = !!(
    obj.cover_url &&
    (obj.genre || obj.synopsis) &&
    (obj.mal_id != null || obj.anilist_id != null)
  );

  const item: BulkItem = {
    title,
    originalTitle: title,
    season: Math.max(1, num(obj.season ?? obj.Season, 1) ?? 1),
    cour: str(obj.cour, ''),
    rating: num(obj.rating ?? obj.Rating, 0) ?? 0,
    note: noteRaw,
    status,
    is_favorite: bool(obj.is_favorite ?? obj.isFavorite, noteFav),
    is_bookmarked: bool(obj.is_bookmarked ?? obj.isBookmarked, noteBm),
    is_movie: bool(obj.is_movie ?? obj.isMovie, false),
    is_hentai: bool(obj.is_hentai ?? obj.isHentai, false),
    genre: str(obj.genre, ''),
    parent_title: str(obj.parent_title ?? obj.parentTitle, ''),
    cover_url: str(obj.cover_url ?? obj.coverUrl, ''),
    synopsis: str(obj.synopsis, ''),
    studio: str(obj.studio, ''),
    release_year: num(obj.release_year ?? obj.releaseYear, null),
    episodes: episodesTotal,
    episodes_watched: episodesWatched,
    mal_id: num(obj.mal_id ?? obj.malId, null),
    anilist_id: num(obj.anilist_id ?? obj.anilistId, null),
    mal_url: str(obj.mal_url ?? obj.malUrl, ''),
    anilist_url: str(obj.anilist_url ?? obj.anilistUrl, ''),
    duration_minutes: num(obj.duration_minutes ?? obj.durationMinutes, null),
    alternative_titles: altTitlesRaw,
    streaming_url: str(obj.streaming_url ?? obj.streamingUrl, ''),
    main_url: str(obj.main_url ?? obj.mainUrl, ''),
    schedule: str(obj.schedule, ''),
    watch_status: watchStatus,
    watched_at: watchedAt,
  };

  if (isFromLivoriaExport) {
    item.enriched = true;
    item.enrichSource = 'Import';
    item.matchConfidence = 'high';
    item.matchScore = 1.0;
  }

  return item;
}
