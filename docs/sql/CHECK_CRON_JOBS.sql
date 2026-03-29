-- ==========================================
-- CARA CEK CRON JOB DI SUPABASE (pg_cron)
-- ==========================================

-- 1. Cek daftar semua cron job yang terdaftar
SELECT * FROM cron.job;

-- 2. Cek riwayat eksekusi cron job (apakah sukses atau gagal)
-- Ini akan menunjukkan kapan terakhir kali jalan dan apa hasilnya
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 20;

-- 3. Cek status backup otomatis di tabel settings kita
SELECT * FROM public.backup_settings;

-- 4. Cek log backup yang dibuat oleh Edge Function
SELECT * FROM public.backup_logs 
ORDER BY execution_time DESC 
LIMIT 20;

-- 5. Jika cron job tidak muncul di cron.job, jalankan ulang setup:
-- SELECT public.manage_backup_cron_job(true, '02:00:00', 'Asia/Jakarta');

-- 6. Jika ingin menghapus semua job backup untuk reset:
-- SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'daily-auto-backup';
