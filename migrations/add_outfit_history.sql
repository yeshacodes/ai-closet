-- Add worn outfit history for recommendation rotation and wardrobe analytics.

create table if not exists outfit_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid null,
  outfit_id text null,
  top_id uuid references items(id) on delete set null,
  bottom_id uuid references items(id) on delete set null,
  dress_id uuid references items(id) on delete set null,
  footwear_id uuid references items(id) on delete set null,
  outerwear_id uuid references items(id) on delete set null,
  weather text not null,
  style text not null,
  worn_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table outfit_history enable row level security;

create policy "Allow public read access" on outfit_history for select using (true);
create policy "Allow public insert access" on outfit_history for insert with check (true);
create policy "Allow public update access" on outfit_history for update using (true);
create policy "Allow public delete access" on outfit_history for delete using (true);

create index if not exists idx_outfit_history_worn_at on outfit_history (worn_at desc);
create index if not exists idx_outfit_history_user_id on outfit_history (user_id);
create index if not exists idx_outfit_history_outfit_id on outfit_history (outfit_id);
create index if not exists idx_outfit_history_top_id on outfit_history (top_id);
create index if not exists idx_outfit_history_bottom_id on outfit_history (bottom_id);
create index if not exists idx_outfit_history_dress_id on outfit_history (dress_id);
create index if not exists idx_outfit_history_footwear_id on outfit_history (footwear_id);
create index if not exists idx_outfit_history_outerwear_id on outfit_history (outerwear_id);
create index if not exists idx_outfit_history_weather_style on outfit_history (weather, style);

comment on table outfit_history is 'Outfits the user explicitly marked as worn.';
comment on column outfit_history.outfit_id is 'Stable item combination key for duplicate checks and full-outfit rotation.';
comment on column outfit_history.dress_id is 'Optional dress item for dress-based outfits.';
