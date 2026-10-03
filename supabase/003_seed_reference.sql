-- =====================================================================
--  Optional reference data
--
--  The app already seeds courses, routine, skills and sample rows in
--  js/core/storage.js, so a fresh account is never empty. Use this file
--  only if you want the schema pre-populated (for example for a SQL-only
--  test harness).
--
--  Every insert is scoped to one user. Set the target account first:
--
--    -- replace with your own auth user id
--    \set target_user '00000000-0000-0000-0000-000000000000'
--
--  To find it: Supabase -> Authentication -> Users -> copy the UUID.
-- =====================================================================

do $$
declare
  target uuid := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
begin
  if target is null then
    raise exception
      'No user id. Set request.jwt.claim.sub before running this file, or edit target below.';
  end if;

  -- --- semesters ---------------------------------------------------
  insert into public.semesters (id, user_id, name, start_date, end_date, active)
  values
    ('sem-fall-2026',  target, 'Fall 2026',  '2026-09-01', '2027-01-31', true),
    ('sem-spring-2027', target, 'Spring 2027','2027-02-01', '2027-06-30', false)
  on conflict (id) do nothing;

  -- --- courses (Fall 2026, IUBAT CSE) --------------------------------
  insert into public.courses (id, user_id, semester_id, code, title, section, color, credits)
  values
    ('crs-cse-4357', target, 'sem-fall-2026', 'CSE 4357', 'Data Science', 'F', '#635bff', 3),
    ('crs-csc-471',  target, 'sem-fall-2026', 'CSC 471',  'Computer Graphics', 'B', '#0ea5e9', 3),
    ('crs-eng-250',  target, 'sem-fall-2026', 'ENG 250',  'Public Speaking', 'A', '#f59e0b', 3),
    ('crs-csc-465',  target, 'sem-fall-2026', 'CSC 465',  'Data Communication & Computer Network', 'B', '#10b981', 3),
    ('crs-cse-3308', target, 'sem-fall-2026', 'CSE 3308', 'Course title editable', 'C', '#ec4899', 3),
    ('crs-een-184',  target, 'sem-fall-2026', 'EEN 184',  'Circuit Lab I', 'B', '#8b5cf6', 1.5)
  on conflict (id) do nothing;

  -- --- weekly routine -----------------------------------------------
  insert into public.routine (id, user_id, semester_id, course_id, day, start, "end", room)
  values
    ('sch-01', target, 'sem-fall-2026', 'crs-cse-4357', 'Saturday', '09:35', '10:35', '1009'),
    ('sch-02', target, 'sem-fall-2026', 'crs-cse-4357', 'Sunday',   '09:35', '10:35', '1005'),
    ('sch-03', target, 'sem-fall-2026', 'crs-cse-4357', 'Monday',   '09:35', '10:35', '1004'),
    ('sch-04', target, 'sem-fall-2026', 'crs-csc-471',  'Saturday', '11:45', '12:45', '1123'),
    ('sch-05', target, 'sem-fall-2026', 'crs-csc-471',  'Tuesday',  '11:45', '12:45', '1123'),
    ('sch-06', target, 'sem-fall-2026', 'crs-csc-471',  'Wednesday','11:45', '12:45', '501'),
    ('sch-07', target, 'sem-fall-2026', 'crs-eng-250',  'Sunday',   '08:30', '09:30', '906'),
    ('sch-08', target, 'sem-fall-2026', 'crs-eng-250',  'Monday',   '08:30', '09:30', '906'),
    ('sch-09', target, 'sem-fall-2026', 'crs-eng-250',  'Wednesday','08:30', '09:30', '906'),
    ('sch-10', target, 'sem-fall-2026', 'crs-csc-465',  'Monday',   '10:40', '11:40', '1004'),
    ('sch-11', target, 'sem-fall-2026', 'crs-csc-465',  'Tuesday',  '10:40', '11:40', '912'),
    ('sch-12', target, 'sem-fall-2026', 'crs-csc-465',  'Wednesday','10:40', '11:40', '909'),
    ('sch-13', target, 'sem-fall-2026', 'crs-cse-3308', 'Monday',   '13:10', '14:10', 'EEELab6'),
    ('sch-14', target, 'sem-fall-2026', 'crs-cse-3308', 'Monday',   '14:15', '15:15', 'EEELab6'),
    ('sch-15', target, 'sem-fall-2026', 'crs-een-184',  'Tuesday',  '08:30', '09:30', 'EEELab1'),
    ('sch-16', target, 'sem-fall-2026', 'crs-een-184',  'Tuesday',  '09:35', '10:35', 'EEELab1')
  on conflict (id) do nothing;

  -- --- skills ---------------------------------------------------------
  insert into public.skills (id, user_id, name, progress, "group")
  values
    ('skl-python',    target, 'Python', 55, 'Core'),
    ('skl-sql',       target, 'SQL', 35, 'Data'),
    ('skl-ml',        target, 'Machine Learning', 30, 'AI'),
    ('skl-data',      target, 'Data Analysis', 25, 'Data'),
    ('skl-git',       target, 'Git/GitHub', 65, 'Tools'),
    ('skl-fastapi',   target, 'FastAPI', 15, 'Backend'),
    ('skl-flutter',   target, 'Flutter', 10, 'Mobile'),
    ('skl-dsa',       target, 'DSA', 25, 'Core'),
    ('skl-django',    target, 'Django', 5, 'Backend'),
    ('skl-js',        target, 'JavaScript', 30, 'Web'),
    ('skl-cpp',       target, 'C++', 45, 'Core'),
    ('skl-cs',        target, 'C#', 10, 'Core'),
    ('skl-cn',        target, 'Computer Networks', 40, 'Academics'),
    ('skl-linux',     target, 'Linux', 35, 'Tools')
  on conflict (id) do nothing;

  raise notice 'Seeded Fall 2026 reference data for %', target;
end;
$$;