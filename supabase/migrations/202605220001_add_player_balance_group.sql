alter table public.players
  add column if not exists balance_group text;

create index if not exists idx_players_club_balance_group
  on public.players (club_id, balance_group)
  where balance_group is not null;

comment on column public.players.balance_group is
  'Optional generator balance group. Players in the same balance group should be distributed across teams as evenly as possible.';
