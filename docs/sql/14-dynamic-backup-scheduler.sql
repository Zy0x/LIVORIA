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
  v_supabase_url TEXT;
  v_supabase_anon_key TEXT;
  v_project_ref TEXT;
BEGIN
  -- Get current backup settings
  SELECT cron_job_id INTO v_cron_job_id FROM public.backup_settings LIMIT 1;

  -- Retrieve Supabase secrets
  SELECT value INTO v_supabase_url FROM supabase_vault.get_secret('SUPABASE_URL');
  SELECT value INTO v_supabase_anon_key FROM supabase_vault.get_secret('SUPABASE_ANON_KEY');

  -- Extract project ref from SUPABASE_URL
  v_project_ref := substring(v_supabase_url from 'https://([^.]+)\.supabase\.co');

  -- Extract hour and minute from p_backup_time
  v_current_minute := EXTRACT(MINUTE FROM p_backup_time);
  v_current_hour := EXTRACT(HOUR FROM p_backup_time);

  -- Construct cron schedule expression: "minute hour * * *"
  v_schedule_expr := v_current_minute || ' ' || v_current_hour || ' * * *';

  -- Construct the command to call the admin-backup edge function
  -- Use dollar-quoting for the command string to avoid issues with single quotes
  v_command := format(
    $$
      SELECT net.http_post(
        url:='https://%s.supabase.co/functions/v1/admin-backup',
        headers:='{"Content-Type":"application/json","Authorization":"Bearer %s"}'::jsonb,
        body:='{"action":"backup","isAuto":true}'::jsonb
      );
    $$,
    v_project_ref,
    v_supabase_anon_key
  );

  IF p_is_enabled THEN
    IF v_cron_job_id IS NULL THEN
      -- Create new cron job if not exists
      SELECT cron.schedule('daily-auto-backup', v_schedule_expr, v_command) INTO v_cron_job_id;
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
