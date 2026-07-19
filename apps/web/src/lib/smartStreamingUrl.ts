/**
 * Smart streaming URL resolution.
 *
 * Given a URL like:
 *   https://anichin.cafe/100-000-years-of-refining-qi-episode-306-subtitle-indonesia/
 * and `episodesWatched = 306`, returns a next-episode URL:
 *   https://anichin.cafe/100-000-years-of-refining-qi-episode-307-subtitle-indonesia/
 *
 * Also handles URL variants used by other Indonesian/Chinese fansub sites:
 *   /episode-306/  |  /episode/306/  |  -eps-306-  |  -ep306-  |  -ep-306-
 *
 * If the URL is a bare series/landing page (no episode number detected), the
 * next URL is null — caller should offer only the original link.
 */

export interface SmartStreamResolution {
  originalUrl: string;
  detectedEpisode: number | null;
  nextEpisode: number | null;
  nextUrl: string | null;
  totalEpisodes: number | null;
  isFinished: boolean;
}

interface Pattern {
  re: RegExp;
  // capture group 1 = literal prefix to preserve, group 2 = episode number
}

const PATTERNS: Pattern[] = [
  { re: /(-episode-)(\d+)(?=[-/]|$)/i },
  { re: /(\/episode-)(\d+)(?=[-/]|$)/i },
  { re: /(\/episode\/)(\d+)(?=[-/]|$)/i },
  { re: /(-eps-)(\d+)(?=[-/]|$)/i },
  { re: /(-ep-)(\d+)(?=[-/]|$)/i },
  { re: /(-ep)(\d+)(?=[-/]|$)/i },
];

export function resolveSmartStreamUrl(
  url: string | null | undefined,
  episodesWatched: number | null | undefined,
  totalEpisodes: number | null | undefined = null,
): SmartStreamResolution {
  const originalUrl = (url || '').trim();
  const watched = Math.max(0, Number(episodesWatched) || 0);
  const total = totalEpisodes && totalEpisodes > 0 ? totalEpisodes : null;

  const empty: SmartStreamResolution = {
    originalUrl,
    detectedEpisode: null,
    nextEpisode: null,
    nextUrl: null,
    totalEpisodes: total,
    isFinished: false,
  };

  if (!originalUrl) return empty;

  for (const p of PATTERNS) {
    const m = originalUrl.match(p.re);
    if (!m) continue;
    const detected = parseInt(m[2], 10);
    if (!Number.isFinite(detected)) continue;

    // Next episode = max(URL episode, watched) + 1
    const base = Math.max(detected, watched);
    const next = base + 1;

    // Respect total episodes cap (if known)
    if (total !== null && next > total) {
      return { ...empty, detectedEpisode: detected, nextEpisode: null, isFinished: true };
    }

    // Preserve original episode-number digit width (e.g. "007" → "008") when
    // the site uses zero-padding, but keep natural numbers otherwise.
    const padded = m[2].startsWith('0') && m[2].length > String(next).length
      ? String(next).padStart(m[2].length, '0')
      : String(next);

    const nextUrl = originalUrl.replace(p.re, `${m[1]}${padded}`);
    return {
      originalUrl,
      detectedEpisode: detected,
      nextEpisode: next,
      nextUrl,
      totalEpisodes: total,
      isFinished: false,
    };
  }

  // No pattern matched: cannot safely build a next URL.
  return empty;
}