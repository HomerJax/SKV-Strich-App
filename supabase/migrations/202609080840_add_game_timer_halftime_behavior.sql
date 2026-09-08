alter table public.club_settings
  add column if not exists game_timer_halftime_behavior text not null default 'pause';

alter table public.club_settings
  drop constraint if exists club_settings_game_timer_halftime_behavior_check;

alter table public.club_settings
  add constraint club_settings_game_timer_halftime_behavior_check
  check (game_timer_halftime_behavior in ('pause', 'signal'));

alter table public.sessions
  add column if not exists timer_halftime_behavior text;

alter table public.sessions
  drop constraint if exists sessions_timer_halftime_behavior_check;

alter table public.sessions
  add constraint sessions_timer_halftime_behavior_check
  check (timer_halftime_behavior is null or timer_halftime_behavior in ('pause', 'signal'));
