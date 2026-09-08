alter table public.club_settings
  add column if not exists badges_started_at date null,
  add column if not exists badges_activation_season_id bigint null references public.seasons(id) on delete set null;

alter table public.players
  add column if not exists selected_badge_key text null;

create table if not exists public.player_achievements (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  badge_key text not null,
  season_id bigint null references public.seasons(id) on delete set null,
  season_ref text not null default 'career',
  earned_at timestamptz not null default now(),
  acknowledged_at timestamptz null,
  grant_reason jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint player_achievements_season_ref_check
    check (season_ref = 'career' or season_ref like 'season:%'),
  constraint player_achievements_unique_award
    unique (club_id, player_id, badge_key, season_ref)
);

create index if not exists idx_player_achievements_player
  on public.player_achievements (club_id, player_id, earned_at desc);

create index if not exists idx_player_achievements_unseen
  on public.player_achievements (club_id, player_id, acknowledged_at)
  where acknowledged_at is null;

alter table public.player_achievements enable row level security;

drop policy if exists "player_achievements_select_club_members" on public.player_achievements;
create policy "player_achievements_select_club_members"
  on public.player_achievements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.club_memberships cm
      where cm.club_id = player_achievements.club_id
        and cm.user_id = auth.uid()
    )
  );
