-- Audited, atomic post-result team corrections. API authorization is required.
create table if not exists public.session_team_corrections (
  id bigint generated always as identity primary key,
  club_id uuid not null references public.clubs(id) on delete cascade,
  session_id bigint not null references public.sessions(id) on delete cascade,
  player_id bigint not null references public.players(id),
  from_team_id bigint not null references public.teams(id),
  to_team_id bigint not null references public.teams(id),
  swap_player_id bigint references public.players(id),
  changed_by uuid not null,
  changed_at timestamptz not null default now()
);
create index if not exists session_team_corrections_session_idx
  on public.session_team_corrections (club_id, session_id, changed_at desc);
alter table public.session_team_corrections enable row level security;
revoke all on public.session_team_corrections from anon, authenticated;

CREATE OR REPLACE FUNCTION public.correct_completed_session_team(p_club_id uuid, p_session_id bigint, p_player_id bigint, p_expected_team_id bigint, p_target_team_id bigint, p_swap_player_id bigint, p_changed_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_mode text;
  v_team_a bigint;
  v_team_b bigint;
  v_source_row bigint;
  v_source_team bigint;
  v_swap_row bigint;
  v_swap_team bigint;
  v_count integer;
begin
  perform pg_advisory_xact_lock(p_session_id);

  select coalesce(s.session_mode, 'normal')
    into v_mode
  from public.sessions s
  where s.id = p_session_id and s.club_id = p_club_id;
  if not found then raise exception 'Session gehört nicht zum Verein.'; end if;
  if v_mode <> 'normal' then
    raise exception 'Nur normale Sessions dürfen so korrigiert werden.';
  end if;

  select r.team_a_id, r.team_b_id into v_team_a, v_team_b
  from public.results r
  where r.session_id = p_session_id and r.club_id = p_club_id
  order by r.game_no asc limit 1;
  if not found or v_team_a is null or v_team_b is null or v_team_a=v_team_b then
    raise exception 'Kein abgeschlossenes Zweier-Team-Ergebnis vorhanden.';
  end if;

  if p_target_team_id not in (v_team_a, v_team_b)
    or p_expected_team_id not in (v_team_a, v_team_b)
    or p_target_team_id=p_expected_team_id then
    raise exception 'Ungültige Teamzuordnung.';
  end if;

  select count(*) into v_count from public.team_players tp
  where tp.player_id=p_player_id and tp.team_id in (v_team_a,v_team_b);
  if v_count <> 1 then raise exception 'Spieler ist nicht genau einem Team zugeordnet.'; end if;

  select tp.id,tp.team_id into v_source_row,v_source_team
  from public.team_players tp
  where tp.player_id=p_player_id and tp.team_id in (v_team_a,v_team_b)
  for update;
  if v_source_team <> p_expected_team_id then
    raise exception 'Teamzuordnung wurde inzwischen geändert. Bitte neu laden.';
  end if;

  if p_swap_player_id is not null then
    if p_swap_player_id=p_player_id then
      raise exception 'Ein Spieler kann nicht mit sich selbst getauscht werden.';
    end if;
    select count(*) into v_count from public.team_players tp
    where tp.player_id=p_swap_player_id and tp.team_id in (v_team_a,v_team_b);
    if v_count <> 1 then
      raise exception 'Tauschspieler ist nicht genau einem Team zugeordnet.';
    end if;
    select tp.id,tp.team_id into v_swap_row,v_swap_team
    from public.team_players tp
    where tp.player_id=p_swap_player_id and tp.team_id in (v_team_a,v_team_b)
    for update;
    if v_swap_team <> p_target_team_id then
      raise exception 'Tauschspieler gehört nicht zum Zielteam.';
    end if;
    update public.team_players set team_id=p_expected_team_id where id=v_swap_row;
  end if;

  update public.team_players set team_id=p_target_team_id where id=v_source_row;
  insert into public.session_team_corrections (
    club_id,session_id,player_id,from_team_id,to_team_id,swap_player_id,changed_by
  ) values (
    p_club_id,p_session_id,p_player_id,p_expected_team_id,p_target_team_id,p_swap_player_id,p_changed_by
  );

  return jsonb_build_object('ok',true,'playerId',p_player_id,'fromTeamId',p_expected_team_id,
    'toTeamId',p_target_team_id,'swapPlayerId',p_swap_player_id);
end;
$function$

revoke all on function public.correct_completed_session_team(uuid,bigint,bigint,bigint,bigint,bigint,uuid) from public, anon, authenticated;
grant execute on function public.correct_completed_session_team(uuid,bigint,bigint,bigint,bigint,bigint,uuid) to service_role;
