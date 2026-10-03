-- =====================================================================
--  Academic Study Helper — Postgres schema (part 1: core + structure)
--  Target: Supabase (Postgres 15+)
--
--  Run order:
--    1. 001_schema.sql (+ 001b) — tables, indexes, triggers
--    2. 002_rls.sql             — Row Level Security + policies
--    3. 003_seed_reference.sql  — optional reference data
--
--  Design notes
--  ------------
--  * Every table belongs to exactly one account: user_id uuid references
--    auth.users(id) ON DELETE CASCADE.
--  * RLS is enabled for every table in 002_rls.sql, and every policy is
--    "own rows only" (auth.uid() = user_id). With RLS on, an anon request
--    can read nothing and write nothing without a matching JWT.
--  * Client-generated ids are the primary key so existing localStorage data
--    syncs without remapping (id text PRIMARY KEY).
--  * user_data holds the whole-state JSON blob that sync.js already uses,
--    so the current client works unchanged. The collection tables are the
--    normalised form for when you outgrow the blob.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
--  Whole-state snapshot (current sync.js contract)
-- ---------------------------------------------------------------------
create table if not exists public.user_data (
  id          uuid primary key references auth.users (id) on delete cascade,
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

comment on table public.user_data is
  'Full application state as one JSON document. Written by js/core/sync.js.';

-- ---------------------------------------------------------------------
-- Reference / settings
-- ---------------------------------------------------------------------
create table if not exists public.semesters (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  start_date date,
  end_date   date,
  active     boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists semesters_user_idx on public.semesters (user_id);

create table if not exists public.profile (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  state      jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.profile is
  'Profile + settings, kept as jsonb so the UI can evolve without migrations.';

-- ---------------------------------------------------------------------
-- Academic structure
-- ---------------------------------------------------------------------
create table if not exists public.courses (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  semester_id text references public.semesters (id) on delete set null,
  code        text not null,
  title       text not null default '',
  section     text not null default '',
  room        text not null default '',
  color       text not null default '#635bff',
  credits     numeric(4, 2),
  teacher     text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists courses_user_idx on public.courses (user_id);
create index if not exists courses_semester_idx on public.courses (semester_id);

-- Weekly timetable. `day` is text ('Monday'…'Sunday') to match the client
-- exactly — identical vocabulary avoids timezone and ordering bugs.
create table if not exists public.routine (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  semester_id text references public.semesters (id) on delete cascade,
  course_id   text references public.courses (id) on delete cascade,
  day         text not null check (day in
                ('Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  start       time not null,
  "end"       time not null,
  room        text not null default '',
  type        text not null default 'lecture',
  created_at  timestamptz not null default now()
);

create index if not exists routine_user_idx on public.routine (user_id);
create index if not exists routine_course_idx on public.routine (course_id);

create table if not exists public.attendance (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  text references public.courses (id) on delete cascade,
  date       date not null,
  status     text not null default 'present'
             check (status in ('present', 'absent', 'late', 'excused')),
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists attendance_user_date_idx on public.attendance (user_id, date desc);
create index if not exists attendance_course_idx on public.attendance (course_id);
create table if not exists public.tasks (
  id             text primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  course_id      text references public.courses (id) on delete set null,
  title          text not null,
  description    text not null default '',
  due_date       date,
  due_time       time,
  priority       text not null default 'Medium'
                 check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  status         text not null default 'pending'
                 check (status in ('pending', 'in-progress', 'completed')),
  estimate_hours numeric(6, 2),
  tags           text[] not null default '{}',
  created_at     timestamptz not null default now(),
  completed_at   timestamptz
);

create index if not exists tasks_user_due_idx on public.tasks (user_id, due_date desc);
create index if not exists tasks_tags_idx on public.tasks using gin (tags);

create table if not exists public.exams (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  text references public.courses (id) on delete set null,
  title      text not null,
  type       text not null default 'Quiz',
  date       date not null,
  time       time,
  room       text not null default '',
  syllabus   text not null default '',
  prep       numeric(5, 2) not null default 0 check (prep between 0 and 100),
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists exams_user_date_idx on public.exams (user_id, date);

create table if not exists public.notes (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  text references public.courses (id) on delete set null,
  title      text not null,
  topic      text not null default '',
  content    text not null default '',
  tags       text[] not null default '{}',
  favorite   boolean not null default false,
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notes_user_updated_idx on public.notes (user_id, updated_at desc);
create index if not exists notes_tags_idx on public.notes using gin (tags);

create table if not exists public.expenses (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount >= 0),
  category    text not null default 'Other',
  date        date not null,
  description text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists expenses_user_date_idx on public.expenses (user_id, date desc);

create table if not exists public.study_sessions (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  text references public.courses (id) on delete set null,
  topic      text not null default '',
  date       date not null,
  start      time,
  "end"      time,
  minutes    integer not null default 0 check (minutes >= 0),
  rating     smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists study_sessions_user_date_idx
  on public.study_sessions (user_id, date desc);

create table if not exists public.skills (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  progress   numeric(5, 2) not null default 0 check (progress between 0 and 100),
  "group"    text not null default 'General',
  updated_at timestamptz not null default now()
);

create index if not exists skills_user_idx on public.skills (user_id);

create table if not exists public.coding_problems (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  problem    text not null,
  platform   text not null default '',
  difficulty text not null default 'Easy',
  topic      text not null default '',
  status     text not null default 'attempted'
             check (status in ('attempted', 'solved', 'skipped')),
  link       text not null default '',
  date       date not null,
  created_at timestamptz not null default now()
);

create index if not exists coding_user_date_idx
  on public.coding_problems (user_id, date desc);
create table if not exists public.events (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  course_id  text references public.courses (id) on delete set null,
  title      text not null,
  kind       text not null default 'event',
  date       date not null,
  time       time,
  notes      text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists events_user_date_idx on public.events (user_id, date);

create table if not exists public.career_goals (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  progress   numeric(5, 2) not null default 0 check (progress between 0 and 100),
  target     numeric(6, 2) not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists career_goals_user_idx on public.career_goals (user_id);

create table if not exists public.portfolio_projects (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  name       text not null,
  progress   numeric(5, 2) not null default 0 check (progress between 0 and 100),
  status     text not null default 'Planned',
  created_at timestamptz not null default now()
);

create index if not exists portfolio_projects_user_idx
  on public.portfolio_projects (user_id);

create table if not exists public.chat_messages (
  id         text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user', 'bot')),
  content    text not null default '',
  language   text not null default 'en',
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_user_idx
  on public.chat_messages (user_id, created_at);

-- ---------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notes_touch_updated_at on public.notes;
create trigger notes_touch_updated_at
  before update on public.notes
  for each row execute function public.touch_updated_at();

drop trigger if exists skills_touch_updated_at on public.skills;
create trigger skills_touch_updated_at
  before update on public.skills
  for each row execute function public.touch_updated_at();

drop trigger if exists user_data_touch_updated_at on public.user_data;
create trigger user_data_touch_updated_at
  before update on public.user_data
  for each row execute function public.touch_updated_at();

drop trigger if exists profile_touch_updated_at on public.profile;
create trigger profile_touch_updated_at
  before update on public.profile
  for each row execute function public.touch_updated_at();