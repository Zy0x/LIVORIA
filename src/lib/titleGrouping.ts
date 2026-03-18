/**
 * titleGrouping.ts
 *
 * Utility untuk pengelompokkan judul anime/donghua secara cerdas.
 *
 * Aturan pengelompokkan:
 * - Movie (is_movie = true) TIDAK dikelompokkan dengan season biasa
 * - Movie bisa dikelompokkan sesama movie dari franchise yang sama
 *   HANYA jika parent_title diset secara manual
 * - Season biasa dikelompokkan berdasarkan base title + fuzzy similarity
 */

// ─── Pola yang menunjukkan sekuel / season ────────────────────────────────────
const SEQUEL_PATTERNS = [
  /\s+season\s+\d+$/i,
  /\s+s\d+$/i,
  /\s+\d+(?:st|nd|rd|th)\s+season$/i,
  /\s+part\s*\d+$/i,
  /\s+cour\s*\d+$/i,
  /\s+cours\s*\d+$/i,
  /\s+(?:II|III|IV|VI|VII|VIII|IX|XI|XII|XIII|XIV|XV)$/i,
  /\s+\d+$/,
  /:\s*.+$/,
  /\s+[-–—]\s*.+$/,
  /\s+続編$/,
  /\s+第\d+期$/,
  /\s+新シリーズ$/,
];

/** Pola yang mengindikasikan Movie */
const MOVIE_TITLE_PATTERNS = [
  /\s+(?:the\s+)?movie$/i,
  /\s+film$/i,
  /\s+gekijouban$/i,
  /\s+劇場版$/i,
  /\s+(?:the\s+)?motion\s+picture$/i,
];

/**
 * Deteksi apakah judul mengandung indikator movie dari judulnya saja.
 * (Auto-detect fallback jika is_movie belum diset)
 */
export function isTitleLikelyMovie(title: string): boolean {
  return MOVIE_TITLE_PATTERNS.some(p => p.test(title));
}

/**
 * Ekstrak base title dari judul anime untuk keperluan pengelompokkan.
 */
export function extractBaseTitle(title: string): string {
  let base = title.trim();
  for (const pattern of SEQUEL_PATTERNS) {
    base = base.replace(pattern, '').trim();
  }
  // Hapus pola movie dari base title juga
  for (const pattern of MOVIE_TITLE_PATTERNS) {
    base = base.replace(pattern, '').trim();
  }
  return normalizeForGrouping(base);
}

