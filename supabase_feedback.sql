-- Create outfit_feedback table
create table outfit_feedback (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  top_id uuid references items(id) on delete cascade not null,
  bottom_id uuid references items(id) on delete cascade not null,
  footwear_id uuid references items(id) on delete cascade not null,
  requested_style text,
  weather text,
  liked boolean,
  features jsonb -- Store the feature vector used for prediction
);

-- Enable Row Level Security
alter table outfit_feedback enable row level security;

-- Policies (Open for MVP)
create policy "Allow public read access" on outfit_feedback for select using (true);
create policy "Allow public insert access" on outfit_feedback for insert with check (true);
create policy "Allow public update access" on outfit_feedback for update using (true);
create policy "Allow public delete access" on outfit_feedback for delete using (true);
