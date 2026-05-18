-- ============================================================
-- LIVORIA: Tabel Telegram Subscriptions
-- ============================================================

CREATE TABLE public.telegram_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_id BIGINT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  notify_monthly_report BOOLEAN DEFAULT true,
  monthly_report_date INTEGER DEFAULT 1,
  notify_overdue BOOLEAN DEFAULT true,
  notify_due_reminder BOOLEAN DEFAULT true,
  reminder_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.telegram_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: User bisa baca subscription sendiri
CREATE POLICY "Users can view own telegram subscription"
ON public.telegram_subscriptions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Cron Jobs (jalankan di SQL Editor Supabase Anda):
-- Wajib set secret yang sama di Supabase Edge Function sebagai TELEGRAM_CRON_SECRET
-- lalu pakai header x-livoria-cron-secret di setiap request cron.
-- 
-- 1. Laporan Bulanan (setiap tanggal 1 pukul 08:00 WIB = 01:00 UTC)
-- SELECT cron.schedule('telegram-monthly-report', '0 1 1 * *', $$
--   SELECT net.http_post(
--     url:='https://<PROJECT_REF>.supabase.co/functions/v1/telegram-tagihan',
--     headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>","x-livoria-cron-secret":"<TELEGRAM_CRON_SECRET>"}'::jsonb,
--     body:='{"action":"monthly_report"}'::jsonb
--   );
-- $$);
--
-- 2. Reminder Harian (setiap hari pukul 08:00 WIB = 01:00 UTC)
-- SELECT cron.schedule('telegram-daily-reminder', '0 1 * * *', $$
--   SELECT net.http_post(
--     url:='https://<PROJECT_REF>.supabase.co/functions/v1/telegram-tagihan',
--     headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>","x-livoria-cron-secret":"<TELEGRAM_CRON_SECRET>"}'::jsonb,
--     body:='{"action":"daily_reminder"}'::jsonb
--   );
-- $$);
--
-- 3. Overdue Alert (setiap hari pukul 09:00 WIB = 02:00 UTC)
-- SELECT cron.schedule('telegram-overdue-alert', '0 2 * * *', $$
--   SELECT net.http_post(
--     url:='https://<PROJECT_REF>.supabase.co/functions/v1/telegram-tagihan',
--     headers:='{"Content-Type":"application/json","Authorization":"Bearer <ANON_KEY>","x-livoria-cron-secret":"<TELEGRAM_CRON_SECRET>"}'::jsonb,
--     body:='{"action":"overdue_alert"}'::jsonb
--   );
-- $$);
