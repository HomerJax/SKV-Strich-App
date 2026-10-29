-- Pilot wheel presets: each saved catalog rule or individual penalty may override
-- the club-wide wheel. Existing wheel history and global settings are untouched.
create table if not exists public.pilot_wheel_scoped_configs (
  club_id uuid not null references public.clubs(id) on delete cascade
    check (club_id='12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid),
  scope_key text not null check (scope_key ~ '^(penalty:[0-9]{1,18}|rule:[a-zA-Z0-9_-]{1,100})$'),
  segments jsonb not null check(jsonb_typeof(segments)='array' and jsonb_array_length(segments) between 4 and 8),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  primary key(club_id,scope_key)
);
alter table public.pilot_wheel_scoped_configs enable row level security;
revoke all on public.pilot_wheel_scoped_configs from public,anon,authenticated;
grant all on public.pilot_wheel_scoped_configs to service_role;

create table if not exists public.pilot_penalty_rule_origins (
  penalty_id bigint primary key references public.penalties(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade
    check (club_id='12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid),
  rule_key text not null check(rule_key ~ '^[a-zA-Z0-9_-]{1,100}$')
);
alter table public.pilot_penalty_rule_origins enable row level security;
revoke all on public.pilot_penalty_rule_origins from public,anon,authenticated;
grant all on public.pilot_penalty_rule_origins to service_role;

comment on table public.pilot_wheel_scoped_configs is
'Admin editable pilot wheel overrides, by specific penalty or penalty catalog rule. Effects captured in spin snapshot.';
