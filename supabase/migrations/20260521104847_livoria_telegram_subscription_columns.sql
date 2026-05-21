alter table public.telegram_subscriptions
  add column if not exists monthly_report_date integer default 1;
