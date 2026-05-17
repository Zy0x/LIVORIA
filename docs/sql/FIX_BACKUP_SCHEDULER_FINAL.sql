-- =============================================================================
-- FIX_BACKUP_SCHEDULER_FINAL.sql
-- =============================================================================
-- Memastikan sinkronisasi waktu yang akurat dan pembaruan cron job seketika.

-- 1. Update manage_backup_cron_job dengan logika konversi UTC yang lebih presisi
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
  v_utc_time TIME;
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
    v_error_msg := 'Could not retrieve Supabase secrets from vault or parameters.';
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('failed', v_error_msg);
    RETURN;
  END IF;

  -- KONVERSI WAKTU KE UTC UNTUK pg_cron
  -- Asia/Jakarta (WIB) adalah UTC+7.
  -- Kita kurangi 7 jam dari p_backup_time untuk mendapatkan UTC.
  v_utc_time := (p_backup_time - INTERVAL '7 hours');

  v_current_minute := EXTRACT(MINUTE FROM v_utc_time);
  v_current_hour := EXTRACT(HOUR FROM v_utc_time);

  -- Construct cron schedule: "min hour * * *"
  v_schedule_expr := v_current_minute || ' ' || v_current_hour || ' * * *';

  -- Construct command to call the admin-backup edge function
  v_command := 'SELECT net.http_post(url:=' || quote_literal('https://' || v_project_ref || '.supabase.co/functions/v1/admin-backup') || 
               ', headers:=' || quote_literal('{"Content-Type":"application/json","Authorization":"Bearer ' || v_anon_key || '"}') || '::jsonb' ||
               ', body:=' || quote_literal('{"action":"backup","isAuto":true}') || '::jsonb);';

  -- Manage Cron Job
  IF p_is_enabled THEN
    -- Check if job already exists in cron.job table by name
    SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-auto-backup') INTO v_job_exists;
    
    IF v_job_exists THEN
      -- Update existing job
      PERFORM cron.alter_job(
        job_id := (SELECT jobid FROM cron.job WHERE jobname = 'daily-auto-backup'),
        schedule := v_schedule_expr,
        command := v_command
      );
      -- Ensure our settings table has the correct ID
      SELECT jobid INTO v_cron_job_id FROM cron.job WHERE jobname = 'daily-auto-backup';
    ELSE
      -- Schedule new job
      v_cron_job_id := cron.schedule('daily-auto-backup', v_schedule_expr, v_command);
    END IF;
    
    -- Update settings with the job ID
    UPDATE public.backup_settings 
    SET cron_job_id = v_cron_job_id, updated_at = now() 
    WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    
    -- Log success with clear info
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('success', 'Backup scheduled: ' || p_backup_time || ' WIB -> ' || v_schedule_expr || ' UTC');
    
  ELSE
    -- Unschedule if disabled
    IF v_cron_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_cron_job_id);
    END IF;
    
    -- Double check by name
    SELECT jobid INTO v_cron_job_id FROM cron.job WHERE jobname = 'daily-auto-backup';
    IF v_cron_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_cron_job_id);
    END IF;
    
    -- Clear job ID in settings
    UPDATE public.backup_settings 
    SET cron_job_id = NULL, updated_at = now() 
    WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    
    -- Log success
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('success', 'Backup disabled');
  END IF;
END;
$$;

-- 2. Update update_backup_settings untuk memanggil manage_backup_cron_job dengan benar
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

-- 3. Trigger pendaftaran ulang untuk memastikan jadwal saat ini sinkron
DO $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM public.backup_settings LIMIT 1;
  IF r IS NOT NULL THEN
    PERFORM public.manage_backup_cron_job(r.is_enabled, r.backup_time, r.timezone);
  END IF;
END $$;
