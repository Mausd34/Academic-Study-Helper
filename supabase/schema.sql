-- Run this in your Supabase SQL editor

create table public.user_data (
  id uuid references auth.users not null primary key,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on row level security
alter table public.user_data enable row level security;

-- Users can only view and edit their own data
create policy "Users can view their own data"
  on public.user_data for select
  using ( auth.uid() = id );

create policy "Users can insert their own data"
  on public.user_data for insert
  with check ( auth.uid() = id );

create policy "Users can update their own data"
  on public.user_data for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );
