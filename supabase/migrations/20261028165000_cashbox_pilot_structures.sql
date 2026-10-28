-- Pilot-only structure configuration for the 1. FC Strikr 2026 cashbox setup.
-- This table stores setup metadata, NOT money movements, balances or club links.
-- No existing club rows, cash transactions or organization records are modified.
create table if not exists public.cashbox_pilot_structures (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  config jsonb not null check (jsonb_typeof(config) = 'object'),
  updated_by uuid not null references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint cashbox_pilot_strikr_only
    check (club_id = '12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid)
);

comment on table public.cashbox_pilot_structures is
  'Pilot-only cashbox organization/account setup for 1. FC Strikr 2026. No ledger or real bank integration.';

alter table public.cashbox_pilot_structures enable row level security;

-- The server verifies club administration before using the service role.
-- No direct browser Data API access to this configuration table.
revoke all on table public.cashbox_pilot_structures from anon, authenticated;
grant all on table public.cashbox_pilot_structures to service_role;
