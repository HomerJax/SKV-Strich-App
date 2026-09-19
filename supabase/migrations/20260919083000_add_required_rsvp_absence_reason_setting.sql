alter table public.club_settings
  add column if not exists require_rsvp_reason_on_absence boolean not null default false;

comment on column public.club_settings.require_rsvp_reason_on_absence is
  'When true, players must provide a meaningful reason when declining a session.';
