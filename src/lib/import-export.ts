/**
 * import-export.ts — LIVORIA
 *
 * Ekspor & Impor data anime/donghua.
 *
 * PERBAIKAN ROUNDTRIP (v4):
 * ─────────────────────────
 * - ANIME_CSV_FIELDS sekarang memuat SEMUA field DB secara eksplisit
 *   termasuk is_movie, duration_minutes, watch_status, watched_at,
 *   alternative_titles, mal_id, anilist_id, release_year, studio, dll.
 * - exportToJSON memastikan semua field dari ANIME_CSV_FIELDS ikut ter-ekspor
 *   dengan nilai null jika kosong (bukan undefined) agar JSON konsisten.
 * - exportToCSV menggunakan urutan field tetap (ANIME_CSV_FIELDS) lalu
 *   field ekstra di belakang.
 * - importFromCSV men-cast boolean, number, JSON, dan date dengan benar.
 * - sanitizeImportRow adalah satu-satunya normalisasi sebelum insert ke DB.
 * - directImportToSupabase mendukung insert_only / upsert / replace_all.
 */

import { supabase } from './supabase';

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

// ─── Tipe hasil impor langsung ────────────────────────────────────────────────
export interface DirectImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ title: string; reason: string }>;
  total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob(['\uFEFF' + content], { type });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCSVField(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (
    str.includes(',') || str.includes('"') ||
    str.includes('\n') || str.includes('\r') ||
    str.includes('{') || str.includes('[')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── Ekspor ───────────────────────────────────────────────────────────────────

/**
 * Ekspor ke JSON — memuat SEMUA field yang didefinisikan di ANIME_CSV_FIELDS
 * plus field lain yang ada di data.
 * Format yang direkomendasikan untuk backup/restore penuh (roundtrip sempurna).
 */
export function exportToJSON(data: any[], filename: string) {
  const sanitizedData = data.map((row) => {
    const result: Record<string, unknown> = {};
    // Masukkan semua field dari ANIME_CSV_FIELDS terlebih dahulu
    for (const field of ANIME_CSV_FIELDS) {
      // Gunakan null (bukan undefined) agar JSON konsisten
      result[field] = row[field] !== undefined ? row[field] : null;
    }
    // Masukkan field ekstra yang tidak ada di ANIME_CSV_FIELDS
    for (const key of Object.keys(row)) {
      if (!(ANIME_CSV_FIELDS as readonly string[]).includes(key)) {
        result[key] = row[key];
      }
    }
    return result;
  });

  const json = JSON.stringify(sanitizedData, null, 2);
  downloadFile(json, `${filename}.json`, 'application/json');
}

/**
 * Ekspor ke CSV — menggunakan field order tetap dari ANIME_CSV_FIELDS
 * diikuti field ekstra yang tidak ada di daftar.
 */
export function exportToCSV(data: any[], filename: string) {
  if (data.length === 0) return;

  // Kumpulkan semua key yang ada di data
  const allKeys = new Set<string>();
  for (const row of data) {
    Object.keys(row).forEach((k) => allKeys.add(k));
  }

  // Urutan: field resmi dulu, sisanya di belakang
  const orderedFields = [...ANIME_CSV_FIELDS].filter((f) => allKeys.has(f));
  const extraFields   = [...allKeys].filter(
    (k) => !(ANIME_CSV_FIELDS as readonly string[]).includes(k)
  );
  const headers = [...orderedFields, ...extraFields];

  const csvRows = [
    headers.map(escapeCSVField).join(','),
    ...data.map((row) =>
      headers.map((h) => escapeCSVField(row[h])).join(',')
    ),
  ];

  downloadFile(
    csvRows.join('\n'),
    `${filename}.csv`,
    'text/csv;charset=utf-8'
  );
}

// ─── Impor (baca file) ────────────────────────────────────────────────────────

/**
 * Baca & parse file JSON.
 * Mendukung:
 * - Array langsung: [ {...}, {...} ]
 * - Object dengan key items: { items: [...] }
 */
export async function importFromJSON<T>(file: File): Promise<T[]> {
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File JSON tidak valid.');
  }
  if (Array.isArray(parsed))       return parsed as T[];
  if (Array.isArray(parsed?.items)) return parsed.items as T[];
  throw new Error(
    'File JSON harus berisi array data atau objek dengan key "items".'
  );
}

/**
 * Baca & parse file CSV (RFC 4180 compliant).
 *
 * PERBAIKAN ROUNDTRIP:
 * - Boolean field ('true'/'false'/'1'/'0') di-cast ke boolean
 * - Number field di-cast ke number (null jika kosong/invalid)
 * - watch_status divalidasi ke enum DB, fallback ke 'none'
 * - status divalidasi ke enum DB, fallback ke 'planned'
 * - watched_at di-parse sebagai ISO, null jika tidak valid
 * - alternative_titles di-preserve sebagai JSON string
 * - Field 'note' (lama) di-alias ke 'notes' (baru) otomatis
 */
export async function importFromCSV<T>(file: File): Promise<Partial<T>[]> {
  const text  = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2)
    throw new Error(
      'File CSV harus memiliki header dan minimal 1 baris data.'
    );

  const headers = parseCSVLine(lines[0]);

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = parseCSVLine(line);
      const obj: any = {};
      headers.forEach((h, i) => {
        const key = h.trim();
        const raw = values[i]?.trim() ?? '';
        obj[key]  = castCSVValue(key, raw);
      });
      // Backward compat: 'note' → 'notes'
      if ('note' in obj && !('notes' in obj)) {
        obj.notes = obj.note;
        delete obj.note;
      }
      return obj as Partial<T>;
    });
}

