create index if not exists idx_tagihan_user_created_at_desc
  on public.tagihan(user_id, created_at desc);

create index if not exists idx_waifu_user_created_at_desc
  on public.waifu(user_id, created_at desc);

create index if not exists idx_obat_user_created_at_desc
  on public.obat(user_id, created_at desc);

create index if not exists idx_anime_user_title
  on public.anime(user_id, title);

create index if not exists idx_donghua_user_title
  on public.donghua(user_id, title);
