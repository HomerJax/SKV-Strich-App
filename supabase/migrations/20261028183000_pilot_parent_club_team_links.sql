-- Pilot organization invites: never touch another club's finances or settings.
create table if not exists public.pilot_parent_club_team_links (
  id uuid primary key default gen_random_uuid(),
  owner_club_id uuid not null references public.pilot_parent_clubs(owner_club_id) on delete cascade,
  target_club_id uuid not null references public.clubs(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','linked','declined','revoked')),
  requested_by uuid not null references auth.users(id),
  decided_by uuid references auth.users(id),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  unique(owner_club_id,target_club_id),
  constraint pilot_parent_club_team_links_test_only check (
    owner_club_id = '12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid
    and target_club_id <> owner_club_id
  )
);
alter table public.pilot_parent_club_team_links enable row level security;
revoke all on public.pilot_parent_club_team_links from public, anon, authenticated;
grant all on public.pilot_parent_club_team_links to service_role;
comment on table public.pilot_parent_club_team_links is 'Pilot-only invitations and explicit team-admin approvals. A linked team remains a separate independent club. No finance data is shared by this table.';
create unique index if not exists pilot_parent_club_target_one_link
  on public.pilot_parent_club_team_links(target_club_id) where status='linked';