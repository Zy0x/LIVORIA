import { z } from 'zod';

export const MAX_IMPORT_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 2_000;

// ─── Field order resmi untuk CSV ─────────────────────────────────────────────
// URUTAN INI ADALAH "KONTRAK" ANTARA EKSPOR DAN IMPOR.
// Semua field DB yang relevan harus ada di sini.
export const ANIME_CSV_FIELDS = [
  // Identity (disertakan saat ekspor untuk referensi, di-exclude saat insert)
  'id',
  'user_id',
  // Core fields
  'title',
  'status',
  'genre',
  'rating',
  'episodes',
  'episodes_watched',
  'cover_url',
  'synopsis',
  'notes',
  // Series info
  'season',
  'cour',
  'streaming_url',
  'schedule',
  'parent_title',
  // Flags boolean
  'is_favorite',
  'is_bookmarked',
  'is_movie',
  'is_hentai',
  // Movie field
  'duration_minutes',
  // Extra dari MAL/AniList
  'release_year',
  'studio',
  'mal_url',
  'anilist_url',
  'mal_id',
  'anilist_id',
  'alternative_titles',
  // Watch tracking
  'watch_status',
  'watched_at',
  // Timestamps (readonly, tidak di-insert)
  'created_at',
] as const;

// ─── Valid enum values (sesuai DB constraint) ─────────────────────────────────
const VALID_STATUS       = new Set(['on-going', 'completed', 'planned']);
const VALID_WATCH_STATUS = new Set(['none', 'want_to_watch', 'watching', 'watched']);

export const mediaImportSchema = z.object({
  title: z.string().trim().min(1),
  status: z.enum(['on-going', 'completed', 'planned']),
  genre: z.string(),
  rating: z.number().min(0).max(10),
  episodes: z.number().min(0),
  episodes_watched: z.number().min(0),
  cover_url: z.string(),
  synopsis: z.string(),
  notes: z.string(),
  season: z.number().min(1),
  cour: z.string(),
  streaming_url: z.string(),
  schedule: z.string(),
  parent_title: z.string(),
  is_favorite: z.boolean(),
  is_bookmarked: z.boolean(),
  is_movie: z.boolean(),
  is_hentai: z.boolean(),
  duration_minutes: z.number().nullable(),
  release_year: z.number().nullable(),
  studio: z.string().nullable(),
  mal_url: z.string().nullable(),
  anilist_url: z.string().nullable(),
  mal_id: z.number().nullable(),
  anilist_id: z.number().nullable(),
  alternative_titles: z.string().nullable(),
  watch_status: z.enum(['none', 'want_to_watch', 'watching', 'watched']),
  watched_at: z.string().nullable(),
}).passthrough();

// ─── Tipe hasil impor langsung ────────────────────────────────────────────────

// ─── Type casting untuk CSV/JSON values ──────────────────────────────────────

const BOOLEAN_FIELDS = new Set([
  'is_favorite',
  'is_bookmarked',
  'is_movie',
  'is_hentai',
]);

const NUMBER_FIELDS = new Set([
  'rating',
  'season',
  'episodes',
  'episodes_watched',
  'mal_id',
  'anilist_id',
  'release_year',
  'duration_minutes',
  'harga_awal',
  'bunga_persen',
  'jangka_waktu_bulan',
  'cicilan_per_bulan',
  'total_dibayar',
  'total_hutang',
  'sisa_hutang',
  'keuntungan_estimasi',
  'denda_persen_per_hari',
  'tgl_bayar_hari',
  'tgl_tempo_hari',
]);

const NULLABLE_NUMBER_FIELDS = new Set([
  'mal_id',
  'anilist_id',
  'release_year',
  'duration_minutes',
  'episodes',
  'episodes_watched',
  'tgl_bayar_hari',
  'tgl_tempo_hari',
]);

/** Cast nilai CSV ke tipe yang tepat sesuai field DB */
export function castCSVValue(key: string, raw: string): unknown {
  // Boolean fields
  if (BOOLEAN_FIELDS.has(key)) {
    return raw === 'true' || raw === '1' || raw === 'TRUE';
  }
  // Number fields
  if (NUMBER_FIELDS.has(key)) {
    if (
      raw === '' || raw === 'null' ||
      raw === 'undefined' || raw === 'NaN'
    ) {
      return NULLABLE_NUMBER_FIELDS.has(key) ? null : 0;
    }
    const n = Number(raw);
    return isNaN(n)
      ? NULLABLE_NUMBER_FIELDS.has(key) ? null : 0
      : n;
  }
  // watch_status
  if (key === 'watch_status') {
    return VALID_WATCH_STATUS.has(raw) ? raw : 'none';
  }
  // status
  if (key === 'status') {
    return VALID_STATUS.has(raw) ? raw : 'planned';
  }
  // watched_at
  if (key === 'watched_at') {
    if (!raw || raw === 'null' || raw === 'undefined' || raw === '') return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : raw;
  }
  // alternative_titles — JSON string
  if (key === 'alternative_titles') {
    if (!raw || raw === 'null' || raw === 'undefined' || raw === '') return null;
    return raw;
  }
  // created_at / updated_at
  if (key === 'created_at' || key === 'updated_at') {
    if (!raw || raw === 'null' || raw === 'undefined') return null;
    return raw;
  }
  // String lain
  if (raw === 'null' || raw === 'undefined') return null;
  return raw;
}

