import { supabase } from '@/integrations/supabase/client';

export type SettingsBackupTable =
  | 'anime'
  | 'donghua'
  | 'waifu'
  | 'obat'
  | 'catatan'
  | 'tagihan'
  | 'tagihan_history'
  | 'struk';

const SETTINGS_BACKUP_COLUMNS: Record<SettingsBackupTable, string> = {
  anime: [
    'id', 'user_id', 'title', 'status', 'genre', 'rating', 'episodes', 'episodes_watched',
    'cover_url', 'synopsis', 'notes', 'season', 'cour', 'streaming_url', 'schedule',
    'parent_title', 'is_favorite', 'is_bookmarked', 'is_movie', 'duration_minutes',
    'is_hentai', 'release_year', 'studio', 'mal_url', 'anilist_url', 'mal_id',
    'anilist_id', 'alternative_titles', 'watch_status', 'watched_at', 'created_at', 'updated_at',
  ].join(','),
  donghua: [
    'id', 'user_id', 'title', 'status', 'genre', 'rating', 'episodes', 'episodes_watched',
    'cover_url', 'synopsis', 'notes', 'season', 'cour', 'streaming_url', 'schedule',
    'parent_title', 'is_favorite', 'is_bookmarked', 'is_movie', 'duration_minutes',
    'is_hentai', 'release_year', 'studio', 'mal_url', 'anilist_url', 'mal_id',
    'anilist_id', 'alternative_titles', 'watch_status', 'watched_at', 'created_at', 'updated_at',
  ].join(','),
  obat: [
    'id', 'user_id', 'name', 'type', 'dosage', 'usage_info', 'frequency',
    'side_effects', 'notes', 'created_at', 'updated_at',
  ].join(','),
  catatan: [
    'id', 'user_id', 'title', 'content', 'tags', 'color', 'is_pinned', 'created_at', 'updated_at',
  ].join(','),
  struk: [
    'id', 'tagihan_id', 'user_id', 'file_url', 'file_name', 'file_type', 'keterangan', 'uploaded_at',
  ].join(','),
  tagihan: [
    'id', 'user_id', 'debitur_nama', 'debitur_kontak', 'barang_nama', 'harga_awal',
    'bunga_persen', 'jangka_waktu_bulan', 'cicilan_per_bulan', 'tanggal_mulai',
    'tanggal_jatuh_tempo', 'tanggal_mulai_bayar', 'status', 'total_dibayar',
    'total_hutang', 'sisa_hutang', 'keuntungan_estimasi', 'denda_persen_per_hari',
    'catatan', 'metode_pembayaran', 'sumber_modal', 'jenis_tempo', 'tgl_bayar_tanggal',
    'tgl_tempo_tanggal', 'tgl_bayar_hari', 'tgl_tempo_hari', 'kuantitas', 'created_at', 'updated_at',
  ].join(','),
  tagihan_history: [
    'id', 'tagihan_id', 'user_id', 'aksi', 'detail', 'jumlah', 'created_at',
  ].join(','),
  waifu: [
    'id', 'user_id', 'name', 'source', 'source_type', 'tier', 'image_url',
    'notes', 'created_at', 'updated_at',
  ].join(','),
};

export async function exportSettingsTable(table: SettingsBackupTable) {
  const { data, error } = await supabase.from(table).select(SETTINGS_BACKUP_COLUMNS[table]);
  if (error) throw error;
  return data || [];
}

export async function upsertSettingsRows(table: SettingsBackupTable, rows: Array<Record<string, unknown>>) {
  const { error } = await supabase.from(table).upsert(rows as never, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteSettingsRowsForUser(table: SettingsBackupTable, userId: string) {
  const { error } = await supabase.from(table).delete().eq('user_id', userId);
  if (error) throw error;
}

export async function upsertSettingsTagihan(row: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('tagihan')
    .upsert(row as never, { onConflict: 'id' })
    .select('id')
    .single();

  if (error) throw error;
  return data as { id: string } | null;
}
