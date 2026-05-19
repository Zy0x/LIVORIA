-- ============================================================
-- LIVORIA: Dashboard Summary RPC
-- ============================================================
-- Purpose:
-- - Provide dashboard counters and financial totals without pulling
--   every stats-only table row to the frontend.
-- - Uses auth.uid() and SECURITY INVOKER so RLS remains in force.
-- - Does not expose rows or data owned by other users.
--
-- Install from Supabase SQL Editor or psql after core tables/RLS exist.

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
    select
      count(*)::bigint as anime_count,
      count(*) filter (where status = 'on-going')::bigint as anime_ongoing_count
    from public.anime, current_user_id
    where user_id = current_user_id.id
  ),
  donghua_summary as (
    select
      count(*)::bigint as donghua_count,
      count(*) filter (where status = 'on-going')::bigint as donghua_ongoing_count
    from public.donghua, current_user_id
    where user_id = current_user_id.id
  ),
  waifu_summary as (
    select
      count(*)::bigint as waifu_count,
      count(*) filter (where tier = 'S')::bigint as waifu_tier_s_count
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
