/**
 * titleGrouping.ts — LIVORIA
 *
 * Utility pengelompokan judul anime/donghua secara cerdas.
 *
 * ATURAN PENGELOMPOKAN:
 * ─────────────────────
 * SERIAL (is_movie = false):
 *   • Dikelompokkan berdasarkan parent_title (jika diisi) atau base title otomatis.
 *   • Beberapa season/cour ditumpuk menjadi satu card (stack fan effect).
 *   • Urutan: S1 → S2 → S2 Part 2 → S2 Part 3 → S3 → S3 Part 2 → S4 Part 1 → ...
 *
 * MOVIE (is_movie = true):
 *   • Tanpa parent_title → standalone, selalu tampil sendiri (tidak distack).
 *   • Dengan parent_title diisi → dikelompokkan sesama movie franchise yang sama.
 *   • TIDAK pernah dikelompokkan bersama serial, meski nama mirip.
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

/** Pola yang mengindikasikan Movie dari judulnya saja */
const MOVIE_TITLE_PATTERNS = [
  /\s+(?:the\s+)?movie$/i,
  /\s+film$/i,
  /\s+gekijouban$/i,
  /\s+劇場版$/i,
  /\s+(?:the\s+)?motion\s+picture$/i,
];

// ─── Helper: normalise string ─────────────────────────────────────────────────
function normalizeForGrouping(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Ekstrak angka part/cour dari string cour.
 * "Part 2" → 2, "Cour 3" → 3, "2nd Cour" → 2, "" → 0
 */
function extractPartNumber(cour: string | undefined | null): number {
  if (!cour) return 0;
  const match = String(cour).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

/**
 * Deteksi apakah judul mengandung indikator movie dari judulnya saja.
 */
export function isTitleLikelyMovie(title: string): boolean {
  return MOVIE_TITLE_PATTERNS.some(p => p.test(title));
}

/**
 * Ekstrak base title dari judul anime untuk keperluan pengelompokan.
 */
export function extractBaseTitle(title: string): string {
  let base = title.trim();
  for (const pattern of SEQUEL_PATTERNS) {
    base = base.replace(pattern, '').trim();
  }
  for (const pattern of MOVIE_TITLE_PATTERNS) {
    base = base.replace(pattern, '').trim();
  }
  return normalizeForGrouping(base);
}

export function titleSimilarity(a: string, b: string): number {
  const na = normalizeForGrouping(a);
  const nb = normalizeForGrouping(b);

  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  if (nb.startsWith(na) || na.startsWith(nb)) {
    const shorter = Math.min(na.length, nb.length);
    const longer  = Math.max(na.length, nb.length);
    if (shorter >= 8 && shorter / longer >= 0.5) return 0.9;
  }

  const dist   = levenshtein(na, nb);
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

// ─── Interface ────────────────────────────────────────────────────────────────
export interface GroupableItem {
  id: string;
  title: string;
  parent_title?: string | null;
  season?: number;
  /** Cour/Part string, cth: "Part 2", "Cour 3" */
  cour?: string | null;
  /** True jika item ini adalah movie (bukan serial) */
  is_movie?: boolean;
  [key: string]: any;
}

// ─── Comparator untuk urutan season → cour/part → release_year ───────────────
/**
 * Urutkan item dalam satu kelompok secara benar:
 * S1 → S2 → S2 Part 2 → S2 Part 3 → S3 → S3 Part 2 → ...
 */
function compareSeriesOrder<T extends GroupableItem>(a: T, b: T): number {
  // 1. Season
  const seasonA = a.season || 1;
  const seasonB = b.season || 1;
  const seasonDiff = seasonA - seasonB;
  if (seasonDiff !== 0) return seasonDiff;

  // 2. Cour/Part number (Part 1 < Part 2 < Part 3)
  const courA = extractPartNumber(a.cour);
  const courB = extractPartNumber(b.cour);
  const courDiff = courA - courB;
  if (courDiff !== 0) return courDiff;

  // 3. Tahun rilis
  return ((a as any).release_year || 0) - ((b as any).release_year || 0);
}

// ─── Main grouping function ───────────────────────────────────────────────────
export function buildGroupMap<T extends GroupableItem>(
  items: T[]
): {
  displayList: T[];
  stackCounts: Record<string, number>;
  groupMap: Record<string, T[]>;
} {
  // ── Pisah movie vs serial ─────────────────────────────────────────────────
  const movieItems:  T[] = [];
  const seriesItems: T[] = [];

  for (const item of items) {
    if (item.is_movie || isTitleLikelyMovie(item.title)) {
      movieItems.push(item);
    } else {
      seriesItems.push(item);
    }
  }

  // ── SERIAL: grouping berdasarkan parent_title atau base title ─────────────
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

  // Auto-grouping berdasarkan similarity judul
  const autoGroups: T[][] = [];
  const assigned   = new Set<string>();

  for (let i = 0; i < noParentItems.length; i++) {
    const item = noParentItems[i];
    if (assigned.has(item.id)) continue;

    const baseI = extractBaseTitle(item.title);
    const group: T[] = [item];
    assigned.add(item.id);

    for (let j = i + 1; j < noParentItems.length; j++) {
      const other = noParentItems[j];
      if (assigned.has(other.id)) continue;

      const baseJ       = extractBaseTitle(other.title);
      const sim         = titleSimilarity(baseI, baseJ);
      const sameBase    = baseI === baseJ && baseI.length >= 5;
      const highSim     = sim >= 0.85 && baseI.length >= 5;

      const normI       = normalizeForGrouping(item.title);
      const normJ       = normalizeForGrouping(other.title);
      const isPrefixMatch = (
        normJ.startsWith(normI + ' ') ||
        normI.startsWith(normJ + ' ')
      ) && Math.min(normI.length, normJ.length) >= 6;

      if (sameBase || highSim || isPrefixMatch) {
        group.push(other);
        assigned.add(other.id);
      }
    }

    autoGroups.push(group);
  }

  const finalGroups: T[][] = [...manualGroups.values()];

  for (const autoGroup of autoGroups) {
    let mergedWithManual = false;
    const firstItem  = autoGroup[0];
    const baseFirst  = extractBaseTitle(firstItem.title);

    for (const [key, manualGroup] of manualGroups) {
      const manualFirstBase = extractBaseTitle(manualGroup[0].title);
      if (
        titleSimilarity(baseFirst, manualFirstBase) >= 0.85 ||
        titleSimilarity(baseFirst, key) >= 0.85
      ) {
        manualGroup.push(...autoGroup);
        mergedWithManual = true;
        break;
      }
    }

    if (!mergedWithManual) {
      finalGroups.push(autoGroup);
    }
  }

  // ── MOVIE: franchise (parent_title sama) vs standalone ───────────────────
  const movieFranchiseGroups = new Map<string, T[]>();
  const movieStandalone:      T[] = [];

  for (const item of movieItems) {
    if (item.parent_title && item.parent_title.trim()) {
      const key = `__movie_franchise__${normalizeForGrouping(item.parent_title.trim())}`;
      if (!movieFranchiseGroups.has(key)) movieFranchiseGroups.set(key, []);
      movieFranchiseGroups.get(key)!.push(item);
    } else {
      movieStandalone.push(item);
    }
  }

  // ── Build output ──────────────────────────────────────────────────────────
  const displayList: T[]                  = [];
  const stackCounts: Record<string, number> = {};
  const groupMapOutput: Record<string, T[]> = {};

  // Serial groups — urutan: season ASC → cour/part ASC → release_year ASC
  // Representative = item terbaru (indeks terakhir setelah sort)
  for (const group of finalGroups) {
    if (group.length === 0) continue;

    const sorted = [...group].sort(compareSeriesOrder);

    const representative = sorted[sorted.length - 1];
    displayList.push(representative);
    stackCounts[representative.id]  = sorted.length - 1;
    groupMapOutput[representative.id] = sorted;
  }

  // Movie franchise groups — urutkan berdasarkan release_year
  for (const group of movieFranchiseGroups.values()) {
    if (group.length === 0) continue;

    const sorted = [...group].sort((a, b) =>
      ((a as any).release_year || 0) - ((b as any).release_year || 0)
    );

    const representative = sorted[sorted.length - 1];
    displayList.push(representative);
    stackCounts[representative.id]  = sorted.length - 1;
    groupMapOutput[representative.id] = sorted;
  }

  // Standalone movies — masing-masing tampil sendiri
  for (const item of movieStandalone) {
    displayList.push(item);
    stackCounts[item.id]  = 0;
    groupMapOutput[item.id] = [item];
  }

  return { displayList, stackCounts, groupMap: groupMapOutput };
}

// ─── Util: sort group by season → cour → year ────────────────────────────────
export function sortGroupBySeason<T extends GroupableItem>(group: T[]): T[] {
  return [...group].sort((a, b) => {
    if (a.is_movie && b.is_movie) {
      return ((a as any).release_year || 0) - ((b as any).release_year || 0);
    }
    return compareSeriesOrder(a, b);
  });
}

/**
 * Cek apakah sebuah item adalah movie (gabungan field + deteksi judul).
 */
export function isMovieItem(item: GroupableItem): boolean {
  return !!item.is_movie || isTitleLikelyMovie(item.title);
}