-- Create items table
create table items (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  category text not null,
  color text,
  style text, -- Deprecated, kept for backwards compatibility
  styles text[], -- Multi-select styles
  tags text[],
  image_url text not null,
  description text
);

-- Enable Row Level Security
alter table items enable row level security;

-- Policies (Open for MVP, restrict in production)
create policy "Allow public read access" on items for select using (true);
create policy "Allow public insert access" on items for insert with check (true);
create policy "Allow public update access" on items for update using (true);
create policy "Allow public delete access" on items for delete using (true);

-- Storage Bucket Setup (Run this if you haven't created the bucket in UI)
-- Note: You might need to create the bucket 'closet' manually in the Supabase Dashboard if this fails.
insert into storage.buckets (id, name, public) values ('closet', 'closet', true);

-- Storage Policies
create policy "Public Access" on storage.objects for select using ( bucket_id = 'closet' );
create policy "Public Insert" on storage.objects for insert with check ( bucket_id = 'closet' );
