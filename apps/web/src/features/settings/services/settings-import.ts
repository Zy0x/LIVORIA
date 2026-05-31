import {
  upsertSettingsRows,
  type SettingsBackupTable,
} from './settings-backup.repository';

export const IMPORTABLE_TABLES: readonly SettingsBackupTable[] = [
  'anime',
  'donghua',
  'waifu',
  'obat',
  'catatan',
  'tagihan',
  'tagihan_history',
  'struk',
] as const;

export const IMPORT_DELETE_ORDER = [
  'struk',
  'tagihan_history',
  'tagihan',
  'anime',
  'donghua',
  'waifu',
  'obat',
  'catatan',
] as const;

export const IMPORT_STANDALONE_TABLES = ['anime', 'donghua', 'waifu', 'obat', 'catatan'] as const;
export const IMPORT_INVALIDATE_KEYS = ['anime', 'donghua', 'waifu', 'obat', 'catatan', 'tagihan'] as const;

export type ImportableTable = typeof IMPORTABLE_TABLES[number];
export type ImportMode = 'merge' | 'overwrite';

export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const asRows = (data: Record<string, unknown>, table: ImportableTable) =>
  Array.isArray(data[table]) ? data[table] as Array<Record<string, unknown>> : [];

export const prepareImportRow = (
  row: Record<string, unknown>,
  userId: string,
  options: { keepId?: boolean; tagihanIdMap?: Map<string, string> } = {},
) => {
  const prepared: Record<string, unknown> = { ...row, user_id: userId };
  if (!options.keepId || !isUuid(prepared.id)) delete prepared.id;
  if (prepared.tagihan_id && options.tagihanIdMap) {
    prepared.tagihan_id = options.tagihanIdMap.get(String(prepared.tagihan_id)) || prepared.tagihan_id;
  }
  return prepared;
};

export const insertPreparedRows = async (table: ImportableTable, rows: Array<Record<string, unknown>>) => {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    await upsertSettingsRows(table, batch);
    inserted += batch.length;
  }
  return inserted;
};
