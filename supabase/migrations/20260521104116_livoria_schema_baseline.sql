-- LIVORIA schema baseline
-- Generated after detecting that the linked Supabase project did not expose
-- the LIVORIA tables used by the web app. The migration is intentionally
-- idempotent so it can be applied to an empty project or a partially prepared
-- project without dropping existing data.

create extension if not exists pgcrypto;

do $$
begin
  create type public.tagihan_status as enum ('aktif', 'lunas', 'overdue', 'ditunda');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.jenis_tempo as enum ('bulanan', 'berjangka');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.sumber_modal_type as enum ('modal_terpisah', 'modal_bergulir', 'dana_luar');
exception
  when duplicate_object then null;
end $$;

alter type public.sumber_modal_type add value if not exists 'dana_luar';

create table if not exists public.tagihan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debitur_nama text not null default '',
  debitur_kontak text default '',
  barang_nama text not null default '',
  harga_awal numeric(15,2) not null default 0,
  bunga_persen numeric(8,4) not null default 0,
  jangka_waktu_bulan integer not null default 1,
  cicilan_per_bulan numeric(15,2) not null default 0,
  tanggal_mulai date not null default current_date,
  tanggal_jatuh_tempo date not null default current_date,
  tanggal_mulai_bayar date,
  status public.tagihan_status not null default 'aktif',
  total_dibayar numeric(15,2) not null default 0,
  total_hutang numeric(15,2) not null default 0,
  sisa_hutang numeric(15,2) not null default 0,
  keuntungan_estimasi numeric(15,2) not null default 0,
  denda_persen_per_hari numeric(8,4) not null default 0,
  catatan text default '',
  metode_pembayaran text default '',
  sumber_modal public.sumber_modal_type default 'modal_terpisah',
  jenis_tempo public.jenis_tempo default 'bulanan',
  tgl_bayar_tanggal text,
  tgl_tempo_tanggal text,
  tgl_bayar_hari integer,
  tgl_tempo_hari integer,
  kuantitas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tagihan add column if not exists kuantitas text;
alter table public.tagihan add column if not exists updated_at timestamptz not null default now();

