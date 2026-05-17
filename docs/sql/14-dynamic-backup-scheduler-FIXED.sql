-- =============================================================================
-- 14-dynamic-backup-scheduler-FIXED.sql
-- =============================================================================
-- IMPROVED VERSION dengan fallback mechanism untuk Vault access issues
-- Solusi untuk: "Could not retrieve Supabase secrets from vault. Cron job not updated."

-- 0. Ensure required extensions are enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Create backup_settings table to store dynamic backup configuration
CREATE TABLE IF NOT EXISTS public.backup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  backup_time TIME NOT NULL DEFAULT '02:00:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  cron_job_id BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  -- NEW: Store secrets locally as fallback
  supabase_url TEXT,
  supabase_anon_key TEXT
);

-- 2. Create backup_logs table for execution transparency
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL, -- 'success', 'failed'
  message TEXT,
  execution_time TIMESTAMPTZ DEFAULT now(),
  backup_id uuid REFERENCES public.backups(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- Insert default settings if empty
INSERT INTO public.backup_settings (is_enabled, backup_time, timezone)
SELECT TRUE, '02:00:00', 'Asia/Jakarta'
WHERE NOT EXISTS (SELECT 1 FROM public.backup_settings);

-- 3. Create a function to manage the pg_cron job dynamically (IMPROVED)
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
    
    -- Extract project reference from URL (e.g., https://xyz.supabase.co -> xyz)
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
    
    -- Store these for future use
    UPDATE public.backup_settings 
    SET supabase_url = p_supabase_url, supabase_anon_key = p_supabase_anon_key
    WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
  END IF;

  -- Strategy 3: Try to retrieve from backup_settings table (previously stored)
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

  -- pg_cron on Supabase runs in UTC. Adjust hour based on timezone.
  -- Asia/Jakarta is UTC+7.
  IF p_timezone = 'Asia/Jakarta' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
  ELSIF p_timezone = 'Asia/Bangkok' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
  ELSIF p_timezone = 'Asia/Ho_Chi_Minh' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
  ELSIF p_timezone = 'UTC' THEN
    -- No adjustment needed
  END IF;

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
    
    -- Log success
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('success', 'Backup cron job scheduled successfully at ' || v_schedule_expr || ' UTC');
    
  ELSE
    -- Unschedule if disabled
    -- Try by ID first
    IF v_cron_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_cron_job_id);
    END IF;
    
    -- Then try by name to be sure
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
    VALUES ('success', 'Backup cron job unscheduled');
  END IF;
END;
$$;

-- 4. Create RPC to update settings (IMPROVED)
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

-- 5. RPC to get next run time for frontend countdown
CREATE OR REPLACE FUNCTION public.get_next_backup_run()
RETURNS TABLE (next_run TIMESTAMPTZ, is_enabled BOOLEAN)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cron.next_run_after(s.cron_job_id, now()) as next_run,
    s.is_enabled
  FROM public.backup_settings s
  LIMIT 1;
END;
$$;

-- 6. NEW: Helper function to initialize backup settings with secrets
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
  
  -- Try to schedule the job with these secrets
  PERFORM public.manage_backup_cron_job(
    TRUE,
    (SELECT backup_time FROM public.backup_settings LIMIT 1),
    (SELECT timezone FROM public.backup_settings LIMIT 1),
    p_supabase_url,
    p_supabase_anon_key
  );
END;
$$;

-- 7. Initial trigger to set up the job based on current settings
DO $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM public.backup_settings LIMIT 1;
  IF r IS NOT NULL THEN
    PERFORM public.manage_backup_cron_job(r.is_enabled, r.backup_time, r.timezone);
  END IF;
END $$;
