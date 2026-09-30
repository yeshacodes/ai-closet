-- Prepare image metadata columns before deploying code that writes them.
-- Apply this before deploying the compatible private-image code.

begin;

alter table public.items add column if not exists image_storage_path text;
alter table public.items add column if not exists image_bucket text not null default 'closet';

update public.items
set image_bucket = 'closet'
where image_bucket is null;

commit;
