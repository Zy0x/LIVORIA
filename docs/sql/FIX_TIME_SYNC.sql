-- =============================================================================
-- FIX_TIME_SYNC.sql
-- =============================================================================
-- Memastikan sinkronisasi waktu antara UI dan pg_cron (UTC)

-- 1. Update manage_backup_cron_job untuk menangani konversi waktu dengan benar
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
  -- Supabase pg_cron berjalan di UTC.
  -- Kita konversi p_backup_time (dalam p_timezone) ke UTC.
  -- Contoh: 02:00 WIB (Asia/Jakarta, UTC+7) -> 19:00 UTC (hari sebelumnya)
  
  IF p_timezone = 'Asia/Jakarta' OR p_timezone = 'Asia/Bangkok' OR p_timezone = 'Asia/Ho_Chi_Minh' THEN
    v_utc_time := (p_backup_time - INTERVAL '7 hours');
  ELSE
    -- Default assume UTC if unknown
    v_utc_time := p_backup_time;
  END IF;

  v_current_minute := EXTRACT(MINUTE FROM v_utc_time);
  v_current_hour := EXTRACT(HOUR FROM v_utc_time);

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
    VALUES ('success', 'Backup scheduled at ' || p_backup_time || ' (' || p_timezone || ') -> ' || v_schedule_expr || ' UTC');
    
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
    VALUES ('success', 'Backup disabled');
  END IF;
END;
$$;

-- 2. Update get_next_backup_run untuk mengembalikan waktu yang akurat
CREATE OR REPLACE FUNCTION public.get_next_backup_run()
RETURNS TABLE (next_run TIMESTAMPTZ, is_enabled BOOLEAN, schedule TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cron.next_run_after(s.cron_job_id, now()) as next_run,
    s.is_enabled,
    j.schedule::TEXT
  FROM public.backup_settings s
  LEFT JOIN cron.job j ON j.jobid = s.cron_job_id
  LIMIT 1;
END;
$$;
