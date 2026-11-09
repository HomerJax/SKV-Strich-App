-- A RSVP/attendance roster is NOT proof that a training was played.
-- Only results recorded on/after the training date or verified tournaments are conservative completion evidence.
-- Results prefilled before the training (12 such sessions in the 09.11. production audit) are not proof.
-- Sessions without proof remain pending review; do not delete RSVP or roster history.
alter table public.sessions
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by uuid;

update public.sessions s
set completed_at = coalesce(
  s.tournament_completed_at,
  (select max(r.created_at) from public.results r
   where r.session_id = s.id
     and r.goals_team_a is not null and r.goals_team_b is not null
     and r.team_a_id is not null and r.team_b_id is not null
     and r.created_at >= (s.date::timestamp at time zone 'Europe/Berlin'))
)
where s.type = 'training'
  and s.completed_at is null
  and s.date <= (now() at time zone 'Europe/Berlin')::date
  and (s.tournament_completed_at is not null or exists (
    select 1 from public.results r
    where r.session_id = s.id
      and r.goals_team_a is not null and r.goals_team_b is not null
      and r.team_a_id is not null and r.team_b_id is not null
     and r.created_at >= (s.date::timestamp at time zone 'Europe/Berlin')
  ));

-- Explicitly completed trainings alone are eligible for statistical attendance.
-- The invoker view honors both underlying session/player RLS policies.
create or replace view public.stats_session_players
with (security_invoker = true)
as
select sp.id, sp.session_id, sp.player_id
from public.session_players sp
join public.sessions s on s.id = sp.session_id
where s.type = 'training'
  and s.completed_at is not null
  and s.date <= (now() at time zone 'Europe/Berlin')::date;

revoke all on public.stats_session_players from public, anon;
grant select on public.stats_session_players to authenticated, service_role;

-- MVP denominator and winner ratio must follow the exact same completion rule.
-- Keep the view's existing public column names/types for compatibility.
create or replace view public.player_mvp_stats
with (security_invoker = true)
as
with appearances as (
  select sp.player_id, s.club_id, count(distinct sp.session_id)::integer as appearances
  from public.stats_session_players sp
  join public.sessions s on s.id = sp.session_id
  group by sp.player_id, s.club_id
), mvp_wins as (
  select w.player_id, w.club_id, count(distinct w.session_id)::integer as mvp_wins
  from public.session_mvp_winners w
  join public.sessions s on s.id = w.session_id
  where s.type = 'training' and s.completed_at is not null
  group by w.player_id, w.club_id
)
select p.id as player_id, p.club_id,
       coalesce(a.appearances,0) as appearances,
       coalesce(m.mvp_wins,0) as mvp_wins,
       case when coalesce(a.appearances,0)=0 then 0::numeric
            else round(coalesce(m.mvp_wins,0)::numeric / a.appearances::numeric,3)
       end as mvp_per_game
from public.players p
left join appearances a on a.player_id=p.id and a.club_id=p.club_id
left join mvp_wins m on m.player_id=p.id and m.club_id=p.club_id;

-- Preserve consumer access to player MVP stats while enforcing invoker RLS.
grant select on public.player_mvp_stats to authenticated, service_role;
notify pgrst, 'reload schema';
