export const LIVORIA_TABLES = [
  'tagihan',
  'tagihan_history',
  'struk',
  'anime',
  'donghua',
  'waifu',
  'obat',
  'user_preferences',
  'telegram_subscriptions',
] as const

export const RESTORE_TABLES = new Set<string>([
  'tagihan',
  'tagihan_history',
  'struk',
  'anime',
  'donghua',
  'waifu',
  'obat',
  'user_preferences',
  'telegram_subscriptions',
])

const RESTORE_CONFIRM_TEXT = 'RESTORE LIVORIA'
const MAX_RESTORE_ROWS_PER_TABLE = 100_000

export function validateBackupPayload(backupData: any) {
  if (!backupData || typeof backupData !== 'object' || Array.isArray(backupData)) {
    throw new Error('backupData tidak valid.')
  }
  if (backupData._meta?.app !== 'LIVORIA') {
    throw new Error('Backup bukan dari LIVORIA atau metadata tidak lengkap.')
  }
  const tables = Object.keys(backupData).filter((table) => !table.startsWith('_'))
  if (tables.length === 0) {
    throw new Error('Backup tidak berisi tabel yang bisa direstore.')
  }
  const unknown = tables.filter((table) => !RESTORE_TABLES.has(table))
  if (unknown.length > 0) {
    throw new Error(`Backup berisi tabel tidak dikenal: ${unknown.join(', ')}`)
  }
  for (const table of tables) {
    if (!Array.isArray(backupData[table])) {
      throw new Error(`Isi tabel ${table} harus berupa array.`)
    }
    if (backupData[table].length > MAX_RESTORE_ROWS_PER_TABLE) {
      throw new Error(`Isi tabel ${table} melebihi batas aman restore.`)
    }
  }
  return tables
}

export function validateRestoreConfirmation(body: any) {
  if (body?.restoreConfirm !== RESTORE_CONFIRM_TEXT) {
    throw new Error(`Ketik "${RESTORE_CONFIRM_TEXT}" untuk menjalankan restore.`)
  }
}
