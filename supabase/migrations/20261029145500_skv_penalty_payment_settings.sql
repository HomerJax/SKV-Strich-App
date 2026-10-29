-- Enable independent payment-destination settings for SKV penalties only.
-- Existing pilot cashbox behavior and all existing payment configuration stay intact.
alter table public.cashbox_pilot_structures
  drop constraint if exists cashbox_pilot_strikr_only;
alter table public.cashbox_pilot_structures
  add constraint cashbox_pilot_strikr_only
  check (club_id in (
    '12f0d9fe-9a79-4ea9-b8e9-c9d2cbba7c60'::uuid,
    '108590d9-0877-4787-90a5-4679615b3b76'::uuid
  ));
