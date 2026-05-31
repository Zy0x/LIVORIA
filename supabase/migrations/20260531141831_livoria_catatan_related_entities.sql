alter table public.catatan
  add column if not exists related_type text,
  add column if not exists related_id uuid,
  add column if not exists related_title text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catatan_related_type_check'
      and conrelid = 'public.catatan'::regclass
  ) then
    alter table public.catatan
      add constraint catatan_related_type_check
      check (
        related_type is null
        or related_type in ('tagihan', 'anime', 'donghua', 'waifu', 'obat')
      );
  end if;
end $$;

create index if not exists idx_catatan_user_related
  on public.catatan(user_id, related_type, related_id);
