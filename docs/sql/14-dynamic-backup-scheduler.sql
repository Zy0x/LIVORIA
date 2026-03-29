-- 1. Create backup_settings table to store dynamic backup configuration
CREATE TABLE IF NOT EXISTS public.backup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  backup_time TIME NOT NULL DEFAULT '02:00:00',
  cron_job_id BIGINT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for backup_settings, restrict to service role only
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;

-- Insert default settings if table is empty
INSERT INTO public.backup_settings (is_enabled, backup_time)
SELECT TRUE, '02:00:00'
WHERE NOT EXISTS (SELECT 1 FROM public.backup_settings);

-- 2. Create a function to manage the pg_cron job dynamically
CREATE OR REPLACE FUNCTION public.manage_backup_cron_job(
  p_is_enabled BOOLEAN,
  p_backup_time TIME
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
  -- Get current backup settings
  SELECT cron_job_id INTO v_cron_job_id FROM public.backup_settings LIMIT 1;

  -- Attempt to get Supabase secrets from vault (standard for newer projects)
  -- If vault is not accessible or secrets are not there, we'll need manual setup
  BEGIN
    SELECT value INTO v_project_ref FROM supabase_vault.secrets WHERE name = 'SUPABASE_URL';
    SELECT value INTO v_anon_key FROM supabase_vault.secrets WHERE name = 'SUPABASE_ANON_KEY';
    
    -- Extract project ref from URL (e.g., https://xyz.supabase.co -> xyz)
    v_project_ref := substring(v_project_ref from 'https://([^.]+)\.supabase\.co');
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: If vault fails, you must manually set these or ensure secrets are in vault
    v_project_ref := NULL;
    v_anon_key := NULL;
  END;

  -- Check if we have the required info
  IF v_project_ref IS NULL OR v_anon_key IS NULL THEN
    RAISE NOTICE 'Supabase secrets not found in vault. Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are in supabase_vault.secrets.';
    RETURN;
  END IF;

  -- Extract hour and minute from p_backup_time
  v_current_minute := EXTRACT(MINUTE FROM p_backup_time);
  v_current_hour := EXTRACT(HOUR FROM p_backup_time);

  -- Construct cron schedule expression: "minute hour * * *"
  v_schedule_expr := v_current_minute || ' ' || v_current_hour || ' * * *';

  -- Construct the command to call the admin-backup edge function
  -- We use simple concatenation and quote_literal to avoid dollar-quoting parser errors
  v_command := 'SELECT net.http_post(url:=' || quote_literal('https://' || v_project_ref || '.supabase.co/functions/v1/admin-backup') || 
               ', headers:=' || quote_literal('{"Content-Type":"application/json","Authorization":"Bearer ' || v_anon_key || '"}') || '::jsonb' ||
               ', body:=' || quote_literal('{"action":"backup","isAuto":true}') || '::jsonb);';

  IF p_is_enabled THEN
    IF v_cron_job_id IS NULL THEN
      -- Create new cron job if not exists
      v_cron_job_id := cron.schedule('daily-auto-backup', v_schedule_expr, v_command);
      UPDATE public.backup_settings SET cron_job_id = v_cron_job_id, updated_at = now() WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    ELSE
      -- Update existing cron job schedule
      PERFORM cron.alter_job(v_cron_job_id, v_schedule_expr, v_command);
      UPDATE public.backup_settings SET updated_at = now() WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    END IF;
  ELSE
    IF v_cron_job_id IS NOT NULL THEN
      -- Unschedule cron job if disabled
      PERFORM cron.unschedule(v_cron_job_id);
      UPDATE public.backup_settings SET cron_job_id = NULL, updated_at = now() WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);
    END IF;
  END IF;
END;
$$;

-- 3. Create RPC to call manage_backup_cron_job from edge function
CREATE OR REPLACE FUNCTION public.update_backup_settings(
  p_is_enabled BOOLEAN,
  p_backup_time TIME
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update settings in the table
  UPDATE public.backup_settings
  SET
    is_enabled = p_is_enabled,
    backup_time = p_backup_time,
    updated_at = now()
  WHERE id = (SELECT id FROM public.backup_settings LIMIT 1);

  -- Manage the cron job
  PERFORM public.manage_backup_cron_job(p_is_enabled, p_backup_time);
END;
$$;

-- 4. Initial setup: ensure cron job is scheduled based on default settings
DO $$
DECLARE
  v_is_enabled BOOLEAN;
  v_backup_time TIME;
BEGIN
  SELECT is_enabled, backup_time INTO v_is_enabled, v_backup_time FROM public.backup_settings LIMIT 1;
  PERFORM public.manage_backup_cron_job(v_is_enabled, v_backup_time);
END;
$$;
