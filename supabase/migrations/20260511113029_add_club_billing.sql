create table if not exists public.club_billing (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  plan_key text not null default 'free',
  status text not null default 'active',
  trial_ends_at timestamptz null,
  pro_ends_at timestamptz null,
  billing_note text null,
  updated_at timestamptz not null default now()
);

alter table public.club_billing
drop constraint if exists club_billing_plan_key_check;

alter table public.club_billing
add constraint club_billing_plan_key_check
check (
  plan_key in (
    'free',
    'supercup_trial',
    'pro_monthly',
    'pro_6_months',
    'pro_yearly',
    'founder'
  )
);

alter table public.club_billing
drop constraint if exists club_billing_status_check;

alter table public.club_billing
add constraint club_billing_status_check
check (
  status in (
    'active',
    'expired',
    'cancelled',
    'manual'
  )
);

alter table public.club_billing enable row level security;

drop policy if exists "club_billing_select_members" on public.club_billing;

create policy "club_billing_select_members"
on public.club_billing
for select
using (
  exists (
    select 1
    from public.club_memberships cm
    where cm.club_id = club_billing.club_id
      and cm.user_id = auth.uid()
  )
);

comment on table public.club_billing is
'Manual billing and plan state for strikr clubs. Used for Free/Pro gating and early Supercup/Founder plans.';
