alter table public.players
  add column if not exists photo_position_x integer not null default 50,
  add column if not exists photo_position_y integer not null default 50,
  add column if not exists photo_zoom numeric(4,2) not null default 1.00;

alter table public.players
  drop constraint if exists players_photo_position_x_check,
  add constraint players_photo_position_x_check check (photo_position_x between 0 and 100),
  drop constraint if exists players_photo_position_y_check,
  add constraint players_photo_position_y_check check (photo_position_y between 0 and 100),
  drop constraint if exists players_photo_zoom_check,
  add constraint players_photo_zoom_check check (photo_zoom between 1.00 and 3.00);
