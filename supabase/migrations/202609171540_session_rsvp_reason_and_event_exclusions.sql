alter table public.session_rsvps
  add column if not exists reason text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_rsvps_reason_length_check'
  ) then
    alter table public.session_rsvps
      add constraint session_rsvps_reason_length_check
      check (reason is null or char_length(reason) <= 80);
  end if;
end $$;

create table if not exists public.session_event_exclusions (
  club_id uuid not null references public.clubs(id) on delete cascade,
  session_id bigint not null references public.sessions(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, player_id)
);

create index if not exists session_event_exclusions_club_id_idx
  on public.session_event_exclusions (club_id);

create index if not exists session_event_exclusions_player_id_idx
  on public.session_event_exclusions (player_id);

alter table public.session_event_exclusions enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_event_exclusions'
      and policyname = 'session_event_exclusions_select_own_club'
  ) then
    create policy session_event_exclusions_select_own_club
      on public.session_event_exclusions
      for select
      to authenticated
      using (public.is_member_of_club(club_id));
  end if;
end $$;

grant select on table public.session_event_exclusions to authenticated;
grant all on table public.session_event_exclusions to service_role;
