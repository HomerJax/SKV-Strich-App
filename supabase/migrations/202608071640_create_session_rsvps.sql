create table if not exists public.session_rsvps (
  id bigserial primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  session_id bigint not null references public.sessions(id) on delete cascade,
  player_id bigint not null references public.players(id) on delete cascade,
  status text not null check (status in ('in', 'out')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_rsvps_session_id_player_id_key unique (session_id, player_id)
);

create index if not exists session_rsvps_club_id_idx
  on public.session_rsvps (club_id);

create index if not exists session_rsvps_session_id_idx
  on public.session_rsvps (session_id);

create index if not exists session_rsvps_player_id_idx
  on public.session_rsvps (player_id);

alter table public.session_rsvps enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'session_rsvps'
      and policyname = 'session_rsvps_select_own_club'
  ) then
    create policy session_rsvps_select_own_club
      on public.session_rsvps
      for select
      to authenticated
      using (public.is_member_of_club(club_id));
  end if;
end $$;

grant select on table public.session_rsvps to authenticated;
grant all on table public.session_rsvps to service_role;
grant usage, select on sequence public.session_rsvps_id_seq to service_role;
