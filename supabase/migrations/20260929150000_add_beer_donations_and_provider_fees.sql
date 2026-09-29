alter table public.club_settings
  add column if not exists beerkasse_sumup_enabled boolean not null default false,
  add column if not exists beerkasse_sumup_merchant_code text;

alter table public.beer_consumptions
  add column if not exists beer_amount_cents integer,
  add column if not exists donation_cents integer not null default 0,
  add column if not exists provider_fee_cents integer not null default 0,
  add column if not exists payment_external_id text;

update public.beer_consumptions
set beer_amount_cents = total_cents
where beer_amount_cents is null;

alter table public.beer_consumptions
  alter column beer_amount_cents set not null;

alter table public.beer_consumptions
  drop constraint if exists beer_consumptions_beer_amount_cents_check;
alter table public.beer_consumptions
  add constraint beer_consumptions_beer_amount_cents_check
  check (beer_amount_cents between 1 and 9900000);

alter table public.beer_consumptions
  drop constraint if exists beer_consumptions_donation_cents_check;
alter table public.beer_consumptions
  add constraint beer_consumptions_donation_cents_check
  check (donation_cents between 0 and 100000);

alter table public.beer_consumptions
  drop constraint if exists beer_consumptions_provider_fee_cents_check;
alter table public.beer_consumptions
  add constraint beer_consumptions_provider_fee_cents_check
  check (provider_fee_cents between 0 and 100000);

alter table public.beer_consumptions
  drop constraint if exists beer_consumptions_payment_method_check;
alter table public.beer_consumptions
  add constraint beer_consumptions_payment_method_check
  check (payment_method in ('paypal','cash','sumup'));

create index if not exists beer_consumptions_club_provider_fee_idx
  on public.beer_consumptions(club_id, payment_method, payment_status, created_at desc)
  where provider_fee_cents > 0;

comment on column public.beer_consumptions.donation_cents is
'Freiwillige Bierspende zusätzlich zum eigentlichen Bierbetrag.';

comment on column public.beer_consumptions.provider_fee_cents is
'Externe Zahlungsgebühr (z. B. SumUp). Wird als Kosten der Mannschaftskasse geführt und nicht auf den Spieler umgelegt.';

comment on column public.beer_consumptions.payment_external_id is
'Externe Zahlungs-/Transaktions-ID des Payment Providers für Abgleich und spätere Automatisierung.';
