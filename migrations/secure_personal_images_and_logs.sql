-- Final storage privacy migration for personal closet images while preserving explicit demo image access.
-- Prepared for Supabase review/application; not applied by this local change.
--
-- Apply only after:
--   1. migrations/prepare_image_metadata.sql has been applied.
--   2. compatible image-reading code is deployed.
--   3. existing object paths have been inventoried and demo files verified under demo/.
--
-- Assumptions:
--   personal images: closet/<auth.uid()>/<filename>
--   demo images:     closet/demo/<filename>
--
-- Existing files are not moved, deleted, or assigned guessed owners by this migration.

begin;

-- Make the mixed closet bucket private. Demo files remain explicitly readable by policy below.
update storage.buckets
set public = false
where id = 'closet';

-- Remove known broad policies from historical scripts and confirmed live inspection.
drop policy if exists "Public Access" on storage.objects;
drop policy if exists "Public Insert" on storage.objects;
drop policy if exists "Users can read own closet images" on storage.objects;
drop policy if exists "Users can insert own closet images" on storage.objects;
drop policy if exists "Users can update own closet images" on storage.objects;
drop policy if exists "Users can delete own closet images" on storage.objects;
drop policy if exists "Demo closet images are publicly readable" on storage.objects;

create policy "Demo closet images are publicly readable" on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'closet'
    and name like 'demo/%'
  );

create policy "Users can read own closet images" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'closet'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can insert own closet images" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'closet'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update own closet images" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'closet'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'closet'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own closet images" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'closet'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

commit;