// ─── Direct Import ke Supabase ────────────────────────────────────────────────

/**
 * Import langsung ke Supabase dari file JSON atau CSV.
 * Ini adalah mode "restore" — kebalikan eksak dari ekspor.
 *
 * Strategi:
 * 1. Baca semua item yang sudah ada di DB (untuk deteksi duplikat)
 * 2. Untuk setiap row dari file:
 *    - Jika ada 'id' yang cocok di DB → UPDATE (upsert berdasarkan id)
 *    - Jika tidak ada id tapi title+season+cour cocok → UPDATE
 *    - Jika tidak ada kecocokan → INSERT baru
 * 3. Kembalikan ringkasan hasil
 *
 * @param file        File JSON atau CSV dari hasil ekspor
 * @param mediaType   'anime' atau 'donghua'
 * @param mode        'insert_only' = hanya tambah baru
 *                    'upsert'      = insert baru + update existing
 *                    'replace_all' = hapus semua dulu, lalu insert ulang
 */
export async function directImportToSupabase(
  file: File,
  mediaType: 'anime' | 'donghua',
  mode: 'insert_only' | 'upsert' | 'replace_all' = 'upsert'
): Promise<DirectImportResult> {
  const result: DirectImportResult = {
    inserted: 0,
    updated:  0,
    skipped:  0,
    errors:   [],
    total:    0,
  };

  // 1. Dapatkan user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Login diperlukan untuk mengimpor data.');

  // 2. Baca file
  let rawItems: any[];
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext === 'json') {
    rawItems = await importFromJSON(file);
  } else if (ext === 'csv') {
    rawItems = await importFromCSV(file);
  } else {
    throw new Error('Format file tidak didukung. Gunakan .json atau .csv');
  }

  if (!rawItems || rawItems.length === 0) {
    throw new Error('File tidak mengandung data yang valid.');
  }

  result.total = rawItems.length;
  const table  = mediaType === 'anime' ? 'anime' : 'donghua';

  // 3. Jika mode replace_all: hapus semua data user dulu
  if (mode === 'replace_all') {
    const { error: delError } = await supabase
      .from(table)
      .delete()
      .eq('user_id', user.id);
    if (delError)
      throw new Error(`Gagal menghapus data lama: ${delError.message}`);
  }

  // 4. Ambil semua data existing (untuk lookup duplikat di mode upsert)
  let existingItems: any[] = [];
  if (mode === 'upsert') {
    const { data: existing } = await supabase
      .from(table)
      .select('id, title, season, cour, is_movie')
      .eq('user_id', user.id);
    existingItems = existing || [];
  }

  // Helper: cari existing item berdasarkan id atau title+season+cour
  const findExisting = (row: any): string | null => {
    if (!row) return null;

    // Cari berdasarkan id (paling akurat)
    if (row.id && typeof row.id === 'string' && row.id.includes('-')) {
      const byId = existingItems.find((e) => e.id === row.id);
      if (byId) return byId.id;
    }

    // Fallback: title + season + cour + is_movie
    const title   = String(row.title || '').trim().toLowerCase();
    const season  = Number(row.season || 1);
    const cour    = String(row.cour || '').trim().toLowerCase();
    const isMovie =
      row.is_movie === true ||
      row.is_movie === 'true' ||
      row.is_movie === 1;

    const byTitle = existingItems.find((e) => {
      const eTitle   = String(e.title || '').trim().toLowerCase();
      const eSeason  = Number(e.season || 1);
      const eCour    = String(e.cour || '').trim().toLowerCase();
      const eIsMovie = e.is_movie === true;
      return (
        eTitle === title &&
        eSeason === season &&
        eCour === cour &&
        eIsMovie === isMovie
      );
    });
    return byTitle?.id || null;
  };

  // 5. Proses setiap row
  for (const rawRow of rawItems) {
    if (!rawRow || !rawRow.title) {
      result.skipped++;
      continue;
    }

    try {
      const sanitized = sanitizeImportRow(rawRow);

      if (!sanitized.title) {
        result.skipped++;
        continue;
      }

      if (mode === 'insert_only' || mode === 'replace_all') {
        const { error } = await supabase.from(table).insert({
          ...sanitized,
          user_id: user.id,
        });
        if (error) {
          if (error.code === '23505') {
            result.skipped++;
          } else {
            result.errors.push({
              title:  String(sanitized.title),
              reason: error.message,
            });
          }
        } else {
          result.inserted++;
        }
      } else {
        // mode === 'upsert'
        const existingId = findExisting(rawRow);
        if (existingId) {
          const { error } = await supabase
            .from(table)
            .update({ ...sanitized, user_id: user.id })
            .eq('id', existingId);
          if (error) {
            result.errors.push({
              title:  String(sanitized.title),
              reason: error.message,
            });
          } else {
            result.updated++;
          }
        } else {
          const { error } = await supabase.from(table).insert({
            ...sanitized,
            user_id: user.id,
          });
          if (error) {
            if (error.code === '23505') {
              result.skipped++;
            } else {
              result.errors.push({
                title:  String(sanitized.title),
                reason: error.message,
              });
            }
          } else {
            result.inserted++;
          }
        }
      }
    } catch (err: any) {
      result.errors.push({
        title:  String(rawRow.title || 'Unknown'),
        reason: err?.message || 'Unknown error',
      });
    }
  }

  return result;
}

