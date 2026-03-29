-- =============================================================================
-- 14-dynamic-backup-scheduler.sql
-- =============================================================================

-- 0. Ensure required extensions are enabled
-- Note: These might require superuser privileges on some environments, 
-- but on Supabase they are usually available for the 'postgres' role.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 1. Create backup_settings table to store dynamic backup configuration
CREATE TABLE IF NOT EXISTS public.backup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  backup_time TIME NOT NULL DEFAULT '02:00:00',
  timezone TEXT NOT NULL DEFAULT 'Asia/Jakarta',
  cron_job_id BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
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

-- 3. Create a function to manage the pg_cron job dynamically
CREATE OR REPLACE FUNCTION public.manage_backup_cron_job(
  p_is_enabled BOOLEAN,
  p_backup_time TIME,
  p_timezone TEXT DEFAULT 'Asia/Jakarta'
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
BEGIN
  -- Get current cron_job_id from settings
  SELECT cron_job_id INTO v_cron_job_id FROM public.backup_settings LIMIT 1;

  -- Retrieve Supabase secrets from vault
  -- We need SUPABASE_URL to construct the function endpoint
  -- and SUPABASE_ANON_KEY for the Authorization header
  BEGIN
    SELECT value INTO v_project_ref FROM supabase_vault.secrets WHERE name = 'SUPABASE_URL';
    SELECT value INTO v_anon_key FROM supabase_vault.secrets WHERE name = 'SUPABASE_ANON_KEY';
    
    -- Extract project reference from URL (e.g., https://xyz.supabase.co -> xyz)
    v_project_ref := substring(v_project_ref from 'https://([^.]+)\.supabase\.co');
  EXCEPTION WHEN OTHERS THEN
    v_project_ref := NULL; v_anon_key := NULL;
  END;

  -- Fallback: If vault is not accessible, we can't automate the URL/Key
  -- In this case, the user might need to manually set these or we use placeholders
  IF v_project_ref IS NULL OR v_anon_key IS NULL THEN
    -- Log failure to settings or logs if possible
    INSERT INTO public.backup_logs (status, message) 
    VALUES ('failed', 'Could not retrieve Supabase secrets from vault. Cron job not updated.');
    RETURN;
  END IF;

  -- Extract time components
  v_current_minute := EXTRACT(MINUTE FROM p_backup_time);
  v_current_hour := EXTRACT(HOUR FROM p_backup_time);

  -- pg_cron on Supabase runs in UTC. Adjust hour based on timezone.
  -- Asia/Jakarta is UTC+7.
  IF p_timezone = 'Asia/Jakarta' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
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
  END IF;
END;
$$;

-- 4. Create RPC to update settings
CREATE OR REPLACE FUNCTION public.update_backup_settings(
  p_is_enabled BOOLEAN,
  p_backup_time TIME,
  p_timezone TEXT DEFAULT 'Asia/Jakarta'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.backup_settings
  SET is_enabled = p_is_enabled, backup_time = p_backup_time, timezone = p_timezone, updated_at = now()
  WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);

  PERFORM public.manage_backup_cron_job(p_is_enabled, p_backup_time, p_timezone);
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

-- 6. Initial trigger to set up the job based on current settings
-- This ensures that if the table already has data, the cron job is created.
DO $$
DECLARE
  r RECORD;
BEGIN
  SELECT * INTO r FROM public.backup_settings LIMIT 1;
  IF r IS NOT NULL THEN
    PERFORM public.manage_backup_cron_job(r.is_enabled, r.backup_time, r.timezone);
  END IF;
END $$;
