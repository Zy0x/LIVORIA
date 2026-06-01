insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'catatan-assets',
  'catatan-assets',
  false,
  26214400,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create table if not exists public.catatan_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catatan_id uuid references public.catatan(id) on delete cascade,
  draft_key text,
  bucket text not null default 'catatan-assets',
  object_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  kind text not null,
  created_at timestamptz not null default now(),
  unique (bucket, object_path)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catatan_assets_kind_check'
      and conrelid = 'public.catatan_assets'::regclass
  ) then
    alter table public.catatan_assets
      add constraint catatan_assets_kind_check
      check (kind in ('image', 'video', 'drawing', 'shape'));
  end if;
end $$;

alter table public.catatan_assets enable row level security;

drop policy if exists "Users can manage own catatan assets" on public.catatan_assets;
create policy "Users can manage own catatan assets" on public.catatan_assets
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.catatan_assets to authenticated;

create index if not exists idx_catatan_assets_user_catatan
  on public.catatan_assets(user_id, catatan_id);

create index if not exists idx_catatan_assets_user_draft
  on public.catatan_assets(user_id, draft_key);

drop policy if exists "Users can read own catatan storage objects" on storage.objects;
create policy "Users can read own catatan storage objects"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'catatan-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload own catatan storage objects" on storage.objects;
create policy "Users can upload own catatan storage objects"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'catatan-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own catatan storage objects" on storage.objects;
create policy "Users can update own catatan storage objects"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'catatan-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'catatan-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own catatan storage objects" on storage.objects;
create policy "Users can delete own catatan storage objects"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'catatan-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
