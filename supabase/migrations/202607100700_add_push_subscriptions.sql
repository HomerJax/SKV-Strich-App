create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid references public.clubs(id) on delete cascade,
  token text not null,
  platform text not null default 'unknown',
  app_version text,
  enabled boolean not null default true,
  last_seen_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint push_subscriptions_platform_check
    check (platform in ('ios', 'android', 'web', 'unknown'))
);

create unique index if not exists push_subscriptions_token_key
  on public.push_subscriptions (token);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

create index if not exists push_subscriptions_club_id_idx
  on public.push_subscriptions (club_id);

create index if not exists push_subscriptions_enabled_idx
  on public.push_subscriptions (enabled)
  where enabled = true;

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can read own push subscriptions"
  on public.push_subscriptions;

create policy "Users can read own push subscriptions"
  on public.push_subscriptions
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can update own push subscriptions"
  on public.push_subscriptions;

create policy "Users can update own push subscriptions"
  on public.push_subscriptions
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
