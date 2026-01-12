-- Create table for logging AI predictions vs User corrections
create table if not exists ai_prediction_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  item_id uuid references items(id) on delete cascade,
  
  -- Predicted values
  predicted_category text,
  predicted_style text,
  predicted_color text,
  
  -- Final values (what the user actually saved)
  final_category text,
  final_style text,
  final_color text,
  
  -- Context
  input_hints jsonb, -- Stores what inputs were available (filename, name field, etc)
  confidence_score float
);

-- Enable RLS
alter table ai_prediction_logs enable row level security;

-- Policies
create policy "Allow public insert access" on ai_prediction_logs for insert with check (true);
create policy "Allow public read access" on ai_prediction_logs for select using (true);
create policy "Allow public delete access" on ai_prediction_logs for delete using (true);
