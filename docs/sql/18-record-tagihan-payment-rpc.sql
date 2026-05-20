-- LIVORIA - atomic Tagihan payment RPC
--
-- Apply this SQL in Supabase before relying on high-volume payment writes.
-- The function is SECURITY INVOKER by default, so table RLS still applies.
-- It uses auth.uid() and writes tagihan + tagihan_history in one database
-- transaction through a single RPC call.

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
  set
    total_dibayar = v_total_dibayar,
    sisa_hutang = v_sisa_hutang,
    status = v_status
  where id = p_tagihan_id
    and user_id = v_user_id;

  insert into public.tagihan_history (
    tagihan_id,
    user_id,
    aksi,
    detail,
    jumlah
  ) values (
    p_tagihan_id,
    v_user_id,
    'pembayaran',
    concat('Pembayaran ', nullif(trim(coalesce(p_keterangan, '')), ''), ' pada ', p_tanggal::text),
    v_amount
  );

  return query select
    p_tagihan_id,
    v_total_dibayar,
    v_sisa_hutang,
    v_status,
    v_sisa_hutang <= 0;
end;
$$;

grant execute on function public.record_tagihan_payment(uuid, numeric, date, text) to authenticated;
