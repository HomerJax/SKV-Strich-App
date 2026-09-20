with invalid_sessions as (
  select s.id
  from public.sessions s
  left join public.results r on r.session_id = s.id
  where s.winner_photo_path is not null
  group by s.id
  having count(r.id) = 0
     or count(*) filter (where r.goals_team_a > r.goals_team_b)
        = count(*) filter (where r.goals_team_b > r.goals_team_a)
)
update public.sessions s
set
  winner_photo_path = null,
  winner_photo_focus_x = 0.5,
  winner_photo_focus_y = 0.5,
  winner_photo_zoom = 1.0
from invalid_sessions i
where s.id = i.id;
