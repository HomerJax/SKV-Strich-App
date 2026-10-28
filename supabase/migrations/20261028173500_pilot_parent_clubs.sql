-- Pilot-only club organization, independently managed from the cashbox wizard.
-- Test club: 1. FC Strikr 2026. No other clubs may be attached in this phase.
create table if not exists public.pilot_parent_clubs (
  owner_club_id uuid primary key references public.clubs(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 100),
  teams jsonb not null default '[]'::jsonb check (jsonb_typeof(teams) = 'array'),
  admin_user_ids uuid[] not null,
  created_by uuid not null references auth.users(id),
  updated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pilot_parent_clubs_only_test check (
    owner_club_id = '12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid
  ),
  constraint pilot_parent_clubs_has_admin check (
    cardinality(admin_user_ids) >= 1
  )
);
alter table public.pilot_parent_clubs enable row level security;
revoke all on public.pilot_parent_clubs from anon, authenticated;
grant all on public.pilot_parent_clubs to service_role;
comment on table public.pilot_parent_clubs is 'Pilot-only organizational structure and separately delegated parent-club admins; financial accounts remain separate. Draft teams are not linked to other production clubs.';