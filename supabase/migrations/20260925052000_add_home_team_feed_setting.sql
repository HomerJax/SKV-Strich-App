alter table public.club_settings
  add column if not exists home_team_feed_enabled boolean not null default false;

comment on column public.club_settings.home_team_feed_enabled is
  'Controls whether the compact team feed is shown on the club home screen.';
