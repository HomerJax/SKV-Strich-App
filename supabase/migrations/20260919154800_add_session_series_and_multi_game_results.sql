alter table public.sessions
  add column if not exists series_id uuid,
  add column if not exists series_index integer;

alter table public.sessions
  drop constraint if exists sessions_series_index_positive;

alter table public.sessions
  add constraint sessions_series_index_positive
  check (series_index is null or series_index >= 1);

create index if not exists idx_sessions_club_series_date
  on public.sessions (club_id, series_id, date)
  where series_id is not null;

alter table public.results
  add column if not exists game_no integer not null default 1;

alter table public.results
  drop constraint if exists results_game_no_positive;

alter table public.results
  add constraint results_game_no_positive check (game_no >= 1);

create unique index if not exists idx_results_session_game_no_unique
  on public.results (session_id, game_no);

alter table public.club_settings
  alter column attack_label set default 'Mittelfeld/Vorne';

update public.club_settings
set attack_label = 'Mittelfeld/Vorne',
    updated_at = now()
where attack_label = 'Vorne';
