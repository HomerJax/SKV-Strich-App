alter table public.club_billing
  add column if not exists billing_provider text null,
  add column if not exists stripe_customer_id text null,
  add column if not exists stripe_subscription_id text null,
  add column if not exists stripe_price_id text null,
  add column if not exists cancel_at_period_end boolean not null default false;

create unique index if not exists club_billing_stripe_subscription_id_key
  on public.club_billing (stripe_subscription_id)
  where stripe_subscription_id is not null;

create index if not exists club_billing_stripe_customer_id_idx
  on public.club_billing (stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.club_billing.billing_provider is
'Billing provider for paid subscriptions, currently stripe.';

comment on column public.club_billing.stripe_customer_id is
'Stripe customer id used for checkout and customer portal.';

comment on column public.club_billing.stripe_subscription_id is
'Stripe subscription id used to synchronize Pro access.';

comment on column public.club_billing.stripe_price_id is
'Stripe price id currently attached to the club subscription.';

comment on column public.club_billing.cancel_at_period_end is
'True when the paid subscription is scheduled to end at the current billing period end.';
