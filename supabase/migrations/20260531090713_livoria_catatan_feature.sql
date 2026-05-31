create table if not exists public.catatan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  content text not null default '',
  tags text[] not null default '{}'::text[],
  color text not null default 'sage',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.catatan enable row level security;

drop policy if exists "Users can manage own catatan" on public.catatan;
create policy "Users can manage own catatan" on public.catatan
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.catatan to authenticated;

create index if not exists idx_catatan_user_id on public.catatan(user_id);
create index if not exists idx_catatan_user_updated_at on public.catatan(user_id, updated_at desc);
create index if not exists idx_catatan_user_pinned on public.catatan(user_id, is_pinned desc, updated_at desc);
