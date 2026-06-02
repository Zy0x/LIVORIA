create index if not exists idx_anime_user_created_at_desc
  on public.anime(user_id, created_at desc);

create index if not exists idx_donghua_user_created_at_desc
  on public.donghua(user_id, created_at desc);
