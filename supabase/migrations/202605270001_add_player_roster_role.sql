alter table public.players
  add column if not exists roster_role text not null default 'player';

alter table public.players
  drop constraint if exists players_roster_role_check;

alter table public.players
  add constraint players_roster_role_check
  check (roster_role in ('player', 'staff'));

create index if not exists idx_players_club_roster_role
  on public.players (club_id, roster_role);

comment on column public.players.roster_role is
  'Roster role for training attendance. player participates in team generation, staff can attend but is ignored by the team generator.';
