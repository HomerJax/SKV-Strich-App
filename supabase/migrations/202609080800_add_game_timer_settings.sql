alter table public.club_settings
  add column if not exists game_timer_enabled boolean not null default false,
  add column if not exists game_timer_default_mode text not null default 'duration',
  add column if not exists game_timer_default_minutes integer not null default 90,
  add column if not exists game_timer_default_end_time time without time zone,
  add column if not exists game_timer_halftime_enabled boolean not null default true,
  add column if not exists game_timer_alarm_sound text not null default 'whistle';

alter table public.sessions
  add column if not exists timer_mode text,
  add column if not exists timer_duration_minutes integer,
  add column if not exists timer_end_time time without time zone,
  add column if not exists timer_halftime_enabled boolean,
  add column if not exists timer_alarm_sound text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'club_settings_game_timer_mode_check') then
    alter table public.club_settings
      add constraint club_settings_game_timer_mode_check
      check (game_timer_default_mode in ('duration', 'end_time'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'club_settings_game_timer_minutes_check') then
    alter table public.club_settings
      add constraint club_settings_game_timer_minutes_check
      check (game_timer_default_minutes between 1 and 300);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'club_settings_game_timer_sound_check') then
    alter table public.club_settings
      add constraint club_settings_game_timer_sound_check
      check (game_timer_alarm_sound in ('whistle', 'horn', 'buzzer'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sessions_timer_mode_check') then
    alter table public.sessions
      add constraint sessions_timer_mode_check
      check (timer_mode is null or timer_mode in ('duration', 'end_time'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sessions_timer_minutes_check') then
    alter table public.sessions
      add constraint sessions_timer_minutes_check
      check (timer_duration_minutes is null or timer_duration_minutes between 1 and 300);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'sessions_timer_sound_check') then
    alter table public.sessions
      add constraint sessions_timer_sound_check
      check (timer_alarm_sound is null or timer_alarm_sound in ('whistle', 'horn', 'buzzer'));
  end if;
end $$;
