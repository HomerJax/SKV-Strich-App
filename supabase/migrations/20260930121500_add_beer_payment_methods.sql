alter table public.club_settings
  add column if not exists beerkasse_paypal_me_url text,
  add column if not exists beerkasse_sumup_url text,
  add column if not exists beerkasse_cash_enabled boolean not null default true;

comment on column public.club_settings.beerkasse_paypal_me_url is 'Optional PayPal.Me payment link for beer checkout';
comment on column public.club_settings.beerkasse_sumup_url is 'Optional SumUp payment link for beer checkout';
comment on column public.club_settings.beerkasse_cash_enabled is 'Whether cash is offered as a beer payment method';