// ─── Type casting untuk CSV/JSON values ──────────────────────────────────────

const BOOLEAN_FIELDS = new Set([
  'is_favorite',
  'is_bookmarked',
  'is_movie',
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
]);

const NULLABLE_NUMBER_FIELDS = new Set([
  'mal_id',
  'anilist_id',
  'release_year',
  'duration_minutes',
  'episodes',
  'episodes_watched',
]);

/** Cast nilai CSV ke tipe yang tepat sesuai field DB */
function castCSVValue(key: string, raw: string): unknown {
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
export function sanitizeImportRow(raw: any): Record<string, unknown> {
  const r = raw || {};

  const str = (v: any, fallback = ''): string =>
    v !== null && v !== undefined && v !== 'null' && v !== 'undefined'
      ? String(v)
      : fallback;

  const num = (v: any, fallback: number | null = 0): number | null => {
    if (v === null || v === undefined || v === '' || v === 'null') return fallback;
    const n = Number(v);
    return isNaN(n) ? fallback : n;
  };

  const bool = (v: any, fallback = false): boolean => {
    if (typeof v === 'boolean') return v;
    if (v === 'true'  || v === '1' || v === 1) return true;
    if (v === 'false' || v === '0' || v === 0) return false;
    return fallback;
  };

  const isoOrNull = (v: any): string | null => {
    if (!v || v === 'null' || v === 'undefined' || v === '') return null;
    const d = new Date(String(v));
    return isNaN(d.getTime()) ? null : String(v);
  };

  const jsonOrNull = (v: any): string | null => {
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

  const statusVal = (v: any): string => {
    const s = str(v, 'planned');
    return VALID_STATUS.has(s) ? s : 'planned';
  };

  const watchStatusVal = (v: any): string => {
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

function parseCSVLine(line: string): string[] {
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