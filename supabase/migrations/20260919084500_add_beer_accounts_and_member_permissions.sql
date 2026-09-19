create table if not exists public.club_member_permissions (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null,
  permission_key text not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id, permission_key)
);

create index if not exists club_member_permissions_user_idx
  on public.club_member_permissions(user_id, club_id);

alter table public.club_member_permissions enable row level security;

drop policy if exists club_member_permissions_select_member on public.club_member_permissions;
create policy club_member_permissions_select_member
on public.club_member_permissions for select
using (public.is_member_of_club(club_id));

drop policy if exists club_member_permissions_write_admin on public.club_member_permissions;
create policy club_member_permissions_write_admin
on public.club_member_permissions for all
using (public.is_admin_of_club(club_id))
with check (public.is_admin_of_club(club_id));

alter table public.beer_consumptions
  add column if not exists payment_method text not null default 'paypal',
  add column if not exists payment_status text not null default 'pending',
  add column if not exists paid_at timestamptz,
  add column if not exists cash_transaction_id bigint references public.cash_transactions(id) on delete set null,
  add column if not exists created_by uuid,
  add column if not exists confirmed_by uuid,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists updated_at timestamptz not null default now();

alter table public.beer_consumptions
  drop constraint if exists beer_consumptions_payment_method_check;
alter table public.beer_consumptions
  add constraint beer_consumptions_payment_method_check
  check (payment_method in ('paypal','cash'));

alter table public.beer_consumptions
  drop constraint if exists beer_consumptions_payment_status_check;
alter table public.beer_consumptions
  add constraint beer_consumptions_payment_status_check
  check (payment_status in ('pending','paid','cancelled'));

create index if not exists beer_consumptions_club_payment_idx
  on public.beer_consumptions(club_id, payment_status, payment_method, created_at desc);
