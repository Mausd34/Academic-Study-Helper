-- =====================================================================
--  Row Level Security
--
--  THIS FILE IS THE ONE THAT MATTERS.
--
--  A Supabase "publishable" key is designed to ship to browsers, so it is
--  NOT a secret. What keeps your data private is RLS: with RLS enabled and
--  only "own rows" policies below, the publishable key cannot read or write
--  anyone else's rows, even though it is public.
--
--  If you enable RLS but forget the policies, the tables become read-only
--  for everyone (including you). If you skip this file entirely, the
--  publishable key has full access. Always run this.
--
--  Verify after running:
--    select relname, relrowsecurity
--    from pg_class
--    where relnamespace = 'public'::regnamespace
--      and relkind = 'r'
--    order by relname;
--  Every row must show relrowsecurity = true.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'user_data', 'profile', 'semesters', 'courses', 'routine',
    'attendance', 'tasks', 'exams', 'notes', 'expenses',
    'study_sessions', 'skills', 'coding_problems', 'events', 'career_goals', 'portfolio_projects', 'chat_messages'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I enable row level security', t);
    -- Belt and braces: even the table owner is subject to the policies.
    execute format('alter table public.%I force row level security', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- user_data â€” keyed by auth.users id, so the policy uses `id`, not `user_id`
-- ---------------------------------------------------------------------
drop policy if exists user_data_select_own on public.user_data;
create policy user_data_select_own on public.user_data
  for select using (auth.uid() = id);

drop policy if exists user_data_insert_own on public.user_data;
create policy user_data_insert_own on public.user_data
  for insert with check (auth.uid() = id);

drop policy if exists user_data_update_own on public.user_data;
create policy user_data_update_own on public.user_data
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists user_data_delete_own on public.user_data;
create policy user_data_delete_own on public.user_data
  for delete using (auth.uid() = id);

-- ---------------------------------------------------------------------
-- profile â€” same shape as user_data
-- ---------------------------------------------------------------------
drop policy if exists profile_select_own on public.profile;
create policy profile_select_own on public.profile
  for select using (auth.uid() = user_id);

drop policy if exists profile_insert_own on public.profile;
create policy profile_insert_own on public.profile
  for insert with check (auth.uid() = user_id);

drop policy if exists profile_update_own on public.profile;
create policy profile_update_own on public.profile
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists profile_delete_own on public.profile;
create policy profile_delete_own on public.profile
  for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Every remaining table shares the identical "own rows only" policy.
-- A loop keeps this short and guarantees no table is missed by hand.
-- ---------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'semesters', 'courses', 'routine', 'attendance', 'tasks', 'exams',
    'notes', 'expenses', 'study_sessions', 'skills', 'coding_problems',
    'events', 'career_goals', 'portfolio_projects', 'chat_messages'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format(
      'create policy %I on public.%I for select using (auth.uid() = user_id)', t || '_select_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format(
      'create policy %I on public.%I for insert with check (auth.uid() = user_id)', t || '_insert_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format(
      'create policy %I on public.%I for update using (auth.uid() = user_id) with check (auth.uid() = user_id)',
      t || '_update_own', t);

    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);
    execute format(
      'create policy %I on public.%I for delete using (auth.uid() = user_id)', t || '_delete_own', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- Grants. RLS does the real work; these just let the anon/authenticated
-- roles reach the tables at all. No service_role grant is added here.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  public.user_data, public.profile
  to authenticated;

grant select, insert, update, delete on
  public.semesters, public.courses, public.routine, public.attendance,
  public.tasks, public.exams, public.notes, public.expenses,
  public.study_sessions, public.skills, public.coding_problems,
  public.events, public.career_goals, public.portfolio_projects,
  public.chat_messages
  to authenticated;

-- anon gets NO table privileges. RLS would block it anyway, but denying at
-- the privilege layer means an accidental "disable RLS" does not instantly
-- open the database.
revoke all on all tables in schema public from anon;