-- Add demo/user scoping for AI Closet data.
-- Existing rows are preserved as recruiter-facing demo data.

alter table items add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table items add column if not exists is_demo boolean not null default false;
update items set is_demo = true where user_id is null and is_demo = false;
create index if not exists idx_items_user_id on items(user_id);
create index if not exists idx_items_is_demo on items(is_demo);

alter table outfit_feedback add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table outfit_feedback add column if not exists is_demo boolean not null default false;
update outfit_feedback set is_demo = true where user_id is null and is_demo = false;
create index if not exists idx_outfit_feedback_user_id on outfit_feedback(user_id);
create index if not exists idx_outfit_feedback_is_demo on outfit_feedback(is_demo);

alter table outfit_history add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table outfit_history add column if not exists is_demo boolean not null default false;
update outfit_history set is_demo = true where user_id is null and is_demo = false;
create index if not exists idx_outfit_history_user_demo on outfit_history(user_id, is_demo);
create index if not exists idx_outfit_history_is_demo on outfit_history(is_demo);

alter table ai_prediction_logs add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table ai_prediction_logs add column if not exists is_demo boolean not null default false;
update ai_prediction_logs set is_demo = true where user_id is null and is_demo = false;
create index if not exists idx_ai_prediction_logs_user_id on ai_prediction_logs(user_id);
create index if not exists idx_ai_prediction_logs_is_demo on ai_prediction_logs(is_demo);

alter table items enable row level security;
alter table outfit_feedback enable row level security;
alter table outfit_history enable row level security;
alter table ai_prediction_logs enable row level security;

drop policy if exists "Allow public read access" on items;
drop policy if exists "Allow public insert access" on items;
drop policy if exists "Allow public update access" on items;
drop policy if exists "Allow public delete access" on items;
drop policy if exists "Demo items are publicly readable" on items;
drop policy if exists "Users can read own items" on items;
drop policy if exists "Users can insert own items" on items;
drop policy if exists "Users can update own items" on items;
drop policy if exists "Users can delete own items" on items;
create policy "Demo items are publicly readable" on items for select using (is_demo = true);
create policy "Users can read own items" on items for select using (auth.uid() = user_id);
create policy "Users can insert own items" on items for insert with check (auth.uid() = user_id and is_demo = false);
create policy "Users can update own items" on items for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_demo = false);
create policy "Users can delete own items" on items for delete using (auth.uid() = user_id and is_demo = false);

drop policy if exists "Allow public read access" on outfit_feedback;
drop policy if exists "Allow public insert access" on outfit_feedback;
drop policy if exists "Allow public update access" on outfit_feedback;
drop policy if exists "Allow public delete access" on outfit_feedback;
drop policy if exists "Demo feedback is publicly readable" on outfit_feedback;
drop policy if exists "Users can read own feedback" on outfit_feedback;
drop policy if exists "Users can insert own feedback" on outfit_feedback;
drop policy if exists "Users can update own feedback" on outfit_feedback;
drop policy if exists "Users can delete own feedback" on outfit_feedback;
create policy "Demo feedback is publicly readable" on outfit_feedback for select using (is_demo = true);
create policy "Users can read own feedback" on outfit_feedback for select using (auth.uid() = user_id);
create policy "Users can insert own feedback" on outfit_feedback for insert with check (auth.uid() = user_id and is_demo = false);
create policy "Users can update own feedback" on outfit_feedback for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_demo = false);
create policy "Users can delete own feedback" on outfit_feedback for delete using (auth.uid() = user_id and is_demo = false);

drop policy if exists "Allow public read access" on outfit_history;
drop policy if exists "Allow public insert access" on outfit_history;
drop policy if exists "Allow public update access" on outfit_history;
drop policy if exists "Allow public delete access" on outfit_history;
drop policy if exists "Demo history is publicly readable" on outfit_history;
drop policy if exists "Users can read own history" on outfit_history;
drop policy if exists "Users can insert own history" on outfit_history;
drop policy if exists "Users can update own history" on outfit_history;
drop policy if exists "Users can delete own history" on outfit_history;
create policy "Demo history is publicly readable" on outfit_history for select using (is_demo = true);
create policy "Users can read own history" on outfit_history for select using (auth.uid() = user_id);
create policy "Users can insert own history" on outfit_history for insert with check (auth.uid() = user_id and is_demo = false);
create policy "Users can update own history" on outfit_history for update using (auth.uid() = user_id) with check (auth.uid() = user_id and is_demo = false);
create policy "Users can delete own history" on outfit_history for delete using (auth.uid() = user_id and is_demo = false);

drop policy if exists "Allow public insert access" on ai_prediction_logs;
drop policy if exists "Allow public read access" on ai_prediction_logs;
drop policy if exists "Allow public delete access" on ai_prediction_logs;
drop policy if exists "Demo prediction logs are publicly readable" on ai_prediction_logs;
drop policy if exists "Users can read own prediction logs" on ai_prediction_logs;
drop policy if exists "Users can insert own prediction logs" on ai_prediction_logs;
drop policy if exists "Users can delete own prediction logs" on ai_prediction_logs;
create policy "Demo prediction logs are publicly readable" on ai_prediction_logs for select using (is_demo = true);
create policy "Users can read own prediction logs" on ai_prediction_logs for select using (auth.uid() = user_id);
create policy "Users can insert own prediction logs" on ai_prediction_logs for insert with check (auth.uid() = user_id and is_demo = false);
create policy "Users can delete own prediction logs" on ai_prediction_logs for delete using (auth.uid() = user_id and is_demo = false);
