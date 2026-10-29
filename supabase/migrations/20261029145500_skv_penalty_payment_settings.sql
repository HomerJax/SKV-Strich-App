-- Dedicated penalty payment settings, independent of the beer cashbox.
-- Every club may configure its own destination when the penalty workflow is enabled.
-- This table is never populated from club_settings.beerkasse_*.
create table if not exists public.penalty_payment_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  paypal_me_url text not null default '',
  paypal_pool_url text not null default '',
  sumup_url text not null default '',
  cash_enabled boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now(),
  constraint penalty_payment_url_lengths check (
    length(paypal_me_url) <= 500 and length(paypal_pool_url) <= 500
    and length(sumup_url) <= 500
  )
);
alter table public.penalty_payment_settings enable row level security;
revoke all on public.penalty_payment_settings from public, anon, authenticated;
grant all on public.penalty_payment_settings to service_role;
-- Nothing is auto-inserted for SKV: an admin must explicitly save the new
-- penalty destinations. The existing beer PayPal pool remains untouched.
