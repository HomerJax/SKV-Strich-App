alter table public.sessions
  add column if not exists winner_photo_focus_x double precision not null default 0.5,
  add column if not exists winner_photo_focus_y double precision not null default 0.5,
  add column if not exists winner_photo_zoom double precision not null default 1.0;

alter table public.sessions
  drop constraint if exists sessions_winner_photo_focus_x_range,
  drop constraint if exists sessions_winner_photo_focus_y_range,
  drop constraint if exists sessions_winner_photo_zoom_range;

alter table public.sessions
  add constraint sessions_winner_photo_focus_x_range
    check (winner_photo_focus_x >= 0 and winner_photo_focus_x <= 1),
  add constraint sessions_winner_photo_focus_y_range
    check (winner_photo_focus_y >= 0 and winner_photo_focus_y <= 1),
  add constraint sessions_winner_photo_zoom_range
    check (winner_photo_zoom >= 0.75 and winner_photo_zoom <= 2.5);
