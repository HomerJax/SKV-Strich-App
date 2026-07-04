-- Allow normal club members to run a session:
-- save teams, team_players and results.
-- Admin rights for club management stay unchanged.

drop policy if exists "teams_insert_for_session_members" on public.teams;
create policy "teams_insert_for_session_members"
on public.teams
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = teams.session_id
      and s.club_id = teams.club_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "teams_update_for_session_members" on public.teams;
create policy "teams_update_for_session_members"
on public.teams
for update
to authenticated
using (
  exists (
    select 1
    from public.sessions s
    where s.id = teams.session_id
      and s.club_id = teams.club_id
      and public.is_member_of_club(s.club_id)
  )
)
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = teams.session_id
      and s.club_id = teams.club_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "teams_delete_for_session_members" on public.teams;
create policy "teams_delete_for_session_members"
on public.teams
for delete
to authenticated
using (
  exists (
    select 1
    from public.sessions s
    where s.id = teams.session_id
      and s.club_id = teams.club_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "team_players_insert_for_session_members" on public.team_players;
create policy "team_players_insert_for_session_members"
on public.team_players
for insert
to authenticated
with check (
  exists (
    select 1
    from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = team_players.team_id
      and s.club_id = t.club_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "team_players_update_for_session_members" on public.team_players;
create policy "team_players_update_for_session_members"
on public.team_players
for update
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = team_players.team_id
      and s.club_id = t.club_id
      and public.is_member_of_club(s.club_id)
  )
)
with check (
  exists (
    select 1
    from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = team_players.team_id
      and s.club_id = t.club_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "team_players_delete_for_session_members" on public.team_players;
create policy "team_players_delete_for_session_members"
on public.team_players
for delete
to authenticated
using (
  exists (
    select 1
    from public.teams t
    join public.sessions s on s.id = t.session_id
    where t.id = team_players.team_id
      and s.club_id = t.club_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "results_insert_for_session_members" on public.results;
create policy "results_insert_for_session_members"
on public.results
for insert
to authenticated
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = results.session_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "results_update_for_session_members" on public.results;
create policy "results_update_for_session_members"
on public.results
for update
to authenticated
using (
  exists (
    select 1
    from public.sessions s
    where s.id = results.session_id
      and public.is_member_of_club(s.club_id)
  )
)
with check (
  exists (
    select 1
    from public.sessions s
    where s.id = results.session_id
      and public.is_member_of_club(s.club_id)
  )
);

drop policy if exists "results_delete_for_session_members" on public.results;
create policy "results_delete_for_session_members"
on public.results
for delete
to authenticated
using (
  exists (
    select 1
    from public.sessions s
    where s.id = results.session_id
      and public.is_member_of_club(s.club_id)
  )
);
