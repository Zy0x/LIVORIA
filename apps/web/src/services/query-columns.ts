export const ANIME_SELECT_COLUMNS =
  'id,user_id,title,status,genre,rating,episodes,episodes_watched,cover_url,synopsis,notes,season,cour,streaming_url,schedule,parent_title,is_favorite,is_bookmarked,is_movie,duration_minutes,is_hentai,release_year,studio,mal_url,anilist_url,mal_id,anilist_id,alternative_titles,watch_status,watched_at,created_at' as const;

export const DONGHUA_SELECT_COLUMNS = ANIME_SELECT_COLUMNS;

export const TAGIHAN_SELECT_COLUMNS =
  'id,user_id,debitur_nama,debitur_kontak,barang_nama,harga_awal,bunga_persen,jangka_waktu_bulan,cicilan_per_bulan,tanggal_mulai,tanggal_jatuh_tempo,tanggal_mulai_bayar,status,total_dibayar,total_hutang,sisa_hutang,keuntungan_estimasi,denda_persen_per_hari,catatan,metode_pembayaran,sumber_modal,jenis_tempo,tgl_bayar_tanggal,tgl_tempo_tanggal,tgl_bayar_hari,tgl_tempo_hari,kuantitas,created_at,updated_at' as const;

export const TAGIHAN_HISTORY_SELECT_COLUMNS =
  'id,tagihan_id,user_id,aksi,detail,jumlah,created_at' as const;

export const STRUK_SELECT_COLUMNS =
  'id,tagihan_id,user_id,file_url,file_name,file_type,keterangan,uploaded_at' as const;

export const WAIFU_SELECT_COLUMNS =
  'id,user_id,name,source,source_type,tier,image_url,notes,created_at' as const;

export const OBAT_SELECT_COLUMNS =
  'id,user_id,name,type,dosage,usage_info,frequency,side_effects,notes,created_at' as const;

export const TELEGRAM_SUBSCRIPTION_SELECT_COLUMNS =
  'id,user_id,chat_id,is_active,notify_monthly_report,monthly_report_date,notify_overdue,notify_due_reminder,reminder_days_before,created_at,updated_at' as const;
