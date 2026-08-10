create table if not exists public.push_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  training_reminders boolean not null default true,
  rsvp_updates boolean not null default true,
  results boolean not null default true,
  badges boolean not null default true,
  announcements boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.push_preferences enable row level security;

drop policy if exists "Users can read own push preferences"
  on public.push_preferences;

create policy "Users can read own push preferences"
  on public.push_preferences
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own push preferences"
  on public.push_preferences;

create policy "Users can insert own push preferences"
  on public.push_preferences
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own push preferences"
  on public.push_preferences;

create policy "Users can update own push preferences"
  on public.push_preferences
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
