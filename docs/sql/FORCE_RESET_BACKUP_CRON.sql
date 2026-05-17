-- =============================================================================
-- FORCE RESET BACKUP CRON
-- =============================================================================
-- Jalankan script ini jika backup otomatis tetap tidak jalan (cron_job_id null).
-- Script ini akan memaksa pendaftaran ulang cron job ke Supabase.

-- 1. Pastikan extension aktif (WAJIB)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Bersihkan job lama jika ada (agar tidak duplikat)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-auto-backup';

-- 3. Reset tabel settings (kosongkan ID lama)
UPDATE public.backup_settings SET cron_job_id = NULL;

-- 4. Daftarkan ulang secara manual (Ganti jam dan timezone jika perlu)
-- Contoh: Jam 02:00:00 WIB (Asia/Jakarta)
SELECT public.manage_backup_cron_job(true, '02:00:00', 'Asia/Jakarta');

-- 5. Verifikasi hasil (PASTIKAN cron_job_id TIDAK NULL)
SELECT * FROM public.backup_settings;

-- 6. Verifikasi di tabel sistem Supabase
SELECT * FROM cron.job WHERE jobname = 'daily-auto-backup';

-- =============================================================================
-- CATATAN PENTING:
-- Jika cron_job_id tetap NULL setelah menjalankan script ini, kemungkinan besar:
-- 1. Anda tidak memiliki akses ke 'supabase_vault.secrets' (Vault).
-- 2. Extension 'pg_cron' atau 'pg_net' belum diaktifkan di dashboard Supabase.
-- 3. Anda menjalankan script ini bukan sebagai role 'postgres' (Superuser).
-- =============================================================================
