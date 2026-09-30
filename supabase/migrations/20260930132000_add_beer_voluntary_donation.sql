alter table public.beer_consumptions
  add column if not exists donation_cents integer not null default 0
  check (donation_cents >= 0 and donation_cents <= 10000);
