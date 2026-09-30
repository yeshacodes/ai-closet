-- Enforce that saved feedback/history rows only reference items owned by the same user.
-- Prepared for Supabase review/application; not applied by this local change.

begin;

create or replace function public.user_owns_personal_item(item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select $1 is null or exists (
    select 1
    from public.items
    where public.items.id = $1
      and public.items.user_id = auth.uid()
      and public.items.is_demo = false
  );
$$;

revoke all on function public.user_owns_personal_item(uuid) from public;
revoke all on function public.user_owns_personal_item(uuid) from anon;
grant execute on function public.user_owns_personal_item(uuid) to authenticated;

drop policy if exists "Allow insert logs" on public.ai_prediction_logs;
drop policy if exists "Allow public insert access" on public.ai_prediction_logs;

drop policy if exists "Users can insert own feedback" on public.outfit_feedback;
drop policy if exists "Users can update own feedback" on public.outfit_feedback;
create policy "Users can insert own feedback" on public.outfit_feedback
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and is_demo = false
    and public.user_owns_personal_item(top_id)
    and public.user_owns_personal_item(bottom_id)
    and public.user_owns_personal_item(dress_id)
    and public.user_owns_personal_item(footwear_id)
    and public.user_owns_personal_item(outerwear_id)
  );
create policy "Users can update own feedback" on public.outfit_feedback
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_demo = false
    and public.user_owns_personal_item(top_id)
    and public.user_owns_personal_item(bottom_id)
    and public.user_owns_personal_item(dress_id)
    and public.user_owns_personal_item(footwear_id)
    and public.user_owns_personal_item(outerwear_id)
  );

drop policy if exists "Users can insert own history" on public.outfit_history;
drop policy if exists "Users can update own history" on public.outfit_history;
create policy "Users can insert own history" on public.outfit_history
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and is_demo = false
    and public.user_owns_personal_item(top_id)
    and public.user_owns_personal_item(bottom_id)
    and public.user_owns_personal_item(dress_id)
    and public.user_owns_personal_item(footwear_id)
    and public.user_owns_personal_item(outerwear_id)
  );
create policy "Users can update own history" on public.outfit_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and is_demo = false
    and public.user_owns_personal_item(top_id)
    and public.user_owns_personal_item(bottom_id)
    and public.user_owns_personal_item(dress_id)
    and public.user_owns_personal_item(footwear_id)
    and public.user_owns_personal_item(outerwear_id)
  );

drop policy if exists "Users can insert own prediction logs" on public.ai_prediction_logs;
create policy "Users can insert own prediction logs" on public.ai_prediction_logs
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and is_demo = false
    and public.user_owns_personal_item(item_id)
  );

commit;
