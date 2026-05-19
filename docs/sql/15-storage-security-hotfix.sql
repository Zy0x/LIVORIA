-- LIVORIA Phase 1 Storage Security Hotfix
-- Review and run in Supabase SQL Editor after deployment planning.
-- Goal:
-- - Keep struk private.
-- - Keep waifu bucket name consistent with frontend code.
-- - Ensure user-owned storage paths can be inserted, selected, updated, and deleted.

insert into storage.buckets (id, name, public)
values
  ('covers', 'covers', true),
  ('waifu', 'waifu', true),
  ('struk', 'struk', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can update own files" on storage.objects;

create policy "Users can update own files"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('covers', 'struk', 'waifu')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('covers', 'struk', 'waifu')
  and (storage.foldername(name))[1] = auth.uid()::text
);
