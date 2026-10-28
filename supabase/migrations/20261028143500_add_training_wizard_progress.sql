-- Pilot wizard progress is operational state for one session, not a public member profile.
-- Restrict direct Data API grants; access is via authorized Next.js server endpoints only.
create table if not exists public.training_wizard_progress (
  session_id bigint primary key references public.sessions(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version >= 1),
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  constraint training_wizard_state_object check (jsonb_typeof(state) = 'object'),
  constraint training_wizard_state_size check (octet_length(state::text) <= 8192)
);
create index if not exists training_wizard_progress_club_idx on public.training_wizard_progress(club_id);
alter table public.training_wizard_progress enable row level security;
revoke all on table public.training_wizard_progress from public, anon, authenticated;
grant select, insert, update, delete on table public.training_wizard_progress to service_role;
-- There are intentionally no anon/authenticated policies. Server checks real
-- club membership, training-leader rights and pilot rollout before using service_role.
