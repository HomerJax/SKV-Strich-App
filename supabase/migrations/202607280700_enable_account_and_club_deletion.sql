-- Enables safe permanent club deletion.
-- Tables without ON DELETE CASCADE currently block deletion of public.clubs.

alter table public.players
  drop constraint if exists players_club_id_fkey;

alter table public.players
  add constraint players_club_id_fkey
  foreign key (club_id)
  references public.clubs(id)
  on delete cascade;

alter table public.results
  drop constraint if exists results_club_id_fkey;

alter table public.results
  add constraint results_club_id_fkey
  foreign key (club_id)
  references public.clubs(id)
  on delete cascade;

alter table public.seasons
  drop constraint if exists seasons_club_id_fkey;

alter table public.seasons
  add constraint seasons_club_id_fkey
  foreign key (club_id)
  references public.clubs(id)
  on delete cascade;

alter table public.sessions
  drop constraint if exists sessions_club_id_fkey;

alter table public.sessions
  add constraint sessions_club_id_fkey
  foreign key (club_id)
  references public.clubs(id)
  on delete cascade;

alter table public.teams
  drop constraint if exists teams_club_id_fkey;

alter table public.teams
  add constraint teams_club_id_fkey
  foreign key (club_id)
  references public.clubs(id)
  on delete cascade;
