create table if not exists public.cashbox_managers (
  club_id uuid not null references public.clubs(id) on delete cascade,
  user_id uuid not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table if not exists public.cash_transactions (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  amount_cents integer not null check (amount_cents <> 0),
  kind text not null check (kind in ('income','expense','reversal')),
  category text not null default 'Sonstiges',
  title text not null,
  notes text,
  occurred_on date not null default ((now() at time zone 'Europe/Berlin')::date),
  source_type text,
  source_id bigint,
  source_key text,
  reversed_transaction_id bigint references public.cash_transactions(id) on delete set null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create unique index if not exists cash_transactions_club_source_key_unique
  on public.cash_transactions(club_id, source_key)
  where source_key is not null;

create index if not exists cash_transactions_club_occurred_on_idx
  on public.cash_transactions(club_id, occurred_on desc, id desc);

create table if not exists public.cash_contributions (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  title text not null,
  amount_cents integer not null check (amount_cents > 0),
  due_date date,
  notes text,
  archived_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_contribution_members (
  contribution_id bigint not null references public.cash_contributions(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  status text not null default 'open' check (status in ('open','paid','exempt')),
  paid_at timestamptz,
  cash_transaction_id bigint references public.cash_transactions(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (contribution_id, player_id)
);

create index if not exists cash_contribution_members_club_player_idx
  on public.cash_contribution_members(club_id, player_id, status);

alter table public.penalties
  add column if not exists cash_transaction_id bigint references public.cash_transactions(id) on delete set null;

alter table public.cashbox_managers enable row level security;
alter table public.cash_transactions enable row level security;
alter table public.cash_contributions enable row level security;
alter table public.cash_contribution_members enable row level security;

drop policy if exists cashbox_managers_select_member on public.cashbox_managers;
create policy cashbox_managers_select_member
on public.cashbox_managers for select
using (public.is_member_of_club(club_id));

drop policy if exists cashbox_managers_write_admin on public.cashbox_managers;
create policy cashbox_managers_write_admin
on public.cashbox_managers for all
using (public.is_admin_of_club(club_id))
with check (public.is_admin_of_club(club_id));

drop policy if exists cash_transactions_select_member on public.cash_transactions;
create policy cash_transactions_select_member
on public.cash_transactions for select
using (public.is_member_of_club(club_id));

drop policy if exists cash_transactions_write_admin on public.cash_transactions;
create policy cash_transactions_write_admin
on public.cash_transactions for all
using (public.is_admin_of_club(club_id))
with check (public.is_admin_of_club(club_id));

drop policy if exists cash_contributions_select_member on public.cash_contributions;
create policy cash_contributions_select_member
on public.cash_contributions for select
using (public.is_member_of_club(club_id));

drop policy if exists cash_contributions_write_admin on public.cash_contributions;
create policy cash_contributions_write_admin
on public.cash_contributions for all
using (public.is_admin_of_club(club_id))
with check (public.is_admin_of_club(club_id));

drop policy if exists cash_contribution_members_select_member on public.cash_contribution_members;
create policy cash_contribution_members_select_member
on public.cash_contribution_members for select
using (public.is_member_of_club(club_id));

drop policy if exists cash_contribution_members_write_admin on public.cash_contribution_members;
create policy cash_contribution_members_write_admin
on public.cash_contribution_members for all
using (public.is_admin_of_club(club_id))
with check (public.is_admin_of_club(club_id));
