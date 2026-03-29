-- =============================================================================
-- QUICK FIX BACKUP SYSTEM
-- =============================================================================
-- Script ini akan memperbaiki sistem backup dengan fallback mechanism.
-- Jalankan di SQL Editor Supabase setelah mengisi nilai di bawah.

-- ⚠️ PENTING: Ganti nilai-nilai ini dengan milik Anda!
-- Anda bisa menemukan nilai ini di Supabase Dashboard → Project Settings → API

-- Contoh:
-- SUPABASE_URL: https://xyz.supabase.co
-- SUPABASE_ANON_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

-- =============================================================================

-- Step 1: Pastikan extensions aktif
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Tambahkan kolom fallback ke backup_settings jika belum ada
ALTER TABLE public.backup_settings
ADD COLUMN IF NOT EXISTS supabase_url TEXT,
ADD COLUMN IF NOT EXISTS supabase_anon_key TEXT;

-- Step 3: Simpan secrets ke database (GANTI NILAI INI!)
UPDATE public.backup_settings
SET supabase_url = 'https://YOUR_PROJECT_REF.supabase.co',
    supabase_anon_key = 'YOUR_ANON_KEY_HERE'
WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);

-- Step 4: Recreate manage_backup_cron_job dengan fallback mechanism
CREATE OR REPLACE FUNCTION public.manage_backup_cron_job(
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
DECLARE
  v_cron_job_id BIGINT;
  v_schedule_expr TEXT;
  v_command TEXT;
  v_current_minute INT;
  v_current_hour INT;
  v_project_ref TEXT;
  v_anon_key TEXT;
  v_job_exists BOOLEAN;
  v_vault_accessible BOOLEAN := FALSE;
  v_error_msg TEXT;
BEGIN
  -- Get current cron_job_id from settings
  SELECT cron_job_id INTO v_cron_job_id FROM public.backup_settings LIMIT 1;

  -- Strategy 1: Try to retrieve Supabase secrets from vault first
  BEGIN
    SELECT value INTO v_project_ref FROM supabase_vault.secrets WHERE name = 'SUPABASE_URL';
    SELECT value INTO v_anon_key FROM supabase_vault.secrets WHERE name = 'SUPABASE_ANON_KEY';
    
    IF v_project_ref IS NOT NULL THEN
      v_project_ref := substring(v_project_ref from 'https://([^.]+)\.supabase\.co');
      v_vault_accessible := TRUE;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_project_ref := NULL;
    v_anon_key := NULL;
    v_vault_accessible := FALSE;
  END;

  -- Strategy 2: Use provided parameters as fallback
  IF NOT v_vault_accessible AND p_supabase_url IS NOT NULL AND p_supabase_anon_key IS NOT NULL THEN
    v_project_ref := substring(p_supabase_url from 'https://([^.]+)\.supabase\.co');
    v_anon_key := p_supabase_anon_key;
    v_vault_accessible := TRUE;
    
    UPDATE public.backup_settings 
    SET supabase_url = p_supabase_url, supabase_anon_key = p_supabase_anon_key
    WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
  END IF;

  -- Strategy 3: Try to retrieve from backup_settings table
  IF NOT v_vault_accessible THEN
    SELECT supabase_url, supabase_anon_key 
    INTO v_project_ref, v_anon_key
    FROM public.backup_settings 
    WHERE supabase_url IS NOT NULL AND supabase_anon_key IS NOT NULL
    LIMIT 1;
    
    IF v_project_ref IS NOT NULL THEN
      v_project_ref := substring(v_project_ref from 'https://([^.]+)\.supabase\.co');
      v_vault_accessible := TRUE;
    END IF;
  END IF;

  -- If still no secrets, log and return
  IF NOT v_vault_accessible OR v_project_ref IS NULL OR v_anon_key IS NULL THEN
    v_error_msg := 'Could not retrieve Supabase secrets from vault or parameters. ' ||
                   'Please set SUPABASE_URL and SUPABASE_ANON_KEY in Supabase Vault or pass them as parameters.';
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('failed', v_error_msg);
    RAISE WARNING '%', v_error_msg;
    RETURN;
  END IF;

  -- Extract time components
  v_current_minute := EXTRACT(MINUTE FROM p_backup_time);
  v_current_hour := EXTRACT(HOUR FROM p_backup_time);

  -- Timezone adjustment for UTC conversion
  IF p_timezone = 'Asia/Jakarta' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
  ELSIF p_timezone = 'Asia/Bangkok' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
  ELSIF p_timezone = 'Asia/Ho_Chi_Minh' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
  END IF;

  v_schedule_expr := v_current_minute || ' ' || v_current_hour || ' * * *';

  v_command := 'SELECT net.http_post(url:=' || quote_literal('https://' || v_project_ref || '.supabase.co/functions/v1/admin-backup') || 
               ', headers:=' || quote_literal('{"Content-Type":"application/json","Authorization":"Bearer ' || v_anon_key || '"}') || '::jsonb' ||
               ', body:=' || quote_literal('{"action":"backup","isAuto":true}') || '::jsonb);';

  IF p_is_enabled THEN
    SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-auto-backup') INTO v_job_exists;
    
    IF v_job_exists THEN
      PERFORM cron.alter_job(
        job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-auto-backup'),
        schedule := v_schedule_expr,
        command := v_command
      );
      SELECT jobid INTO v_cron_job_id FROM cron.job WHERE jobname = 'daily-auto-backup';
    ELSE
      v_cron_job_id := cron.schedule('daily-auto-backup', v_schedule_expr, v_command);
    END IF;
    
    UPDATE public.backup_settings 
    SET cron_job_id = v_cron_job_id, updated_at = now() 
    WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('success', 'Backup cron job scheduled successfully at ' || v_schedule_expr || ' UTC');
    
  ELSE
    IF v_cron_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_cron_job_id);
    END IF;
    
    SELECT jobid INTO v_cron_job_id FROM cron.job WHERE jobname = 'daily-auto-backup';
    IF v_cron_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_cron_job_id);
    END IF;
    
    UPDATE public.backup_settings 
    SET cron_job_id = NULL, updated_at = now() 
    WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('success', 'Backup cron job unscheduled');
  END IF;
