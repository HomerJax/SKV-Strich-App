alter table public.beer_consumptions
  drop constraint if exists beer_consumptions_payment_method_check;

alter table public.beer_consumptions
  add constraint beer_consumptions_payment_method_check
  check (payment_method in ('paypal','paypal_me','sumup','cash'));
