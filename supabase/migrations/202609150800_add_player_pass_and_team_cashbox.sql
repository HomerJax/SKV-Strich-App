alter table public.players
  add column if not exists birth_date date,
  add column if not exists jersey_number text,
  add column if not exists photo_path text;

alter table public.penalties
  add column if not exists escalation_after_days integer default 28,
  add column if not exists escalation_value text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-photos',
  'player-photos',
  true,
  2097152,
  array['image/png','image/jpeg','image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/png','image/jpeg','image/webp'];
