create index if not exists idx_players_user_id_member
  on public.players (user_id, club_id)
  where user_id is not null and is_guest = false;

create index if not exists idx_session_players_player_session
  on public.session_players (player_id, session_id);

create index if not exists idx_team_players_player_team
  on public.team_players (player_id, team_id);

create index if not exists idx_results_club_session
  on public.results (club_id, session_id);

create index if not exists idx_teams_club_session
  on public.teams (club_id, session_id);

create index if not exists idx_session_mvp_votes_club_session
  on public.session_mvp_votes (club_id, session_id);
