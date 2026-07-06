alter table public.sessions
add column if not exists start_time time;

alter table public.club_settings
add column if not exists rsvp_deadline_minutes_before integer not null default 30;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'club_settings_rsvp_deadline_minutes_before_check'
  ) then
    alter table public.club_settings
    add constraint club_settings_rsvp_deadline_minutes_before_check
    check (rsvp_deadline_minutes_before in (0, 15, 30, 60, 120, 1440));
  end if;
end $$;