create table if not exists public.tagihan_history (
  id uuid primary key default gen_random_uuid(),
  tagihan_id uuid not null references public.tagihan(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  aksi text not null default '',
  detail text default '',
  jumlah numeric(15,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.struk (
  id uuid primary key default gen_random_uuid(),
  tagihan_id uuid not null references public.tagihan(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null default '',
  file_name text not null default '',
  file_type text default '',
  keterangan text default '',
  uploaded_at timestamptz not null default now()
);

create table if not exists public.anime (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  status text not null default 'planned' check (status in ('on-going', 'completed', 'planned')),
  genre text default '',
  rating numeric(3,1) default 0,
  episodes integer default 0,
  episodes_watched integer default 0,
  cover_url text default '',
  synopsis text default '',
  notes text default '',
  season integer default 1,
  cour text default '',
  streaming_url text default '',
  schedule text default '',
  parent_title text default '',
  is_favorite boolean default false,
  is_bookmarked boolean default false,
  is_movie boolean default false,
  duration_minutes integer,
  is_hentai boolean default false,
  watch_status text default 'none' check (watch_status in ('none', 'want_to_watch', 'watching', 'watched')),
  watched_at timestamptz,
  release_year integer,
  studio text,
  mal_url text,
  anilist_url text,
  mal_id integer,
  anilist_id integer,
  alternative_titles text,
  created_at timestamptz not null default now()
);

create table if not exists public.donghua (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  status text not null default 'planned' check (status in ('on-going', 'completed', 'planned')),
  genre text default '',
  rating numeric(3,1) default 0,
  episodes integer default 0,
  episodes_watched integer default 0,
  cover_url text default '',
  synopsis text default '',
  notes text default '',
  season integer default 1,
  cour text default '',
  streaming_url text default '',
  schedule text default '',
  parent_title text default '',
  is_favorite boolean default false,
  is_bookmarked boolean default false,
  is_movie boolean default false,
  duration_minutes integer,
  is_hentai boolean default false,
  watch_status text default 'none' check (watch_status in ('none', 'want_to_watch', 'watching', 'watched')),
  watched_at timestamptz,
  release_year integer,
  studio text,
  mal_url text,
  anilist_url text,
  mal_id integer,
  anilist_id integer,
  alternative_titles text,
  created_at timestamptz not null default now()
);

alter table public.anime add column if not exists is_hentai boolean default false;
alter table public.donghua add column if not exists is_hentai boolean default false;

create table if not exists public.waifu (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  source text default '',
  source_type text default 'anime' check (source_type in ('anime', 'donghua')),
  tier text default 'B' check (tier in ('S', 'A', 'B', 'C')),
  image_url text default '',
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.obat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '',
  type text default '',
  dosage text default '',
  usage_info text default '',
  notes text default '',
  frequency text default '',
  side_effects text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  anime_title_lang text default 'original',
  donghua_title_lang text default 'original',
  theme text default 'system',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.telegram_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  chat_id bigint not null,
  is_active boolean default true,
  notify_monthly_report boolean default true,
  monthly_report_date integer default 1,
  notify_overdue boolean default true,
  notify_due_reminder boolean default true,
  reminder_days_before integer default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.backups (
  id uuid primary key default gen_random_uuid(),
  content jsonb not null,
  created_at timestamptz default now()
);

create table if not exists public.backup_settings (
  id uuid primary key default gen_random_uuid(),
  is_enabled boolean not null default true,
  backup_time time not null default '02:00:00',
  timezone text not null default 'Asia/Jakarta',
  cron_job_id bigint,
  updated_at timestamptz default now(),
  supabase_url text,
  supabase_anon_key text
);

create table if not exists public.backup_logs (
  id uuid primary key default gen_random_uuid(),
  status text not null,
  message text,
  execution_time timestamptz default now(),
  backup_id uuid references public.backups(id) on delete set null
);

insert into public.backup_settings (is_enabled, backup_time, timezone)
select true, '02:00:00', 'Asia/Jakarta'
where not exists (select 1 from public.backup_settings);

create index if not exists idx_tagihan_user_id on public.tagihan(user_id);
create index if not exists idx_tagihan_status on public.tagihan(status);
create index if not exists idx_tagihan_tanggal_jatuh_tempo on public.tagihan(tanggal_jatuh_tempo);
create index if not exists idx_tagihan_history_tagihan_id on public.tagihan_history(tagihan_id);
create index if not exists idx_tagihan_history_user_id on public.tagihan_history(user_id);
create index if not exists idx_struk_tagihan_id on public.struk(tagihan_id);
create index if not exists idx_anime_user_id on public.anime(user_id);
create index if not exists idx_anime_status on public.anime(status);
create index if not exists idx_anime_parent_title on public.anime(parent_title);
create index if not exists idx_anime_watch_status on public.anime(watch_status);
create index if not exists idx_anime_is_movie on public.anime(is_movie);
create index if not exists idx_anime_is_hentai on public.anime(is_hentai);
create index if not exists idx_donghua_user_id on public.donghua(user_id);
create index if not exists idx_donghua_status on public.donghua(status);
create index if not exists idx_donghua_parent_title on public.donghua(parent_title);
create index if not exists idx_donghua_watch_status on public.donghua(watch_status);
create index if not exists idx_donghua_is_hentai on public.donghua(is_hentai);
create index if not exists idx_waifu_user_id on public.waifu(user_id);
create index if not exists idx_waifu_tier on public.waifu(tier);
create index if not exists idx_obat_user_id on public.obat(user_id);

alter table public.tagihan enable row level security;
alter table public.tagihan_history enable row level security;
alter table public.struk enable row level security;
alter table public.anime enable row level security;
alter table public.donghua enable row level security;
alter table public.waifu enable row level security;
alter table public.obat enable row level security;
alter table public.user_preferences enable row level security;
alter table public.telegram_subscriptions enable row level security;
alter table public.backups enable row level security;
alter table public.backup_settings enable row level security;
alter table public.backup_logs enable row level security;

drop policy if exists "Users can manage own tagihan" on public.tagihan;
create policy "Users can manage own tagihan" on public.tagihan
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own tagihan history" on public.tagihan_history;
create policy "Users can manage own tagihan history" on public.tagihan_history
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own struk" on public.struk;
create policy "Users can manage own struk" on public.struk
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own anime" on public.anime;
create policy "Users can manage own anime" on public.anime
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own donghua" on public.donghua;
create policy "Users can manage own donghua" on public.donghua
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own waifu" on public.waifu;
create policy "Users can manage own waifu" on public.waifu
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own obat" on public.obat;
create policy "Users can manage own obat" on public.obat
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage own preferences" on public.user_preferences;
create policy "Users can manage own preferences" on public.user_preferences
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own telegram subscription" on public.telegram_subscriptions;
drop policy if exists "Users can manage own telegram subscription" on public.telegram_subscriptions;
create policy "Users can manage own telegram subscription" on public.telegram_subscriptions
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.get_dashboard_summary()
returns table (
  tagihan_count bigint,
  tagihan_aktif_count bigint,
  tagihan_lunas_count bigint,
  tagihan_overdue_status_count bigint,
  tagihan_ditunda_count bigint,
  tagihan_total_modal_terpisah numeric,
  tagihan_total_modal_bergulir numeric,
  tagihan_total_dibayar numeric,
  tagihan_total_keuntungan numeric,
  tagihan_monthly_income numeric,
  anime_count bigint,
  anime_ongoing_count bigint,
  donghua_count bigint,
  donghua_ongoing_count bigint,
  waifu_count bigint,
  waifu_tier_s_count bigint,
  obat_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with current_user_id as (
    select auth.uid() as id
  ),
  tagihan_summary as (
    select
      count(*)::bigint as tagihan_count,
      count(*) filter (where status = 'aktif')::bigint as tagihan_aktif_count,
      count(*) filter (where status = 'lunas')::bigint as tagihan_lunas_count,
      count(*) filter (where status = 'overdue')::bigint as tagihan_overdue_status_count,
      count(*) filter (where status = 'ditunda')::bigint as tagihan_ditunda_count,
      coalesce(sum(harga_awal) filter (where sumber_modal is distinct from 'modal_bergulir'), 0)::numeric as tagihan_total_modal_terpisah,
      coalesce(sum(harga_awal) filter (where sumber_modal = 'modal_bergulir'), 0)::numeric as tagihan_total_modal_bergulir,
      coalesce(sum(total_dibayar), 0)::numeric as tagihan_total_dibayar,
      coalesce(sum(keuntungan_estimasi), 0)::numeric as tagihan_total_keuntungan,
      coalesce(sum(cicilan_per_bulan) filter (where status is distinct from 'lunas'), 0)::numeric as tagihan_monthly_income
    from public.tagihan, current_user_id
    where user_id = current_user_id.id
  ),
  anime_summary as (
    select count(*)::bigint as anime_count, count(*) filter (where status = 'on-going')::bigint as anime_ongoing_count
    from public.anime, current_user_id
    where user_id = current_user_id.id
  ),
  donghua_summary as (
    select count(*)::bigint as donghua_count, count(*) filter (where status = 'on-going')::bigint as donghua_ongoing_count
    from public.donghua, current_user_id
    where user_id = current_user_id.id
  ),
  waifu_summary as (
    select count(*)::bigint as waifu_count, count(*) filter (where tier = 'S')::bigint as waifu_tier_s_count
    from public.waifu, current_user_id
    where user_id = current_user_id.id
  ),
  obat_summary as (
    select count(*)::bigint as obat_count
    from public.obat, current_user_id
    where user_id = current_user_id.id
  )
  select
    tagihan_summary.tagihan_count,
    tagihan_summary.tagihan_aktif_count,
    tagihan_summary.tagihan_lunas_count,
    tagihan_summary.tagihan_overdue_status_count,
    tagihan_summary.tagihan_ditunda_count,
    tagihan_summary.tagihan_total_modal_terpisah,
    tagihan_summary.tagihan_total_modal_bergulir,
    tagihan_summary.tagihan_total_dibayar,
    tagihan_summary.tagihan_total_keuntungan,
    tagihan_summary.tagihan_monthly_income,
    anime_summary.anime_count,
    anime_summary.anime_ongoing_count,
    donghua_summary.donghua_count,
    donghua_summary.donghua_ongoing_count,
    waifu_summary.waifu_count,
    waifu_summary.waifu_tier_s_count,
    obat_summary.obat_count
  from tagihan_summary
  cross join anime_summary
  cross join donghua_summary
  cross join waifu_summary
  cross join obat_summary;
$$;

grant execute on function public.get_dashboard_summary() to authenticated;

create or replace function public.record_tagihan_payment(
  p_tagihan_id uuid,
  p_amount numeric,
  p_tanggal date default current_date,
  p_keterangan text default ''
)
returns table (
  tagihan_id uuid,
  total_dibayar numeric,
  sisa_hutang numeric,
  status text,
  is_lunas boolean
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_tagihan record;
  v_amount numeric := coalesce(p_amount, 0);
  v_total_dibayar numeric;
  v_sisa_hutang numeric;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if v_amount <= 0 then
    raise exception 'payment_amount_must_be_positive' using errcode = '22023';
  end if;

  select id, user_id, status, total_hutang, total_dibayar
  into v_tagihan
  from public.tagihan
  where id = p_tagihan_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'tagihan_not_found' using errcode = 'P0002';
  end if;

  if v_tagihan.status = 'lunas' then
    raise exception 'tagihan_already_paid' using errcode = '22023';
  end if;

  v_total_dibayar := coalesce(v_tagihan.total_dibayar, 0) + v_amount;
  v_sisa_hutang := greatest(0, coalesce(v_tagihan.total_hutang, 0) - v_total_dibayar);
  v_status := case when v_sisa_hutang <= 0 then 'lunas' else v_tagihan.status end;

  update public.tagihan
  set total_dibayar = v_total_dibayar,
      sisa_hutang = v_sisa_hutang,
      status = v_status,
      updated_at = now()
  where id = p_tagihan_id
    and user_id = v_user_id;

  insert into public.tagihan_history (tagihan_id, user_id, aksi, detail, jumlah)
  values (
    p_tagihan_id,
    v_user_id,
    'pembayaran',
    concat('Pembayaran ', nullif(trim(coalesce(p_keterangan, '')), ''), ' pada ', p_tanggal::text),
    v_amount
  );

  return query select p_tagihan_id, v_total_dibayar, v_sisa_hutang, v_status, v_sisa_hutang <= 0;
end;
$$;

grant execute on function public.record_tagihan_payment(uuid, numeric, date, text) to authenticated;

create or replace function public.get_public_tables()
returns table (table_name text)
language sql
security definer
set search_path = public, information_schema
as $$
  select t.table_name::text
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and t.table_name not like 'pg_%'
    and t.table_name not like 'sql_%';
$$;