/**
 * Sanitasi satu row dari import (JSON/CSV) agar sesuai schema DB.
 * Dipanggil oleh BulkImportDialog & directImportToSupabase sebelum insert.
 *
 * - Normalisasi semua tipe data
 * - Validasi enum constraints
 * - Default value untuk field wajib
 * - Exclude field yang tidak boleh di-insert (id, user_id — ditangani caller)
 * - Preserve alternative_titles sebagai JSON string
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function sanitizeImportRow(raw: unknown): Record<string, unknown> {
  const r = isRecord(raw) ? raw : {};

  const str = (v: unknown, fallback = ''): string =>
    v !== null && v !== undefined && v !== 'null' && v !== 'undefined'
      ? String(v)
      : fallback;

  const num = (v: unknown, fallback: number | null = 0): number | null => {
    if (v === null || v === undefined || v === '' || v === 'null') return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const bool = (v: unknown, fallback = false): boolean => {
    if (typeof v === 'boolean') return v;
    if (v === 'true'  || v === '1' || v === 1) return true;
    if (v === 'false' || v === '0' || v === 0) return false;
    return fallback;
  };

  const isoOrNull = (v: unknown): string | null => {
    if (!v || v === 'null' || v === 'undefined' || v === '') return null;
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : String(v);
  };

  const jsonOrNull = (v: unknown): string | null => {
    if (!v || v === 'null' || v === 'undefined' || v === '') return null;
    const s = String(v).trim();
    if (!s) return null;
    try {
      JSON.parse(s);
      return s;
    } catch {
      return null;
    }
  };

  const statusVal = (v: unknown): string => {
    const s = str(v, 'planned');
    return VALID_STATUS.has(s) ? s : 'planned';
  };

  const watchStatusVal = (v: unknown): string => {
    const s = str(v, 'none');
    return VALID_WATCH_STATUS.has(s) ? s : 'none';
  };

  // Sanitasi episodes_watched: jika status completed dan tidak ada nilai, pakai episodes
  const episodes  = num(r.episodes, 0) ?? 0;
  const epWatched = (() => {
    if (
      r.episodes_watched !== null &&
      r.episodes_watched !== undefined &&
      r.episodes_watched !== ''
    ) {
      return num(r.episodes_watched, 0) ?? 0;
    }
    if (str(r.status) === 'completed' && episodes > 0) return episodes;
    return 0;
  })();

  return {
    // Core
    title:            str(r.title, ''),
    status:           statusVal(r.status),
    genre:            str(r.genre, ''),
    rating:           num(r.rating, 0) ?? 0,
    episodes:         episodes,
    episodes_watched: epWatched,
    cover_url:        str(r.cover_url, ''),
    synopsis:         str(r.synopsis, ''),
    notes:            str(r.notes ?? r.note, ''),

    // Series
    season:           Math.max(1, num(r.season, 1) ?? 1),
    cour:             str(r.cour, ''),
    streaming_url:    str(r.streaming_url, ''),
    schedule:         str(r.schedule, ''),
    parent_title:     str(r.parent_title, ''),

    // Flags
    is_favorite:      bool(r.is_favorite,  false),
    is_bookmarked:    bool(r.is_bookmarked, false),
    is_movie:         bool(r.is_movie,      false),
    is_hentai:        bool(r.is_hentai,     false),

    // Movie
    duration_minutes: num(r.duration_minutes, null),

    // MAL/AniList
    release_year:       num(r.release_year, null),
    studio:             str(r.studio, '') || null,
    mal_url:            str(r.mal_url, '') || null,
    anilist_url:        str(r.anilist_url, '') || null,
    mal_id:             num(r.mal_id, null),
    anilist_id:         num(r.anilist_id, null),

    // Alternative titles (preserve JSON string)
    alternative_titles: jsonOrNull(r.alternative_titles),

    // Watch tracking
    watch_status: watchStatusVal(r.watch_status),
    watched_at:   isoOrNull(r.watched_at),
  };
}

// ─── CSV line parser (RFC 4180 compliant) ─────────────────────────────────────

export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current  = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);
  return result;
}
