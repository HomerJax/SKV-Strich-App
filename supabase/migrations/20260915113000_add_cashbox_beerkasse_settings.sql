alter table public.club_settings add column if not exists beerkasse_enabled boolean not null default false;
alter table public.club_settings add column if not exists beerkasse_paypal_url text;
alter table public.club_settings add column if not exists beerkasse_home_enabled boolean not null default false;
