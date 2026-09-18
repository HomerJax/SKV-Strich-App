alter table public.club_settings
  add column if not exists rsvp_deadline_minutes_before integer not null default 60;

alter table public.club_settings
  alter column rsvp_deadline_minutes_before set default 60;

alter table public.club_settings
  drop constraint if exists club_settings_rsvp_deadline_minutes_before_check;

alter table public.club_settings
  add constraint club_settings_rsvp_deadline_minutes_before_check
  check (rsvp_deadline_minutes_before between 0 and 10080);

alter table public.sessions
  add column if not exists rsvp_deadline_minutes_before integer;

alter table public.sessions
  drop constraint if exists sessions_rsvp_deadline_minutes_before_check;

alter table public.sessions
  add constraint sessions_rsvp_deadline_minutes_before_check
  check (
    rsvp_deadline_minutes_before is null
    or rsvp_deadline_minutes_before between 0 and 10080
  );

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'penalty_rules'
  ) then
    insert into public.penalty_rules (
      club_id,
      rule_key,
      label,
      reason,
      type,
      value,
      escalation_after_days,
      escalation_value,
      enabled,
      sort_order
    )
    select
      c.id,
      'late_rsvp',
      '⏰ Verspätete Anmeldung',
      'Nach Anmeldeschluss zugesagt',
      'money',
      '0,50 €',
      null,
      null,
      true,
      45
    from public.clubs c
    on conflict (club_id, rule_key) do nothing;
  end if;
end $$;
