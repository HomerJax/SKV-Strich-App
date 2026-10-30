-- One-time free introductory PRO access for newly created clubs.
-- Does not activate or modify any existing club (including former Supercup trials).
begin;

set local lock_timeout = '5s';

alter table public.club_billing
  drop constraint if exists club_billing_plan_key_check;

alter table public.club_billing
  add constraint club_billing_plan_key_check
  check (
    plan_key in (
      'free',
      'supercup_trial',
      'pro_trial',
      'pro_monthly',
      'pro_6_months',
      'pro_yearly',
      'founder'
    )
  );

commit;
