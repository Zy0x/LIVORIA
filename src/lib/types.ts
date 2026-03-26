// ============ Tagihan (Lending Management) ============
export type TagihanStatus = 'aktif' | 'lunas' | 'overdue' | 'ditunda';
export type JenisTempo = 'bulanan' | 'berjangka';

export interface Tagihan {
  id: string;
  user_id: string;
  debitur_nama: string;
  debitur_kontak: string;
  barang_nama: string;
  harga_awal: number;
  bunga_persen: number;
  jangka_waktu_bulan: number;
  cicilan_per_bulan: number;
  tanggal_mulai: string;
  tanggal_jatuh_tempo: string;
  tanggal_mulai_bayar: string | null;
  status: TagihanStatus;
  total_dibayar: number;
  total_hutang: number;
  sisa_hutang: number;
  keuntungan_estimasi: number;
  denda_persen_per_hari: number;
  catatan: string;
  metode_pembayaran: string;
  sumber_modal: 'modal_terpisah' | 'modal_bergulir' | 'dana_luar';
  jenis_tempo: JenisTempo;
  tgl_bayar_tanggal: string | null;
  tgl_tempo_tanggal: string | null;
  tgl_bayar_hari: number | null;
  tgl_tempo_hari: number | null;
  kuantitas: string | null;
  created_at: string;
  updated_at: string;
}

export interface Struk {
  id: string;
  tagihan_id: string;
  user_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  keterangan: string;
  uploaded_at: string;
}

export interface TagihanHistory {
  id: string;
  tagihan_id: string;
  user_id: string;
  aksi: string;
  detail: string;
  jumlah: number;
  created_at: string;
}

// ============ Anime / Donghua ============

/**
 * WatchStatus — Status tontonan real-time untuk fitur watchlist.
 * Di-reset otomatis ke 'none' setelah 1 jam (lihat useWatchedAutoRemove).
 *
 * - 'none'          : tidak ada di watchlist saat ini
 * - 'want_to_watch' : ditandai ingin ditonton
 * - 'watching'      : sedang ditonton sekarang
 * - 'watched'       : sudah selesai ditonton (auto-reset setelah 1 jam)
 */
export type WatchStatus = 'none' | 'want_to_watch' | 'watching' | 'watched';

/**
 * AnimeItem — Entri anime atau film anime.
 *
 * Bidang movie:
 *  - is_movie: true jika entri adalah film (bukan serial)
 *  - duration_minutes: durasi total film dalam menit (hanya relevan jika is_movie = true)
 *
 * Aturan pengelompokan:
 *  - is_movie = false → dikelompokkan berdasarkan parent_title / judul (stack season)
 *  - is_movie = true, parent_title kosong → standalone, tidak distack
 *  - is_movie = true, parent_title diisi → distack sesama movie dari franchise yang sama
 *
 * Field watch_status & watched_at:
 *  - Untuk fitur watchlist/riwayat tontonan harian
 *  - Di-reset otomatis via useWatchedAutoRemove
 *  - IKUT ter-ekspor dan bisa di-restore via impor
 */
export interface AnimeItem {
  id: string;
  user_id: string;
  title: string;
  status: 'on-going' | 'completed' | 'planned';
  genre: string;
  rating: number;
  /** Total episode (serial). Untuk movie, gunakan duration_minutes. */
  episodes: number;
  episodes_watched: number;
  cover_url: string;
  synopsis: string;
  notes: string;
  /** Nomor season (serial). Untuk movie = 0 atau null. */
  season: number;
  cour: string;
  streaming_url: string;
  schedule: string;
  parent_title: string;
  is_favorite: boolean;
  is_bookmarked: boolean;

  // ── Movie fields ──────────────────────────────────────────
  /** True jika entri ini adalah film, bukan serial. */
  is_movie: boolean;
  /** Durasi film dalam menit. Null untuk serial. */
  duration_minutes: number | null;

  // ── HAnime (18+) ─────────────────────────────────────────
  /** True jika entri ini adalah konten hentai/18+. */
  is_hentai?: boolean;

  // ── Extra data dari MAL/AniList ───────────────────────────
  release_year?: number | null;
  studio?: string | null;
  mal_url?: string | null;
  anilist_url?: string | null;
  mal_id?: number | null;
  anilist_id?: number | null;
  /** JSON string dari AlternativeTitles — semua variasi nama */
  alternative_titles?: string | null;

  // ── Watch tracking ────────────────────────────────────────
  /** Status tontonan real-time. Auto-reset setelah 1 jam. */
  watch_status?: WatchStatus | null;
  /** Timestamp saat status diubah ke 'watched'. ISO string. */
  watched_at?: string | null;

  created_at: string;
}

export interface DonghuaItem {
  id: string;
  user_id: string;
  title: string;
  status: 'on-going' | 'completed' | 'planned';
  genre: string;
  rating: number;
  episodes: number;
  episodes_watched: number;
  cover_url: string;
  synopsis: string;
  notes: string;
  season: number;
  cour: string;
  streaming_url: string;
  schedule: string;
  parent_title: string;
  is_favorite: boolean;
  is_bookmarked: boolean;

  // ── Movie fields ──────────────────────────────────────────
  is_movie: boolean;
  duration_minutes: number | null;

  // ── HAnime (18+) ─────────────────────────────────────────
  /** True jika entri ini adalah konten hentai/18+. */
  is_hentai?: boolean;

  // ── Extra data dari MAL/AniList ───────────────────────────
  release_year?: number | null;
  studio?: string | null;
  mal_url?: string | null;
  anilist_url?: string | null;
  mal_id?: number | null;
  anilist_id?: number | null;
  /** JSON string dari AlternativeTitles — semua variasi nama */
  alternative_titles?: string | null;

  // ── Watch tracking ────────────────────────────────────────
  /** Status tontonan real-time. Auto-reset setelah 1 jam. */
  watch_status?: WatchStatus | null;
  /** Timestamp saat status diubah ke 'watched'. ISO string. */
  watched_at?: string | null;

  created_at: string;
}

export interface WaifuItem {
  id: string;
  user_id: string;
  name: string;
  source: string;
  source_type: 'anime' | 'donghua';
  tier: 'S' | 'A' | 'B' | 'C';
  image_url: string;
  notes: string;
  created_at: string;
}

export interface ObatItem {
  id: string;
  user_id: string;
  name: string;
  type: string;
  dosage: string;
  usage_info: string;
  notes: string;
  frequency: string;
  side_effects: string;
  created_at: string;
}

export type MediaStatus = 'on-going' | 'completed' | 'planned';
export type BillStatus = TagihanStatus;
export type WaifuTier = 'S' | 'A' | 'B' | 'C';
export type SourceType = 'anime' | 'donghua';