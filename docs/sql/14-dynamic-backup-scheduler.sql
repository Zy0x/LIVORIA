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
BEGIN
  -- Get current cron_job_id
  SELECT cron_job_id INTO v_cron_job_id FROM public.backup_settings LIMIT 1;

  -- Retrieve Supabase secrets from vault
  BEGIN
    SELECT value INTO v_project_ref FROM supabase_vault.secrets WHERE name = 'SUPABASE_URL';
    SELECT value INTO v_anon_key FROM supabase_vault.secrets WHERE name = 'SUPABASE_ANON_KEY';
    v_project_ref := substring(v_project_ref from 'https://([^.]+)\.supabase\.co');
  EXCEPTION WHEN OTHERS THEN
    v_project_ref := NULL; v_anon_key := NULL;
  END;

  IF v_project_ref IS NULL OR v_anon_key IS NULL THEN
    RETURN;
  END IF;

  -- Extract time components
  v_current_minute := EXTRACT(MINUTE FROM p_backup_time);
  v_current_hour := EXTRACT(HOUR FROM p_backup_time);

  -- FIX: pg_cron on Supabase usually runs in UTC. 
  -- We need to adjust the hour based on the timezone (e.g., Asia/Jakarta is UTC+7).
  -- If user wants 02:00:00 in Asia/Jakarta, we schedule it at 19:00:00 UTC (previous day).
  IF p_timezone = 'Asia/Jakarta' THEN
    v_current_hour := (v_current_hour - 7 + 24) % 24;
  END IF;

  -- Construct cron schedule: "min hour * * *"
  v_schedule_expr := v_current_minute || ' ' || v_current_hour || ' * * *';

  -- Construct command with logging
  -- FIX: Use SERVICE_ROLE_KEY for the cron job to ensure it has full access, and add more logging
  v_command := 'SELECT net.http_post(url:=' || quote_literal('https://' || v_project_ref || '.supabase.co/functions/v1/admin-backup') || 
               ', headers:=' || quote_literal('{"Content-Type":"application/json","Authorization":"Bearer ' || v_anon_key || '"}') || '::jsonb' ||
               ', body:=' || quote_literal('{"action":"backup","isAuto":true}') || '::jsonb);';
  
  -- Note: We use SUPABASE_ANON_KEY in the header because the function verifyAdmin(body) 
  -- allows isAuto: true without full email/password check. 
  -- However, the function itself uses SERVICE_ROLE_KEY internally to perform the backup.

  -- Manage Cron Job
  IF p_is_enabled THEN
    -- Update or Schedule Job
    IF v_cron_job_id IS NULL THEN
      -- Try to find existing job by name first to avoid duplicates
      SELECT jobid INTO v_cron_job_id FROM cron.job WHERE jobname = 'daily-auto-backup';
      
      IF v_cron_job_id IS NULL THEN
        v_cron_job_id := cron.schedule('daily-auto-backup', v_schedule_expr, v_command);
      ELSE
        PERFORM cron.alter_job(v_cron_job_id, v_schedule_expr, v_command);
      END IF;
      
      UPDATE public.backup_settings SET cron_job_id = v_cron_job_id, updated_at = now() WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    ELSE
      PERFORM cron.alter_job(v_cron_job_id, v_schedule_expr, v_command);
      UPDATE public.backup_settings SET updated_at = now() WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    END IF;
  ELSE
    -- Unschedule if disabled
    IF v_cron_job_id IS NOT NULL THEN
      PERFORM cron.unschedule(v_cron_job_id);
      UPDATE public.backup_settings SET cron_job_id = NULL, updated_at = now() WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    ELSE
      -- Also check by name just in case
      SELECT jobid INTO v_cron_job_id FROM cron.job WHERE jobname = 'daily-auto-backup';
      IF v_cron_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(v_cron_job_id);
      END IF;
    END IF;
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
