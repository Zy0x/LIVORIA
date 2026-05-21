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

import type { ZodTypeAny } from 'zod';

import { supabase } from '@/integrations/supabase/client';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export {
  ANIME_CSV_FIELDS,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_ROWS,
  castCSVValue,
  mediaImportSchema,
  parseCSVLine,
  sanitizeImportRow,
} from './import-export-normalization';
import {
  ANIME_CSV_FIELDS,
  MAX_IMPORT_FILE_SIZE_BYTES,
  MAX_IMPORT_ROWS,
  castCSVValue,
  mediaImportSchema,
  parseCSVLine,
  sanitizeImportRow,
} from './import-export-normalization';

interface ImportReadOptions<T = unknown> {
  maxFileSizeBytes?: number;
  maxRows?: number;
  schema?: ZodTypeAny;
  label?: string;
  transform?: (row: unknown) => T;
}

type MediaImportTable = 'anime' | 'donghua';
type MediaInsertRow<T extends MediaImportTable> = TablesInsert<T>;
type MediaUpdateRow<T extends MediaImportTable> = TablesUpdate<T>;

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

function validateImportFile(file: File, options: ImportReadOptions = {}) {
  const limit = options.maxFileSizeBytes ?? MAX_IMPORT_FILE_SIZE_BYTES;
  if (file.size > limit) {
    throw new Error(`File import terlalu besar. Maksimal ${(limit / 1024 / 1024).toFixed(0)} MB.`);
  }
}

function validateImportRows<T>(rows: unknown[], options: ImportReadOptions<T> = {}): T[] {
  const maxRows = options.maxRows ?? MAX_IMPORT_ROWS;
  if (rows.length > maxRows) {
    throw new Error(`Jumlah data import terlalu banyak. Maksimal ${maxRows} baris per file.`);
  }

  if (!options.schema && !options.transform) return rows as T[];

  return rows.map((row, index) => {
    const transformed = options.transform ? options.transform(row) : row;
    if (!options.schema) return transformed as T;

    const parsed = options.schema.safeParse(transformed);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const path = issue?.path?.length ? issue.path.join('.') : 'data';
      throw new Error(
        `${options.label ?? 'Import'} baris ${index + 1} tidak valid: ${path} - ${issue?.message ?? 'schema tidak sesuai'}.`
      );
    }
    return parsed.data as T;
  });
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
export async function importFromJSON<T>(file: File, options: ImportReadOptions<T> = {}): Promise<T[]> {
  validateImportFile(file, options);
  const text = await file.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('File JSON tidak valid.');
  }
  if (Array.isArray(parsed))       return validateImportRows<T>(parsed, options);
  if (Array.isArray(parsed?.items)) return validateImportRows<T>(parsed.items, options);
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
export async function importFromCSV<T>(file: File, options: ImportReadOptions<Partial<T>> = {}): Promise<Partial<T>[]> {
  validateImportFile(file, options);
  const text  = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2)
    throw new Error(
      'File CSV harus memiliki header dan minimal 1 baris data.'
    );

  const headers = parseCSVLine(lines[0]);

  const rows = lines
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

  return validateImportRows<Partial<T>>(rows, options);
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
  const table: MediaImportTable = mediaType === 'anime' ? 'anime' : 'donghua';

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
      const sanitized = validateImportRows<Record<string, unknown>>([sanitizeImportRow(rawRow)], {
        schema: mediaImportSchema,
        label: mediaType === 'anime' ? 'Anime' : 'Donghua',
      })[0];

      if (!sanitized.title) {
        result.skipped++;
        continue;
      }

      if (mode === 'insert_only' || mode === 'replace_all') {
        const insertRow = {
          ...sanitized,
          user_id: user.id,
        } as MediaInsertRow<typeof table>;
        const { error } = await supabase.from(table).insert(insertRow);
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
            .update({ ...sanitized, user_id: user.id } as MediaUpdateRow<typeof table>)
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
          const insertRow = {
            ...sanitized,
            user_id: user.id,
          } as MediaInsertRow<typeof table>;
          const { error } = await supabase.from(table).insert(insertRow);
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