function normalizeForGrouping(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeForGrouping(a);
  const nb = normalizeForGrouping(b);

  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  if (nb.startsWith(na) || na.startsWith(nb)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    if (shorter >= 8 && shorter / longer >= 0.5) return 0.9;
  }

  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
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

export function getGroupKey(
  title: string,
  parentTitle: string | null | undefined
): string {
  if (parentTitle && parentTitle.trim()) {
    return normalizeForGrouping(parentTitle.trim());
  }
  return extractBaseTitle(title);
}

export interface GroupableItem {
  id: string;
  title: string;
  parent_title?: string | null;
  season?: number;
  /** Jika true, item ini adalah movie dan memiliki aturan grouping berbeda */
  is_movie?: boolean;
  [key: string]: any;
}

export function buildGroupMap<T extends GroupableItem>(
  items: T[]
): {
  displayList: T[];
  stackCounts: Record<string, number>;
  groupMap: Record<string, T[]>;
} {
  // ── Pisahkan movie dan non-movie ──────────────────────────────────────────
  const movieItems: T[] = [];
  const seriesItems: T[] = [];

  for (const item of items) {
    if (item.is_movie) {
      movieItems.push(item);
    } else {
      seriesItems.push(item);
    }
  }

  // ── Proses Series: grouping normal ────────────────────────────────────────
  const manualGroups = new Map<string, T[]>();
  const noParentItems: T[] = [];

  for (const item of seriesItems) {
    if (item.parent_title && item.parent_title.trim()) {
      const key = normalizeForGrouping(item.parent_title.trim());
      if (!manualGroups.has(key)) manualGroups.set(key, []);
      manualGroups.get(key)!.push(item);
    } else {
      noParentItems.push(item);
    }
  }

  const autoGroups: T[][] = [];
  const assigned = new Set<string>();

  for (let i = 0; i < noParentItems.length; i++) {
    const item = noParentItems[i];
    if (assigned.has(item.id)) continue;

    const baseI = extractBaseTitle(item.title);
    const group: T[] = [item];
    assigned.add(item.id);

    for (let j = i + 1; j < noParentItems.length; j++) {
      const other = noParentItems[j];
      if (assigned.has(other.id)) continue;

      const baseJ = extractBaseTitle(other.title);
      const sim = titleSimilarity(baseI, baseJ);
      const sameBase = baseI === baseJ && baseI.length >= 5;
      const highSimilarity = sim >= 0.85 && baseI.length >= 5;

      const normI = normalizeForGrouping(item.title);
      const normJ = normalizeForGrouping(other.title);
      const isPrefixMatch = (
        normJ.startsWith(normI + ' ') ||
        normI.startsWith(normJ + ' ')
      ) && Math.min(normI.length, normJ.length) >= 6;

      if (sameBase || highSimilarity || isPrefixMatch) {
        group.push(other);
        assigned.add(other.id);
      }
    }

    autoGroups.push(group);
  }

  const finalGroups: T[][] = [...manualGroups.values()];

  for (const autoGroup of autoGroups) {
    let mergedWithManual = false;
    const firstItem = autoGroup[0];
    const baseFirst = extractBaseTitle(firstItem.title);

    for (const [key, manualGroup] of manualGroups) {
      const manualFirstBase = extractBaseTitle(manualGroup[0].title);
      if (titleSimilarity(baseFirst, manualFirstBase) >= 0.85 ||
          titleSimilarity(baseFirst, key) >= 0.85) {
        manualGroup.push(...autoGroup);
        mergedWithManual = true;
        break;
      }
    }

    if (!mergedWithManual) {
      finalGroups.push(autoGroup);
    }
  }

  // ── Proses Movie ──────────────────────────────────────────────────────────
  // Movie dengan parent_title yang sama dikelompokkan (franchise movie).
  // Movie tanpa parent_title = standalone, tidak dikelompokkan sama sekali.
  const movieManualGroups = new Map<string, T[]>();
  const movieStandalone: T[] = [];

  for (const item of movieItems) {
    if (item.parent_title && item.parent_title.trim()) {
      const key = `__movie__${normalizeForGrouping(item.parent_title.trim())}`;
      if (!movieManualGroups.has(key)) movieManualGroups.set(key, []);
      movieManualGroups.get(key)!.push(item);
    } else {
      // Standalone movie — selalu tampil sendiri
      movieStandalone.push(item);
    }
  }

  // ── Build output ──────────────────────────────────────────────────────────
  const displayList: T[] = [];
  const stackCounts: Record<string, number> = {};
  const groupMapOutput: Record<string, T[]> = {};

  // Series groups
  for (const group of finalGroups) {
    if (group.length === 0) continue;

    const sorted = [...group].sort((a, b) => {
      const seasonDiff = (a.season || 1) - (b.season || 1);
      if (seasonDiff !== 0) return seasonDiff;
      return ((a as any).release_year || 0) - ((b as any).release_year || 0);
    });

    const representative = sorted[sorted.length - 1];
    displayList.push(representative);
    stackCounts[representative.id] = sorted.length - 1;
    groupMapOutput[representative.id] = sorted;
  }

  // Movie franchise groups
  for (const group of movieManualGroups.values()) {
    if (group.length === 0) continue;

    const sorted = [...group].sort((a, b) =>
      ((a as any).release_year || 0) - ((b as any).release_year || 0)
    );

    const representative = sorted[sorted.length - 1];
    displayList.push(representative);
    stackCounts[representative.id] = sorted.length - 1;
    groupMapOutput[representative.id] = sorted;
  }

  // Standalone movies — each is its own group of 1
  for (const item of movieStandalone) {
    displayList.push(item);
    stackCounts[item.id] = 0;
    groupMapOutput[item.id] = [item];
  }

  return { displayList, stackCounts, groupMap: groupMapOutput };
}