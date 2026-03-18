/**
 * titleGrouping.ts
 *
 * Utility untuk pengelompokkan judul anime/donghua secara cerdas.
 *
 * Masalah: Judul anime berbeda-beda formatnya untuk season yang sama:
 * - "Solo Leveling" vs "Solo Leveling Season 2"
 * - "Attack on Titan" vs "Shingeki no Kyojin: The Final Season"
 * - "Sword Art Online" vs "Sword Art Online II" vs "SAO: Alicization"
 *
 * Solusi: Ekstrak "base title" yang agresif + fuzzy matching
 */

// ─── Pola yang menunjukkan sekuel / season ────────────────────────────────────
const SEQUEL_PATTERNS = [
  // Season patterns
  /\s+season\s+\d+$/i,
  /\s+s\d+$/i,
  /\s+\d+(?:st|nd|rd|th)\s+season$/i,
  // Part/Cour patterns
  /\s+part\s*\d+$/i,
  /\s+cour\s*\d+$/i,
  /\s+cours\s*\d+$/i,
  // Roman numerals (II, III, IV, etc.)
  /\s+(?:II|III|IV|VI|VII|VIII|IX|XI|XII|XIII|XIV|XV)$/i,
  // Ordinal numerals
  /\s+\d+$/,
  // Common suffix patterns
  /:\s*.+$/,                    // Strip subtitle after colon: "Re:Zero - Season 2"
  /\s+[-–—]\s*.+$/,             // Strip after dash: "Attack on Titan - Final Season"
  // Japanese patterns
  /\s+続編$/,
  /\s+第\d+期$/,
  /\s+新シリーズ$/,
];

/**
 * Ekstrak base title dari judul anime untuk keperluan pengelompokkan.
 * Hasilnya digunakan sebagai kunci grup.
 */
export function extractBaseTitle(title: string): string {
  let base = title.trim();

  // Hapus pola sekuel satu per satu
  for (const pattern of SEQUEL_PATTERNS) {
    base = base.replace(pattern, '').trim();
  }

  // Normalisasi: lowercase, hapus tanda baca berlebih
  return normalizeForGrouping(base);
}

/**
 * Normalisasi string untuk perbandingan.
 */
function normalizeForGrouping(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')   // ganti non-alphanumeric dengan spasi
    .replace(/\s+/g, ' ')       // collapse whitespace
    .trim();
}

/**
 * Hitung similarity antara dua string menggunakan Levenshtein distance.
 * Return nilai antara 0 (sangat berbeda) sampai 1 (identik).
 */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeForGrouping(a);
  const nb = normalizeForGrouping(b);

  if (na === nb) return 1;
  if (na.length === 0 || nb.length === 0) return 0;

  // Check if one is a prefix of the other (common for sequel titles)
  if (nb.startsWith(na) || na.startsWith(nb)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    // Only group if the base is at least 8 chars and prefix is substantial
    if (shorter >= 8 && shorter / longer >= 0.5) return 0.9;
  }

  // Levenshtein
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

/**
 * Levenshtein distance (standard implementation).
 */
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

/**
 * Tentukan kunci grup untuk sebuah item anime/donghua.
 *
 * Prioritas:
 * 1. `parent_title` yang di-set manual oleh user → gunakan langsung
 * 2. Ekstrak base title dari judul → cari item lain dengan base title yang mirip
 */
export function getGroupKey(
  title: string,
  parentTitle: string | null | undefined
): string {
  if (parentTitle && parentTitle.trim()) {
    return normalizeForGrouping(parentTitle.trim());
  }
  return extractBaseTitle(title);
}

/**
 * Buat map pengelompokkan dari daftar item anime/donghua.
 * 
 * Algoritma:
 * 1. Item dengan parent_title yang sama → dikelompokkan
 * 2. Item tanpa parent_title → coba match berdasarkan base title + fuzzy similarity
 * 3. Minimum similarity threshold: 0.7 untuk auto-group
 *
 * Return: Map dari representativeId → AnimeItem[]
 */
export interface GroupableItem {
  id: string;
  title: string;
  parent_title?: string | null;
  season?: number;
  [key: string]: any;
}

export function buildGroupMap<T extends GroupableItem>(
  items: T[]
): {
  displayList: T[];
  stackCounts: Record<string, number>;
  groupMap: Record<string, T[]>;
} {
  // Phase 1: Kelompokkan berdasarkan parent_title (manual)
  const manualGroups = new Map<string, T[]>();
  const noParentItems: T[] = [];

  for (const item of items) {
    if (item.parent_title && item.parent_title.trim()) {
      const key = normalizeForGrouping(item.parent_title.trim());
      if (!manualGroups.has(key)) manualGroups.set(key, []);
      manualGroups.get(key)!.push(item);
    } else {
      noParentItems.push(item);
    }
  }

  // Phase 2: Auto-group item tanpa parent_title berdasarkan base title
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

      // Cek apakah base title cukup mirip
      const sim = titleSimilarity(baseI, baseJ);
      const sameBase = baseI === baseJ && baseI.length >= 5;
      const highSimilarity = sim >= 0.85 && baseI.length >= 5;

      // Juga cek apakah salah satu title adalah prefiks dari yang lain
      // (misal: "Solo Leveling" dan "Solo Leveling Season 2")
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

  // Phase 3: Gabungkan manual dan auto groups
  // Cek apakah ada auto-group yang bisa bergabung dengan manual group
  const finalGroups: T[][] = [...manualGroups.values()];

  for (const autoGroup of autoGroups) {
    // Cek apakah item ini cocok dengan manual group yang ada
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

  // Phase 4: Build output
  const displayList: T[] = [];
  const stackCounts: Record<string, number> = {};
  const groupMapOutput: Record<string, T[]> = {};

  for (const group of finalGroups) {
    if (group.length === 0) continue;

    // Sort by season
    const sorted = [...group].sort((a, b) => {
      const seasonDiff = (a.season || 1) - (b.season || 1);
      if (seasonDiff !== 0) return seasonDiff;
      return ((a as any).release_year || 0) - ((b as any).release_year || 0);
    });

    const representative = sorted[sorted.length - 1]; // Tampilkan yang terbaru
    displayList.push(representative);
    stackCounts[representative.id] = sorted.length - 1;
    groupMapOutput[representative.id] = sorted;
  }

  return { displayList, stackCounts, groupMap: groupMapOutput };
}