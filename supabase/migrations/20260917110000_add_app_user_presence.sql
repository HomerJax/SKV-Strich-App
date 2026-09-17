create table if not exists public.app_user_presence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  club_id uuid null references public.clubs(id) on delete set null,
  path text null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists app_user_presence_last_seen_idx
  on public.app_user_presence (last_seen_at desc);

create index if not exists app_user_presence_club_idx
  on public.app_user_presence (club_id);

alter table public.app_user_presence enable row level security;
