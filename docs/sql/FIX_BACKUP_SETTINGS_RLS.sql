-- =============================================================================
-- FIX_BACKUP_SETTINGS_RLS.sql
-- =============================================================================
-- Script untuk memperbaiki masalah penyimpanan data backup settings
-- Masalah: RLS policies mungkin memblokir update, atau ada issue dengan kolom baru

-- 1. Pastikan backup_settings table memiliki struktur yang benar
ALTER TABLE public.backup_settings
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;

-- 2. Drop existing RLS policies jika ada (untuk reset)
DROP POLICY IF EXISTS "allow_service_role_all" ON public.backup_settings;
DROP POLICY IF EXISTS "allow_admin_read" ON public.backup_settings;
DROP POLICY IF EXISTS "allow_admin_update" ON public.backup_settings;

-- 3. Disable RLS untuk backup_settings (karena hanya diakses via service role di edge function)
ALTER TABLE public.backup_settings DISABLE ROW LEVEL SECURITY;

-- 4. Verifikasi struktur tabel
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_schema = 'public' AND table_name = 'backup_settings'
ORDER BY ordinal_position;

-- 5. Verifikasi data yang ada
SELECT id, is_enabled, backup_time, timezone, cron_job_id, supabase_url, supabase_anon_key, updated_at
FROM public.backup_settings;

-- 6. Pastikan ada minimal satu row di backup_settings
INSERT INTO public.backup_settings (is_enabled, backup_time, timezone)
SELECT TRUE, '02:00:00', 'Asia/Jakarta'
WHERE NOT EXISTS (SELECT 1 FROM public.backup_settings);

-- 7. Recreate atau verify update_backup_settings function
CREATE OR REPLACE FUNCTION public.update_backup_settings(
  p_is_enabled BOOLEAN,
  p_backup_time TIME,
  p_timezone TEXT DEFAULT 'Asia/Jakarta',
  p_supabase_url TEXT DEFAULT NULL,
  p_supabase_anon_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.backup_settings
  SET is_enabled = p_is_enabled, 
      backup_time = p_backup_time, 
      timezone = p_timezone,
      supabase_url = COALESCE(p_supabase_url, supabase_url),
      supabase_anon_key = COALESCE(p_supabase_anon_key, supabase_anon_key),
      updated_at = now()
  WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);

  -- Jika update berhasil, trigger cron job management
  PERFORM public.manage_backup_cron_job(
    p_is_enabled, 
    p_backup_time, 
    p_timezone,
    COALESCE(p_supabase_url, (SELECT supabase_url FROM public.backup_settings LIMIT 1)),
    COALESCE(p_supabase_anon_key, (SELECT supabase_anon_key FROM public.backup_settings LIMIT 1))
  );
END;
$$;

-- 8. Test: Update settings tanpa error
SELECT public.update_backup_settings(
  true,
  '02:00:00',
  'Asia/Jakarta'
);

-- 9. Verifikasi hasil
SELECT id, is_enabled, backup_time, timezone, cron_job_id, updated_at
FROM public.backup_settings;

-- 10. Check logs untuk error
SELECT status, message, execution_time
FROM public.backup_logs
ORDER BY execution_time DESC
LIMIT 10;