END;
$$;

-- Step 5: Recreate update_backup_settings function
CREATE OR REPLACE FUNCTION public.update_backup_settings(
  p_is_enabled BOOLEAN,
  p_backup_time TIME,
  p_timezone TEXT DEFAULT 'Asia/Jakarta',
  p_supabase_url TEXT DEFAULT NULL,
  p_supabase_anon_key TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.backup_settings
  SET is_enabled = p_is_enabled, 
      backup_time = p_backup_time, 
      timezone = p_timezone, 
      updated_at = now()
  WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);

  PERFORM public.manage_backup_cron_job(
    p_is_enabled, 
    p_backup_time, 
    p_timezone,
    p_supabase_url,
    p_supabase_anon_key
  );
END;
$$;

-- Step 6: Create initialization helper function
CREATE OR REPLACE FUNCTION public.initialize_backup_with_secrets(
  p_supabase_url TEXT,
  p_supabase_anon_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.backup_settings
  SET supabase_url = p_supabase_url,
      supabase_anon_key = p_supabase_anon_key
  WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
  
  PERFORM public.manage_backup_cron_job(
    TRUE,
    (SELECT backup_time FROM public.backup_settings LIMIT 1),
    (SELECT timezone FROM public.backup_settings LIMIT 1),
    p_supabase_url,
    p_supabase_anon_key
  );
END;
$$;

-- Step 7: Trigger the backup setup
SELECT public.manage_backup_cron_job(
  TRUE,
  (SELECT backup_time FROM public.backup_settings LIMIT 1),
  (SELECT timezone FROM public.backup_settings LIMIT 1)
);

-- Step 8: Verify the setup
SELECT 'Backup Settings:' as info;
SELECT id, is_enabled, backup_time, timezone, cron_job_id, updated_at 
FROM public.backup_settings;

SELECT '' as blank;
SELECT 'Cron Job Status:' as info;
SELECT jobid, jobname, schedule 
FROM cron.job 
WHERE jobname = 'daily-auto-backup';

SELECT '' as blank;
SELECT 'Recent Logs:' as info;
SELECT status, message, execution_time 
FROM public.backup_logs 
ORDER BY execution_time DESC 
LIMIT 5;
