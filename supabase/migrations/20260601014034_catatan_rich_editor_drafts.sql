alter table public.catatan
  add column if not exists content_doc jsonb,
  add column if not exists content_format text not null default 'plain_text';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catatan_content_format_check'
      and conrelid = 'public.catatan'::regclass
  ) then
    alter table public.catatan
      add constraint catatan_content_format_check
      check (content_format in ('plain_text', 'tiptap_json_v1'));
  end if;
end $$;

create table if not exists public.catatan_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  catatan_id uuid references public.catatan(id) on delete cascade,
  draft_key text not null,
  title text not null default '',
  content text not null default '',
  content_doc jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  tags text[] not null default '{}'::text[],
  color text not null default 'sage',
  is_pinned boolean not null default false,
  related_type text,
  related_id uuid,
  related_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, draft_key)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'catatan_drafts_color_check'
      and conrelid = 'public.catatan_drafts'::regclass
  ) then
    alter table public.catatan_drafts
      add constraint catatan_drafts_color_check
      check (color in ('sage', 'blue', 'amber', 'rose', 'violet'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'catatan_drafts_related_type_check'
      and conrelid = 'public.catatan_drafts'::regclass
  ) then
    alter table public.catatan_drafts
      add constraint catatan_drafts_related_type_check
      check (
        related_type is null
        or related_type in ('tagihan', 'anime', 'donghua', 'waifu', 'obat')
      );
  end if;
end $$;

alter table public.catatan_drafts enable row level security;

drop policy if exists "Users can manage own catatan drafts" on public.catatan_drafts;
create policy "Users can manage own catatan drafts" on public.catatan_drafts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.catatan_drafts to authenticated;

create index if not exists idx_catatan_drafts_user_updated
  on public.catatan_drafts(user_id, updated_at desc);

create index if not exists idx_catatan_drafts_user_catatan
  on public.catatan_drafts(user_id, catatan_id);
