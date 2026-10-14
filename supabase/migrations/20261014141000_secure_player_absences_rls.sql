-- Restrict absence records to their owner. Writes are intentionally performed
-- by authenticated server actions using the service-role client.
revoke all privileges on table public.player_absences from anon;
revoke all privileges on table public.player_absences from authenticated;
grant select on table public.player_absences to authenticated;

alter table public.player_absences enable row level security;

drop policy if exists "players_read_own_absences" on public.player_absences;
create policy "players_read_own_absences" on public.player_absences
for select to authenticated
using (
  exists (
    select 1
    from public.players p
    where p.id = player_absences.player_id
      and p.club_id = player_absences.club_id
      and p.user_id = (select auth.uid())
  )
);
