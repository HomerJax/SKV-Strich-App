


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."club_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "club_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "club_memberships_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."club_memberships" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_club_invite"("p_token" "text") RETURNS "public"."club_memberships"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_invite public.invites%rowtype;
  v_membership public.club_memberships%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Nicht eingeloggt.';
  end if;

  select *
    into v_invite
  from public.invites i
  where i.token = p_token
  limit 1;

  if v_invite.id is null then
    raise exception 'Einladung nicht gefunden.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Einladung ist abgelaufen.';
  end if;

  insert into public.club_memberships (
    club_id,
    user_id,
    role
  )
  values (
    v_invite.club_id,
    v_user_id,
    v_invite.role
  )
  on conflict (club_id, user_id)
  do update set role = public.club_memberships.role
  returning *
  into v_membership;

  return v_membership;
end;
$$;


ALTER FUNCTION "public"."accept_club_invite"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."accept_club_invite"("p_token" "uuid") RETURNS "public"."club_memberships"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_invite public.club_invites%rowtype;
  v_membership public.club_memberships%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Nicht eingeloggt.';
  end if;

  select *
    into v_invite
  from public.club_invites i
  where i.token = p_token
  limit 1;

  if v_invite.id is null then
    raise exception 'Einladung nicht gefunden.';
  end if;

  if v_invite.is_active is not true then
    raise exception 'Einladung ist deaktiviert.';
  end if;

  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    raise exception 'Einladung ist abgelaufen.';
  end if;

  insert into public.club_memberships (
    club_id,
    user_id,
    role
  )
  values (
    v_invite.club_id,
    v_user_id,
    v_invite.role
  )
  on conflict (club_id, user_id)
  do update set role = public.club_memberships.role
  returning *
  into v_membership;

  return v_membership;
end;
$$;


ALTER FUNCTION "public"."accept_club_invite"("p_token" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_link_member_player"("target_user_id" "uuid", "target_player_id" bigint DEFAULT NULL::bigint) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
  current_club_id uuid;
  current_user_role text;
  target_membership record;
  target_player record;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return 'not_allowed';
  end if;

  select cm.club_id, cm.role
  into current_club_id, current_user_role
  from public.club_memberships cm
  where cm.user_id = current_user_id
  limit 1;

  if current_club_id is null or current_user_role <> 'admin' then
    return 'not_allowed';
  end if;

  select *
  into target_membership
  from public.club_memberships cm
  where cm.user_id = target_user_id
    and cm.club_id = current_club_id
  limit 1;

  if target_membership is null then
    return 'member_not_in_club';
  end if;

  update public.players
  set user_id = null
  where club_id = current_club_id
    and user_id = target_user_id;

  if target_player_id is null then
    return 'ok_unlinked';
  end if;

  select *
  into target_player
  from public.players p
  where p.id = target_player_id
    and p.club_id = current_club_id
  limit 1;

  if target_player is null then
    return 'player_not_in_club';
  end if;

  if target_player.user_id is not null and target_player.user_id <> target_user_id then
    return 'player_already_linked';
  end if;

  update public.players
  set user_id = target_user_id
  where id = target_player_id
    and club_id = current_club_id;

  return 'ok';
end;
$$;


ALTER FUNCTION "public"."admin_link_member_player"("target_user_id" "uuid", "target_player_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_remove_member"("target_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
  current_club_id uuid;
  current_user_role text;
  target_membership record;
  admin_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return 'not_allowed';
  end if;

  select cm.club_id, cm.role
  into current_club_id, current_user_role
  from public.club_memberships cm
  where cm.user_id = current_user_id
  limit 1;

  if current_club_id is null or current_user_role <> 'admin' then
    return 'not_allowed';
  end if;

  if current_user_id = target_user_id then
    return 'cannot_remove_yourself';
  end if;

  select *
  into target_membership
  from public.club_memberships cm
  where cm.user_id = target_user_id
    and cm.club_id = current_club_id
  limit 1;

  if target_membership is null then
    return 'not_allowed';
  end if;

  if target_membership.role = 'admin' then
    select count(*)
    into admin_count
    from public.club_memberships cm
    where cm.club_id = current_club_id
      and cm.role = 'admin';

    if admin_count <= 1 then
      return 'last_admin_must_remain';
    end if;
  end if;

  update public.players
  set user_id = null,
      is_active = false
  where club_id = current_club_id
    and user_id = target_user_id;

  delete from public.club_memberships
  where club_id = current_club_id
    and user_id = target_user_id;

  return 'ok';
end;
$$;


ALTER FUNCTION "public"."admin_remove_member"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_remove_member"("target_user_id" "uuid", "target_club_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
  current_user_role text;
  target_membership record;
  admin_count integer;
  current_user_is_power_user boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return 'not_allowed';
  end if;

  if target_club_id is null then
    return 'not_allowed';
  end if;

  select ur.is_power_user
  into current_user_is_power_user
  from public.user_roles ur
  where ur.user_id = current_user_id
  limit 1;

  current_user_is_power_user := coalesce(current_user_is_power_user, false);

  if not current_user_is_power_user then
    select cm.role
    into current_user_role
    from public.club_memberships cm
    where cm.user_id = current_user_id
      and cm.club_id = target_club_id
    limit 1;

    if current_user_role is null or current_user_role <> 'admin' then
      return 'not_allowed';
    end if;
  end if;

  if current_user_id = target_user_id then
    return 'cannot_remove_yourself';
  end if;

  select *
  into target_membership
  from public.club_memberships cm
  where cm.user_id = target_user_id
    and cm.club_id = target_club_id
  limit 1;

  if target_membership is null then
    return 'not_allowed';
  end if;

  if target_membership.role = 'admin' then
    select count(*)
    into admin_count
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.role = 'admin';

    if admin_count <= 1 then
      return 'last_admin_must_remain';
    end if;
  end if;

  update public.players
  set user_id = null,
      is_active = false
  where club_id = target_club_id
    and user_id = target_user_id;

  delete from public.club_memberships
  where club_id = target_club_id
    and user_id = target_user_id;

  return 'ok';
end;
$$;


ALTER FUNCTION "public"."admin_remove_member"("target_user_id" "uuid", "target_club_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
  current_club_id uuid;
  current_user_role text;
  target_membership record;
  admin_count integer;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return 'not_allowed';
  end if;

  if new_role not in ('admin', 'member') then
    return 'not_allowed';
  end if;

  select cm.club_id, cm.role
  into current_club_id, current_user_role
  from public.club_memberships cm
  where cm.user_id = current_user_id
  limit 1;

  if current_club_id is null or current_user_role <> 'admin' then
    return 'not_allowed';
  end if;

  if current_user_id = target_user_id then
    return 'cannot_change_own_role';
  end if;

  select *
  into target_membership
  from public.club_memberships cm
  where cm.user_id = target_user_id
    and cm.club_id = current_club_id
  limit 1;

  if target_membership is null then
    return 'not_allowed';
  end if;

  if target_membership.role = 'admin' and new_role = 'member' then
    select count(*)
    into admin_count
    from public.club_memberships cm
    where cm.club_id = current_club_id
      and cm.role = 'admin';

    if admin_count <= 1 then
      return 'last_admin_must_remain';
    end if;
  end if;

  update public.club_memberships
  set role = new_role
  where user_id = target_user_id
    and club_id = current_club_id;

  return 'ok';
end;
$$;


ALTER FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text", "target_club_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid;
  current_user_role text;
  target_membership record;
  admin_count integer;
  current_user_is_power_user boolean;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    return 'not_allowed';
  end if;

  if target_club_id is null then
    return 'not_allowed';
  end if;

  if new_role not in ('admin', 'member') then
    return 'not_allowed';
  end if;

  select ur.is_power_user
  into current_user_is_power_user
  from public.user_roles ur
  where ur.user_id = current_user_id
  limit 1;

  current_user_is_power_user := coalesce(current_user_is_power_user, false);

  if not current_user_is_power_user then
    select cm.role
    into current_user_role
    from public.club_memberships cm
    where cm.user_id = current_user_id
      and cm.club_id = target_club_id
    limit 1;

    if current_user_role is null or current_user_role <> 'admin' then
      return 'not_allowed';
    end if;
  end if;

  if current_user_id = target_user_id then
    return 'cannot_change_own_role';
  end if;

  select *
  into target_membership
  from public.club_memberships cm
  where cm.user_id = target_user_id
    and cm.club_id = target_club_id
  limit 1;

  if target_membership is null then
    return 'not_allowed';
  end if;

  if target_membership.role = 'admin' and new_role = 'member' then
    select count(*)
    into admin_count
    from public.club_memberships cm
    where cm.club_id = target_club_id
      and cm.role = 'admin';

    if admin_count <= 1 then
      return 'last_admin_must_remain';
    end if;
  end if;

  update public.club_memberships
  set role = new_role
  where user_id = target_user_id
    and club_id = target_club_id;

  return 'ok';
end;
$$;


ALTER FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text", "target_club_id" "uuid") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."players" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "preferred_position" "text" DEFAULT 'attack'::"text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "age_group" "text" DEFAULT 'AH'::"text",
    "strength" smallint DEFAULT 3,
    "club_id" "uuid",
    "user_id" "uuid",
    "first_name" "text",
    "last_name" "text",
    "nickname" "text",
    "is_guest" boolean DEFAULT false NOT NULL,
    "category_key" "text",
    "email" "text",
    "mvp_count" integer DEFAULT 0 NOT NULL,
    "badge_level" "text",
    CONSTRAINT "players_age_group_check" CHECK (("age_group" = ANY (ARRAY['AH'::"text", 'Ü32'::"text"]))),
    CONSTRAINT "players_preferred_position_check" CHECK (("preferred_position" = ANY (ARRAY['defense'::"text", 'attack'::"text", 'goalkeeper'::"text"]))),
    CONSTRAINT "players_strength_check" CHECK ((("strength" >= 1) AND ("strength" <= 5)))
);


ALTER TABLE "public"."players" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."complete_my_onboarding"("p_first_name" "text", "p_last_name" "text", "p_nickname" "text", "p_category_key" "text", "p_preferred_position" "text") RETURNS "public"."players"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_club_id uuid;
  v_settings public.club_settings%rowtype;
  v_existing_player public.players%rowtype;
  v_new_player public.players%rowtype;
  v_display_name text;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Nicht eingeloggt.';
  end if;

  if p_first_name is null or char_length(trim(p_first_name)) = 0 then
    raise exception 'Vorname ist erforderlich.';
  end if;

  if p_last_name is null or char_length(trim(p_last_name)) = 0 then
    raise exception 'Nachname ist erforderlich.';
  end if;

  if p_preferred_position is null
     or p_preferred_position not in ('attack', 'defense', 'goalkeeper') then
    raise exception 'Ungültige Position.';
  end if;

  select m.club_id
    into v_club_id
  from public.club_memberships m
  where m.user_id = v_user_id
  limit 1;

  if v_club_id is null then
    raise exception 'Keine Club-Mitgliedschaft gefunden.';
  end if;

  select *
    into v_existing_player
  from public.players p
  where p.user_id = v_user_id
    and p.club_id = v_club_id
  limit 1;

  if v_existing_player.id is not null then
    return v_existing_player;
  end if;

  select *
    into v_settings
  from public.club_settings cs
  where cs.club_id = v_club_id;

  if v_settings.club_id is null then
    insert into public.club_settings (club_id)
    values (v_club_id)
    on conflict (club_id) do nothing;

    select *
      into v_settings
    from public.club_settings cs
    where cs.club_id = v_club_id;
  end if;

  if v_settings.use_categories then
    if p_category_key is null or char_length(trim(p_category_key)) = 0 then
      raise exception 'Bitte Kategorie wählen.';
    end if;
  end if;

  v_display_name := trim(p_first_name) || ' ' || trim(p_last_name);

  insert into public.players (
    club_id,
    user_id,
    name,
    first_name,
    last_name,
    nickname,
    preferred_position,
    category_key,
    strength,
    is_guest,
    is_active
  )
  values (
    v_club_id,
    v_user_id,
    v_display_name,
    trim(p_first_name),
    trim(p_last_name),
    nullif(trim(coalesce(p_nickname, '')), ''),
    p_preferred_position,
    case when v_settings.use_categories then p_category_key else null end,
    case when v_settings.use_strength then v_settings.strength_default else null end,
    false,
    true
  )
  returning *
  into v_new_player;

  return v_new_player;
end;
$$;


ALTER FUNCTION "public"."complete_my_onboarding"("p_first_name" "text", "p_last_name" "text", "p_nickname" "text", "p_category_key" "text", "p_preferred_position" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_invites" (
    "id" bigint NOT NULL,
    "club_id" "uuid" NOT NULL,
    "token" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "used_at" timestamp with time zone,
    "used_by" "uuid",
    "is_active" boolean DEFAULT true NOT NULL,
    CONSTRAINT "club_invites_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."club_invites" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_club_invite"("p_role" "text" DEFAULT 'member'::"text", "p_expires_in_days" integer DEFAULT 14) RETURNS "public"."club_invites"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_user_id uuid;
  v_club_id uuid;
  v_role text;
  v_invite public.club_invites%rowtype;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Nicht eingeloggt.';
  end if;

  select m.club_id, m.role
    into v_club_id, v_role
  from public.club_memberships m
  where m.user_id = v_user_id
  limit 1;

  if v_club_id is null then
    raise exception 'Keine Club-Mitgliedschaft gefunden.';
  end if;

  if v_role <> 'admin' then
    raise exception 'Nur Admins dürfen Einladungen erstellen.';
  end if;

  if p_role not in ('admin', 'member') then
    raise exception 'Ungültige Rolle.';
  end if;

  insert into public.club_invites (
    club_id,
    role,
    created_by,
    expires_at
  )
  values (
    v_club_id,
    p_role,
    v_user_id,
    case
      when p_expires_in_days is null or p_expires_in_days <= 0 then null
      else now() + make_interval(days => p_expires_in_days)
    end
  )
  returning *
  into v_invite;

  return v_invite;
end;
$$;


ALTER FUNCTION "public"."create_club_invite"("p_role" "text", "p_expires_in_days" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."finalize_mvp_voting_for_session"("p_session_id" bigint) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  v_session record;
  v_winner_player_id bigint;
  v_winner_user_id uuid;
  v_winner_old_mvp_count integer;
  v_winner_new_mvp_count integer;
  v_old_badge text;
  v_new_badge text;
  v_winner_name text;
begin
  -- Session laden und gegen Doppelausführung schützen
  select
    s.id,
    s.club_id,
    s.mvp_voting_closed_at,
    s.mvp_voting_finalized_at,
    s.mvp_winner_player_id
  into v_session
  from public.sessions s
  where s.id = p_session_id;

  if not found then
    raise exception 'Session % nicht gefunden', p_session_id;
  end if;

  if v_session.mvp_voting_finalized_at is not null then
    return;
  end if;

  -- Nur finalisieren, wenn Voting-Ende gesetzt und abgelaufen ist
  if v_session.mvp_voting_closed_at is null then
    return;
  end if;

  if v_session.mvp_voting_closed_at > now() then
    return;
  end if;

  -- Gewinner bestimmen
  select t.voted_player_id
  into v_winner_player_id
  from (
    select
      smv.voted_player_id,
      count(*) as vote_count
    from public.session_mvp_votes smv
    where smv.session_id = p_session_id
    group by smv.voted_player_id
    order by vote_count desc, smv.voted_player_id asc
    limit 1
  ) t;

  if v_winner_player_id is null then
    return;
  end if;

  -- Session finalisieren
  update public.sessions s
  set
    mvp_winner_player_id = v_winner_player_id,
    mvp_voting_finalized_at = now()
  where s.id = p_session_id
    and s.mvp_voting_finalized_at is null;

  -- aktuellen Player-Status laden
  select
    p.user_id,
    coalesce(p.mvp_count, 0),
    p.badge_level,
    coalesce(p.nickname, p.first_name, p.name, 'Ein Spieler')
  into
    v_winner_user_id,
    v_winner_old_mvp_count,
    v_old_badge,
    v_winner_name
  from public.players p
  where p.id = v_winner_player_id;

  v_winner_new_mvp_count := v_winner_old_mvp_count + 1;
  v_new_badge := public.get_badge_level(v_winner_new_mvp_count);

  -- Gewinner-Player updaten
  update public.players p
  set
    mvp_count = v_winner_new_mvp_count,
    badge_level = v_new_badge
  where p.id = v_winner_player_id;

  -- Badge-Historie
  if v_new_badge is not null then
    insert into public.player_badges (
      club_id,
      player_id,
      badge_level,
      session_id
    )
    values (
      v_session.club_id,
      v_winner_player_id,
      v_new_badge,
      p_session_id
    )
    on conflict (player_id, badge_level) do nothing;
  end if;

  -- MVP Winner Notification
  if v_winner_user_id is not null then
    insert into public.user_notifications (
      user_id,
      club_id,
      type,
      title,
      body,
      cta_href,
      cta_label,
      payload,
      dedupe_key
    )
    values (
      v_winner_user_id,
      v_session.club_id,
      'mvp_winner',
      'Du bist MVP',
      'Deine Mitspieler haben dich zum MVP dieser Session gewählt.',
      '/sessions/' || p_session_id::text,
      'Session ansehen',
      jsonb_build_object(
        'sessionId', p_session_id,
        'playerId', v_winner_player_id,
        'playerName', v_winner_name,
        'mvpCount', v_winner_new_mvp_count,
        'badgeLevel', v_new_badge
      ),
      'mvp_winner:' || p_session_id::text || ':' || v_winner_user_id::text
    )
    on conflict do nothing;
  end if;

  -- Badge Notification nur bei neuem Level
  if v_winner_user_id is not null
     and v_new_badge is not null
     and coalesce(v_old_badge, '') is distinct from coalesce(v_new_badge, '') then
    insert into public.user_notifications (
      user_id,
      club_id,
      type,
      title,
      body,
      cta_href,
      cta_label,
      payload,
      dedupe_key
    )
    values (
      v_winner_user_id,
      v_session.club_id,
      'badge_awarded',
      'Neues Badge freigeschaltet',
      case v_new_badge
        when 'copper' then 'Du hast das Kupfer-Badge erreicht.'
        when 'bronze' then 'Du hast das Bronze-Badge erreicht.'
        when 'silver' then 'Du hast das Silber-Badge erreicht.'
        when 'gold' then 'Du hast das Gold-Badge erreicht.'
        when 'goat' then 'Du hast das G.O.A.T-Badge erreicht.'
        else 'Du hast ein neues Badge erreicht.'
      end,
      '/sessions/' || p_session_id::text,
      'Session ansehen',
      jsonb_build_object(
        'sessionId', p_session_id,
        'playerId', v_winner_player_id,
        'badgeLevel', v_new_badge,
        'mvpCount', v_winner_new_mvp_count
      ),
      'badge_awarded:' || v_winner_player_id::text || ':' || v_new_badge
    )
    on conflict do nothing;
  end if;

  -- Ergebnis-Notification an alle Teilnehmer
  insert into public.user_notifications (
    user_id,
    club_id,
    type,
    title,
    body,
    cta_href,
    cta_label,
    payload,
    dedupe_key
  )
  select
    p.user_id,
    v_session.club_id,
    'mvp_result',
    'MVP-Ergebnis ist da',
    v_winner_name || ' wurde zum MVP dieser Session gewählt.',
    '/sessions/' || p_session_id::text,
    'Ergebnis ansehen',
    jsonb_build_object(
      'sessionId', p_session_id,
      'winnerPlayerId', v_winner_player_id,
      'winnerName', v_winner_name,
      'winnerBadgeLevel', v_new_badge,
      'winnerMvpCount', v_winner_new_mvp_count
    ),
    'mvp_result:' || p_session_id::text || ':' || p.user_id::text
  from public.session_players sp
  join public.players p
    on p.id = sp.player_id
  where sp.session_id = p_session_id
    and p.user_id is not null
  on conflict do nothing;
end;
$$;


ALTER FUNCTION "public"."finalize_mvp_voting_for_session"("p_session_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_badge_level"("mvp_count" integer) RETURNS "text"
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select case
    when mvp_count >= 10 then 'goat'
    when mvp_count >= 7 then 'gold'
    when mvp_count >= 5 then 'silver'
    when mvp_count >= 3 then 'bronze'
    when mvp_count >= 1 then 'copper'
    else null
  end
$$;


ALTER FUNCTION "public"."get_badge_level"("mvp_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_club_members_admin"() RETURNS TABLE("user_id" "uuid", "email" "text", "full_name" "text", "role" "text")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  with my_club as (
    select cm.club_id
    from public.club_memberships cm
    where cm.user_id = auth.uid()
    limit 1
  ),
  member_players as (
    select
      p.user_id,
      p.club_id,
      p.name,
      p.first_name,
      p.last_name,
      p.nickname,
      row_number() over (
        partition by p.user_id, p.club_id
        order by
          case when p.is_active = true then 0 else 1 end,
          p.id asc
      ) as rn
    from public.players p
    where p.user_id is not null
  )
  select
    cm.user_id,
    au.email::text as email,
    coalesce(
      nullif(trim(mp.nickname), ''),
      nullif(trim(concat(coalesce(mp.first_name, ''), ' ', coalesce(mp.last_name, ''))), ''),
      nullif(trim(mp.name), ''),
      nullif(trim(concat(
        coalesce(au.raw_user_meta_data->>'first_name', ''),
        ' ',
        coalesce(au.raw_user_meta_data->>'last_name', '')
      )), ''),
      nullif(au.raw_user_meta_data->>'full_name', ''),
      split_part(au.email, '@', 1),
      au.email
    )::text as full_name,
    cm.role::text as role
  from public.club_memberships cm
  join my_club mc
    on mc.club_id = cm.club_id
  join auth.users au
    on au.id = cm.user_id
  left join member_players mp
    on mp.user_id = cm.user_id
   and mp.club_id = cm.club_id
   and mp.rn = 1
  where public.is_admin_of_club(cm.club_id)
  order by
    case when cm.role = 'admin' then 0 else 1 end,
    lower(
      coalesce(
        nullif(trim(mp.nickname), ''),
        nullif(trim(concat(coalesce(mp.first_name, ''), ' ', coalesce(mp.last_name, ''))), ''),
        nullif(trim(mp.name), ''),
        nullif(trim(concat(
          coalesce(au.raw_user_meta_data->>'first_name', ''),
          ' ',
          coalesce(au.raw_user_meta_data->>'last_name', '')
        )), ''),
        nullif(au.raw_user_meta_data->>'full_name', ''),
        split_part(au.email, '@', 1),
        au.email
      )
    );
$$;


ALTER FUNCTION "public"."get_club_members_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_invite_public"("p_token" "text") RETURNS TABLE("club_name" "text", "role" "text", "is_valid" boolean, "is_expired" boolean, "is_accepted" boolean, "expires_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    c.name::text as club_name,
    i.role::text as role,
    (i.accepted_at is null and i.expires_at > now()) as is_valid,
    (i.expires_at <= now()) as is_expired,
    (i.accepted_at is not null) as is_accepted,
    i.expires_at
  from public.invites i
  join public.clubs c
    on c.id = i.club_id
  where i.token = p_token
  limit 1;
$$;


ALTER FUNCTION "public"."get_invite_public"("p_token" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_membership"() RETURNS TABLE("user_id" "uuid", "club_id" "uuid", "role" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select cm.user_id, cm.club_id, cm.role
  from public.club_memberships cm
  where cm.user_id = auth.uid()
  limit 1;
$$;


ALTER FUNCTION "public"."get_my_membership"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_players_public"() RETURNS TABLE("id" bigint, "name" "text", "first_name" "text", "last_name" "text", "nickname" "text", "age_group" "text", "preferred_position" "text", "is_active" boolean, "club_id" "uuid")
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    p.id,
    p.name,
    p.first_name,
    p.last_name,
    p.nickname,
    p.age_group::text,
    p.preferred_position::text,
    p.is_active,
    p.club_id
  from public.players p
  where public.is_member_of_club(p.club_id)
  order by
    lower(
      coalesce(
        nullif(trim(p.nickname), ''),
        nullif(trim(concat(coalesce(p.first_name, ''), ' ', coalesce(p.last_name, ''))), ''),
        nullif(trim(p.name), ''),
        'unbekannt'
      )
    ) asc;
$$;


ALTER FUNCTION "public"."get_players_public"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_of_club"("check_club_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    exists (
      select 1
      from public.club_memberships cm
      where cm.user_id = auth.uid()
        and cm.club_id = check_club_id
        and cm.role in ('admin', 'owner')
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_power_user = true
    );
$$;


ALTER FUNCTION "public"."is_admin_of_club"("check_club_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_member_of_club"("check_club_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    exists (
      select 1
      from public.club_memberships cm
      where cm.user_id = auth.uid()
        and cm.club_id = check_club_id
    )
    or exists (
      select 1
      from public.user_roles ur
      where ur.user_id = auth.uid()
        and ur.is_power_user = true
    );
$$;


ALTER FUNCTION "public"."is_member_of_club"("check_club_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_existing_player_by_email"("p_user_id" "uuid", "p_email" "text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  v_player_id bigint;
begin
  if p_user_id is null or p_email is null or btrim(p_email) = '' then
    return null;
  end if;

  update public.players
  set user_id = p_user_id
  where id = (
    select p.id
    from public.players p
    where lower(btrim(p.email)) = lower(btrim(p_email))
      and p.user_id is null
    order by p.id asc
    limit 1
  )
  returning id into v_player_id;

  return v_player_id;
end;
$$;


ALTER FUNCTION "public"."link_existing_player_by_email"("p_user_id" "uuid", "p_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."link_player_on_auth_user_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'auth'
    AS $$
begin
  if new.email is null or btrim(new.email) = '' then
    return new;
  end if;

  update public.players
  set user_id = new.id
  where user_id is null
    and email is not null
    and lower(btrim(email)) = lower(btrim(new.email));

  return new;
end;
$$;


ALTER FUNCTION "public"."link_player_on_auth_user_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_player_category"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  if new.category_key is null then
    return new;
  end if;

  if not exists (
    select 1
    from public.club_categories c
    where c.club_id = new.club_id
      and c.key = new.category_key
      and c.is_active = true
  ) then
    raise exception 'Invalid category_key for this club';
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_player_category"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_categories" (
    "id" bigint NOT NULL,
    "club_id" "uuid" NOT NULL,
    "key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "generator_base" integer DEFAULT 0,
    CONSTRAINT "club_categories_key_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "key")) > 0)),
    CONSTRAINT "club_categories_label_not_empty" CHECK (("char_length"(TRIM(BOTH FROM "label")) > 0))
);


ALTER TABLE "public"."club_categories" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."club_categories_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."club_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."club_categories_id_seq" OWNED BY "public"."club_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."club_feature_flags" (
    "id" bigint NOT NULL,
    "club_id" "uuid" NOT NULL,
    "feature_key" "text" NOT NULL,
    "enabled" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."club_feature_flags" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."club_feature_flags_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."club_feature_flags_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."club_feature_flags_id_seq" OWNED BY "public"."club_feature_flags"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."club_invites_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."club_invites_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."club_invites_id_seq" OWNED BY "public"."club_invites"."id";



CREATE TABLE IF NOT EXISTS "public"."session_mvp_votes" (
    "id" bigint NOT NULL,
    "club_id" "uuid" NOT NULL,
    "session_id" bigint NOT NULL,
    "voter_user_id" "uuid" NOT NULL,
    "voted_player_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."session_mvp_votes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."session_mvp_vote_totals" AS
 WITH "vote_counts" AS (
         SELECT "v"."session_id",
            "v"."club_id",
            "v"."voted_player_id" AS "player_id",
            ("count"(*))::integer AS "vote_count"
           FROM "public"."session_mvp_votes" "v"
          GROUP BY "v"."session_id", "v"."club_id", "v"."voted_player_id"
        )
 SELECT "session_id",
    "club_id",
    "player_id",
    "vote_count"
   FROM "vote_counts" "vc";


ALTER VIEW "public"."session_mvp_vote_totals" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."session_mvp_winners" AS
 WITH "ranked" AS (
         SELECT "t"."session_id",
            "t"."club_id",
            "t"."player_id",
            "t"."vote_count",
            "max"("t"."vote_count") OVER (PARTITION BY "t"."session_id") AS "max_vote_count"
           FROM "public"."session_mvp_vote_totals" "t"
        )
 SELECT "session_id",
    "club_id",
    "player_id",
    "vote_count"
   FROM "ranked"
  WHERE ("vote_count" = "max_vote_count");


ALTER VIEW "public"."session_mvp_winners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_players" (
    "id" bigint NOT NULL,
    "session_id" bigint,
    "player_id" bigint
);


ALTER TABLE "public"."session_players" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" bigint NOT NULL,
    "season_id" bigint,
    "date" "date" NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "club_id" "uuid" NOT NULL,
    "winner_photo_path" "text",
    "mvp_voting_closed_at" timestamp with time zone,
    "mvp_voting_finalized_at" timestamp with time zone,
    "mvp_winner_player_id" bigint,
    "type" "text" DEFAULT 'training'::"text" NOT NULL,
    CONSTRAINT "sessions_type_check" CHECK (("type" = ANY (ARRAY['training'::"text", 'event'::"text"])))
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sessions"."type" IS 'Session-Typ: training = voller STRIKR Flow, game = Orga/Spiel, event = reiner Termin ohne Stats';



CREATE OR REPLACE VIEW "public"."player_mvp_stats" AS
 WITH "appearances" AS (
         SELECT "sp"."player_id",
            "s"."club_id",
            ("count"(DISTINCT "sp"."session_id"))::integer AS "appearances"
           FROM ("public"."session_players" "sp"
             JOIN "public"."sessions" "s" ON (("s"."id" = "sp"."session_id")))
          GROUP BY "sp"."player_id", "s"."club_id"
        ), "mvp_wins" AS (
         SELECT "w"."player_id",
            "w"."club_id",
            ("count"(DISTINCT "w"."session_id"))::integer AS "mvp_wins"
           FROM "public"."session_mvp_winners" "w"
          GROUP BY "w"."player_id", "w"."club_id"
        )
 SELECT "p"."id" AS "player_id",
    "p"."club_id",
    COALESCE("a"."appearances", 0) AS "appearances",
    COALESCE("m"."mvp_wins", 0) AS "mvp_wins",
        CASE
            WHEN (COALESCE("a"."appearances", 0) = 0) THEN (0)::numeric
            ELSE "round"(((COALESCE("m"."mvp_wins", 0))::numeric / ("a"."appearances")::numeric), 3)
        END AS "mvp_per_game"
   FROM (("public"."players" "p"
     LEFT JOIN "appearances" "a" ON ((("a"."player_id" = "p"."id") AND ("a"."club_id" = "p"."club_id"))))
     LEFT JOIN "mvp_wins" "m" ON ((("m"."player_id" = "p"."id") AND ("m"."club_id" = "p"."club_id"))));


ALTER VIEW "public"."player_mvp_stats" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."club_mvp_leaderboard" AS
 SELECT "s"."club_id",
    "p"."id" AS "player_id",
    COALESCE("p"."nickname", "p"."first_name", "p"."name") AS "display_name",
    COALESCE("s"."mvp_wins", 0) AS "mvp_wins",
    COALESCE("s"."appearances", 0) AS "appearances",
    COALESCE("s"."mvp_per_game", (0)::numeric) AS "mvp_per_game"
   FROM ("public"."player_mvp_stats" "s"
     JOIN "public"."players" "p" ON (("p"."id" = "s"."player_id")))
  WHERE (COALESCE("s"."mvp_wins", 0) > 0);


ALTER VIEW "public"."club_mvp_leaderboard" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."club_settings" (
    "club_id" "uuid" NOT NULL,
    "use_strength" boolean DEFAULT true NOT NULL,
    "strength_default" smallint DEFAULT 3 NOT NULL,
    "use_categories" boolean DEFAULT true NOT NULL,
    "category_label" "text" DEFAULT 'Kategorie'::"text" NOT NULL,
    "position_label" "text" DEFAULT 'Position'::"text" NOT NULL,
    "attack_label" "text" DEFAULT 'Vorne'::"text" NOT NULL,
    "defense_label" "text" DEFAULT 'Hinten'::"text" NOT NULL,
    "goalkeeper_label" "text" DEFAULT 'Torwart'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "season_start_month" smallint DEFAULT 1 NOT NULL,
    "season_year_mode" "text" DEFAULT 'start_year'::"text" NOT NULL,
    "season_start_day" smallint DEFAULT 1 NOT NULL,
    "season_end_day" smallint DEFAULT 31 NOT NULL,
    "season_end_month" smallint DEFAULT 12 NOT NULL,
    CONSTRAINT "club_settings_season_end_day_check" CHECK ((("season_end_day" >= 1) AND ("season_end_day" <= 31))),
    CONSTRAINT "club_settings_season_end_month_check" CHECK ((("season_end_month" >= 1) AND ("season_end_month" <= 12))),
    CONSTRAINT "club_settings_season_start_day_check" CHECK ((("season_start_day" >= 1) AND ("season_start_day" <= 31))),
    CONSTRAINT "club_settings_season_start_month_check" CHECK ((("season_start_month" >= 1) AND ("season_start_month" <= 12))),
    CONSTRAINT "club_settings_season_year_mode_check" CHECK (("season_year_mode" = ANY (ARRAY['start_year'::"text", 'end_year'::"text"]))),
    CONSTRAINT "club_settings_strength_default_check" CHECK ((("strength_default" >= 1) AND ("strength_default" <= 5)))
);


ALTER TABLE "public"."club_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clubs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "display_name" "text",
    "logo_path" "text",
    "primary_color" "text" DEFAULT 'black'::"text",
    "mvp_voting_enabled" boolean DEFAULT false NOT NULL,
    "is_archived" boolean DEFAULT false NOT NULL,
    "is_test_club" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."clubs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "token" "text" NOT NULL,
    "role" "text" DEFAULT 'member'::"text" NOT NULL,
    "invited_by" "uuid",
    "accepted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT ("now"() + '14 days'::interval) NOT NULL,
    "accepted_at" timestamp with time zone,
    CONSTRAINT "invites_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'member'::"text"])))
);


ALTER TABLE "public"."invites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."penalties" (
    "id" bigint NOT NULL,
    "club_id" "uuid" NOT NULL,
    "player_id" bigint NOT NULL,
    "session_id" bigint,
    "reason" "text",
    "type" "text" DEFAULT 'beer'::"text" NOT NULL,
    "value" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "due_date" "date",
    "resolved_at" timestamp with time zone,
    "notes" "text",
    CONSTRAINT "penalties_type_check" CHECK (("type" = ANY (ARRAY['beer'::"text", 'money'::"text", 'custom'::"text"])))
);


ALTER TABLE "public"."penalties" OWNER TO "postgres";


COMMENT ON TABLE "public"."penalties" IS 'Strafenkatalog / offene Team-Schulden wie Kiste Bier, Geldstrafe oder Custom';



ALTER TABLE "public"."penalties" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."penalties_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."player_badges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "club_id" "uuid" NOT NULL,
    "player_id" bigint NOT NULL,
    "badge_level" "text" NOT NULL,
    "awarded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" bigint,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."player_badges" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."players_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."players_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."players_id_seq" OWNED BY "public"."players"."id";



CREATE TABLE IF NOT EXISTS "public"."results" (
    "id" bigint NOT NULL,
    "session_id" bigint,
    "team_a_id" bigint,
    "team_b_id" bigint,
    "goals_team_a" integer DEFAULT 0,
    "goals_team_b" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "club_id" "uuid" NOT NULL
);


ALTER TABLE "public"."results" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."results_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."results_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."results_id_seq" OWNED BY "public"."results"."id";



CREATE TABLE IF NOT EXISTS "public"."seasons" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "start_date" "date",
    "end_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "club_id" "uuid" NOT NULL
);


ALTER TABLE "public"."seasons" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."seasons_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."seasons_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."seasons_id_seq" OWNED BY "public"."seasons"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."session_mvp_votes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."session_mvp_votes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."session_mvp_votes_id_seq" OWNED BY "public"."session_mvp_votes"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."session_players_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."session_players_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."session_players_id_seq" OWNED BY "public"."session_players"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sessions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sessions_id_seq" OWNED BY "public"."sessions"."id";



CREATE TABLE IF NOT EXISTS "public"."team_players" (
    "id" bigint NOT NULL,
    "team_id" bigint,
    "player_id" bigint
);


ALTER TABLE "public"."team_players" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."team_players_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."team_players_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."team_players_id_seq" OWNED BY "public"."team_players"."id";



CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" bigint NOT NULL,
    "session_id" bigint,
    "name" "text" NOT NULL,
    "club_id" "uuid" NOT NULL
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."teams_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teams_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teams_id_seq" OWNED BY "public"."teams"."id";



CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "club_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "cta_href" "text",
    "cta_label" "text",
    "secondary_cta_href" "text",
    "secondary_cta_label" "text",
    "payload" "jsonb",
    "seen_at" timestamp with time zone,
    "read_at" timestamp with time zone,
    "dedupe_key" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "data" "jsonb"
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


ALTER TABLE "public"."user_notifications" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "user_id" "uuid" NOT NULL,
    "is_power_user" boolean DEFAULT false
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."club_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."club_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."club_feature_flags" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."club_feature_flags_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."club_invites" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."club_invites_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."players" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."players_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."results" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."results_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."seasons" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."seasons_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."session_mvp_votes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."session_mvp_votes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."session_players" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."session_players_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sessions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."team_players" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."team_players_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teams" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teams_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."club_categories"
    ADD CONSTRAINT "club_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."club_categories"
    ADD CONSTRAINT "club_categories_unique_key_per_club" UNIQUE ("club_id", "key");



ALTER TABLE ONLY "public"."club_feature_flags"
    ADD CONSTRAINT "club_feature_flags_club_id_feature_key_key" UNIQUE ("club_id", "feature_key");



ALTER TABLE ONLY "public"."club_feature_flags"
    ADD CONSTRAINT "club_feature_flags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."club_invites"
    ADD CONSTRAINT "club_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."club_invites"
    ADD CONSTRAINT "club_invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."club_memberships"
    ADD CONSTRAINT "club_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."club_settings"
    ADD CONSTRAINT "club_settings_pkey" PRIMARY KEY ("club_id");



ALTER TABLE ONLY "public"."clubs"
    ADD CONSTRAINT "clubs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_token_key" UNIQUE ("token");



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."player_badges"
    ADD CONSTRAINT "player_badges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_mvp_votes"
    ADD CONSTRAINT "session_mvp_votes_one_vote_per_user_per_session" UNIQUE ("session_id", "voter_user_id");



ALTER TABLE ONLY "public"."session_mvp_votes"
    ADD CONSTRAINT "session_mvp_votes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_session_id_player_id_key" UNIQUE ("session_id", "player_id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_team_id_player_id_key" UNIQUE ("team_id", "player_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id");



CREATE INDEX "club_invites_club_id_idx" ON "public"."club_invites" USING "btree" ("club_id");



CREATE INDEX "club_invites_token_idx" ON "public"."club_invites" USING "btree" ("token");



CREATE UNIQUE INDEX "club_memberships_club_id_user_id_key" ON "public"."club_memberships" USING "btree" ("club_id", "user_id");



CREATE UNIQUE INDEX "club_memberships_user_club_unique" ON "public"."club_memberships" USING "btree" ("user_id", "club_id");



CREATE UNIQUE INDEX "club_memberships_user_id_club_id_key" ON "public"."club_memberships" USING "btree" ("user_id", "club_id");



CREATE UNIQUE INDEX "clubs_display_name_unique_ci_idx" ON "public"."clubs" USING "btree" ("lower"(TRIM(BOTH FROM "display_name")));



CREATE INDEX "idx_players_club_id" ON "public"."players" USING "btree" ("club_id");



CREATE INDEX "idx_players_club_id_is_guest" ON "public"."players" USING "btree" ("club_id", "is_guest");



CREATE INDEX "idx_players_club_id_name" ON "public"."players" USING "btree" ("club_id", "name");



CREATE INDEX "idx_results_club_id" ON "public"."results" USING "btree" ("club_id");



CREATE INDEX "idx_seasons_club_id" ON "public"."seasons" USING "btree" ("club_id");



CREATE INDEX "idx_seasons_club_id_start_date" ON "public"."seasons" USING "btree" ("club_id", "start_date" DESC);



CREATE INDEX "idx_sessions_club_id" ON "public"."sessions" USING "btree" ("club_id");



CREATE INDEX "idx_sessions_club_id_date" ON "public"."sessions" USING "btree" ("club_id", "date" DESC);



CREATE INDEX "idx_teams_club_id" ON "public"."teams" USING "btree" ("club_id");



CREATE INDEX "invites_club_id_idx" ON "public"."invites" USING "btree" ("club_id");



CREATE INDEX "invites_token_idx" ON "public"."invites" USING "btree" ("token");



CREATE INDEX "penalties_club_id_idx" ON "public"."penalties" USING "btree" ("club_id");



CREATE INDEX "penalties_open_idx" ON "public"."penalties" USING "btree" ("club_id", "resolved_at");



CREATE INDEX "penalties_player_id_idx" ON "public"."penalties" USING "btree" ("player_id");



CREATE UNIQUE INDEX "player_badges_unique_level" ON "public"."player_badges" USING "btree" ("player_id", "badge_level");



CREATE UNIQUE INDEX "players_club_email_unique_idx" ON "public"."players" USING "btree" ("club_id", "lower"("email")) WHERE (("email" IS NOT NULL) AND ("is_guest" = false));



CREATE UNIQUE INDEX "players_club_user_unique_idx" ON "public"."players" USING "btree" ("club_id", "user_id") WHERE ("is_guest" = false);



CREATE INDEX "session_mvp_votes_club_id_idx" ON "public"."session_mvp_votes" USING "btree" ("club_id");



CREATE INDEX "session_mvp_votes_session_id_idx" ON "public"."session_mvp_votes" USING "btree" ("session_id");



CREATE INDEX "session_mvp_votes_voted_player_id_idx" ON "public"."session_mvp_votes" USING "btree" ("voted_player_id");



CREATE INDEX "sessions_club_id_type_idx" ON "public"."sessions" USING "btree" ("club_id", "type");



CREATE INDEX "user_notifications_club_idx" ON "public"."user_notifications" USING "btree" ("club_id");



CREATE UNIQUE INDEX "user_notifications_dedupe_idx" ON "public"."user_notifications" USING "btree" ("dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE UNIQUE INDEX "user_notifications_dedupe_key_unique" ON "public"."user_notifications" USING "btree" ("dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE UNIQUE INDEX "user_notifications_user_id_dedupe_key_unique" ON "public"."user_notifications" USING "btree" ("user_id", "dedupe_key") WHERE ("dedupe_key" IS NOT NULL);



CREATE INDEX "user_notifications_user_idx" ON "public"."user_notifications" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "trg_club_feature_flags_updated_at" BEFORE UPDATE ON "public"."club_feature_flags" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at_timestamp"();



CREATE OR REPLACE TRIGGER "trg_validate_player_category" BEFORE INSERT OR UPDATE ON "public"."players" FOR EACH ROW EXECUTE FUNCTION "public"."validate_player_category"();



ALTER TABLE ONLY "public"."club_categories"
    ADD CONSTRAINT "club_categories_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_feature_flags"
    ADD CONSTRAINT "club_feature_flags_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_invites"
    ADD CONSTRAINT "club_invites_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_invites"
    ADD CONSTRAINT "club_invites_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."club_invites"
    ADD CONSTRAINT "club_invites_used_by_fkey" FOREIGN KEY ("used_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."club_memberships"
    ADD CONSTRAINT "club_memberships_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_memberships"
    ADD CONSTRAINT "club_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."club_settings"
    ADD CONSTRAINT "club_settings_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_accepted_by_fkey" FOREIGN KEY ("accepted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invites"
    ADD CONSTRAINT "invites_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."penalties"
    ADD CONSTRAINT "penalties_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."player_badges"
    ADD CONSTRAINT "player_badges_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_badges"
    ADD CONSTRAINT "player_badges_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."player_badges"
    ADD CONSTRAINT "player_badges_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."players"
    ADD CONSTRAINT "players_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_team_a_id_fkey" FOREIGN KEY ("team_a_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_team_b_id_fkey" FOREIGN KEY ("team_b_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."seasons"
    ADD CONSTRAINT "seasons_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."session_mvp_votes"
    ADD CONSTRAINT "session_mvp_votes_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_mvp_votes"
    ADD CONSTRAINT "session_mvp_votes_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_mvp_votes"
    ADD CONSTRAINT "session_mvp_votes_voted_player_id_fkey" FOREIGN KEY ("voted_player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_mvp_votes"
    ADD CONSTRAINT "session_mvp_votes_voter_user_id_fkey" FOREIGN KEY ("voter_user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_players"
    ADD CONSTRAINT "session_players_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_mvp_winner_player_id_fkey" FOREIGN KEY ("mvp_winner_player_id") REFERENCES "public"."players"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_players"
    ADD CONSTRAINT "team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "allow all invites" ON "public"."invites" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "allow select invites for authenticated" ON "public"."invites" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."club_feature_flags" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "club_feature_flags_no_delete_authenticated" ON "public"."club_feature_flags" FOR DELETE TO "authenticated" USING (false);



CREATE POLICY "club_feature_flags_no_insert_authenticated" ON "public"."club_feature_flags" FOR INSERT TO "authenticated" WITH CHECK (false);



CREATE POLICY "club_feature_flags_no_update_authenticated" ON "public"."club_feature_flags" FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);



CREATE POLICY "club_feature_flags_select_authenticated" ON "public"."club_feature_flags" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."club_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "club_memberships_insert_own" ON "public"."club_memberships" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "club_memberships_select_own" ON "public"."club_memberships" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "club_memberships_select_own_club" ON "public"."club_memberships" FOR SELECT USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "club_memberships_update_own" ON "public"."club_memberships" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."club_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "club_settings_insert_admin" ON "public"."club_settings" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "club_settings_insert_member" ON "public"."club_settings" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."club_memberships" "cm"
  WHERE (("cm"."club_id" = "club_settings"."club_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "club_settings_select_member" ON "public"."club_settings" FOR SELECT TO "authenticated" USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "club_settings_update_admin" ON "public"."club_settings" FOR UPDATE TO "authenticated" USING ("public"."is_admin_of_club"("club_id")) WITH CHECK ("public"."is_admin_of_club"("club_id"));



ALTER TABLE "public"."clubs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "clubs_insert_authenticated" ON "public"."clubs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "clubs_select_authenticated" ON "public"."clubs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "clubs_select_member" ON "public"."clubs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."club_memberships" "cm"
  WHERE (("cm"."club_id" = "clubs"."id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "clubs_select_own" ON "public"."clubs" FOR SELECT USING ("public"."is_member_of_club"("id"));



CREATE POLICY "clubs_update_members_admin" ON "public"."clubs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."club_memberships" "cm"
  WHERE (("cm"."club_id" = "clubs"."id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."club_memberships" "cm"
  WHERE (("cm"."club_id" = "clubs"."id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = 'admin'::"text")))));



ALTER TABLE "public"."invites" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invites_delete_admin" ON "public"."invites" FOR DELETE TO "authenticated" USING ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "invites_insert_admin" ON "public"."invites" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "invites_select_admin" ON "public"."invites" FOR SELECT TO "authenticated" USING ("public"."is_admin_of_club"("club_id"));



ALTER TABLE "public"."penalties" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "players_delete_admin" ON "public"."players" FOR DELETE USING ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "players_insert_admin" ON "public"."players" FOR INSERT WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "players_insert_own" ON "public"."players" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "players_select_own" ON "public"."players" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "players_select_own_club" ON "public"."players" FOR SELECT USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "players_select_same_club" ON "public"."players" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."club_memberships" "m"
  WHERE (("m"."club_id" = "players"."club_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "players_update_admin" ON "public"."players" FOR UPDATE USING ("public"."is_admin_of_club"("club_id")) WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "players_update_own" ON "public"."players" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "players_update_own_club" ON "public"."players" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."club_memberships" "m"
  WHERE (("m"."user_id" = "auth"."uid"()) AND ("m"."club_id" = "players"."club_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."club_memberships" "m"
  WHERE (("m"."user_id" = "auth"."uid"()) AND ("m"."club_id" = "players"."club_id")))));



CREATE POLICY "players_update_own_profile" ON "public"."players" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "results_delete_admin" ON "public"."results" FOR DELETE USING ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "results_delete_for_club_admins" ON "public"."results" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "results"."session_id") AND "public"."is_admin_of_club"("s"."club_id")))));



CREATE POLICY "results_insert_admin" ON "public"."results" FOR INSERT WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "results_insert_for_club_admins" ON "public"."results" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "results"."session_id") AND "public"."is_admin_of_club"("s"."club_id")))));



CREATE POLICY "results_select_for_club_members" ON "public"."results" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "results"."session_id") AND "public"."is_member_of_club"("s"."club_id")))));



CREATE POLICY "results_select_own_club" ON "public"."results" FOR SELECT USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "results_update_admin" ON "public"."results" FOR UPDATE USING ("public"."is_admin_of_club"("club_id")) WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "results_update_for_club_admins" ON "public"."results" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "results"."session_id") AND "public"."is_admin_of_club"("s"."club_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "results"."session_id") AND "public"."is_admin_of_club"("s"."club_id")))));



ALTER TABLE "public"."seasons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "seasons_delete_admin" ON "public"."seasons" FOR DELETE USING ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "seasons_insert_admin" ON "public"."seasons" FOR INSERT WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "seasons_select_own_club" ON "public"."seasons" FOR SELECT USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "seasons_update_admin" ON "public"."seasons" FOR UPDATE USING ("public"."is_admin_of_club"("club_id")) WITH CHECK ("public"."is_admin_of_club"("club_id"));



ALTER TABLE "public"."session_mvp_votes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_mvp_votes_delete_admin" ON "public"."session_mvp_votes" FOR DELETE USING ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "session_mvp_votes_insert_member" ON "public"."session_mvp_votes" FOR INSERT WITH CHECK (("public"."is_member_of_club"("club_id") AND ("voter_user_id" = "auth"."uid"())));



CREATE POLICY "session_mvp_votes_select_member" ON "public"."session_mvp_votes" FOR SELECT USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "session_mvp_votes_update_own" ON "public"."session_mvp_votes" FOR UPDATE USING (("public"."is_member_of_club"("club_id") AND ("voter_user_id" = "auth"."uid"()))) WITH CHECK (("public"."is_member_of_club"("club_id") AND ("voter_user_id" = "auth"."uid"())));



ALTER TABLE "public"."session_players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_players_delete_admin" ON "public"."session_players" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_players"."session_id") AND "public"."is_admin_of_club"("s"."club_id")))));



CREATE POLICY "session_players_insert_admin" ON "public"."session_players" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_players"."session_id") AND "public"."is_admin_of_club"("s"."club_id")))));



CREATE POLICY "session_players_select_own_club" ON "public"."session_players" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."sessions" "s"
  WHERE (("s"."id" = "session_players"."session_id") AND "public"."is_member_of_club"("s"."club_id")))));



ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sessions_delete_admin" ON "public"."sessions" FOR DELETE USING ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "sessions_insert_member" ON "public"."sessions" FOR INSERT WITH CHECK ("public"."is_member_of_club"("club_id"));



CREATE POLICY "sessions_select_own_club" ON "public"."sessions" FOR SELECT USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "sessions_update_member" ON "public"."sessions" FOR UPDATE USING ("public"."is_member_of_club"("club_id")) WITH CHECK ("public"."is_member_of_club"("club_id"));



ALTER TABLE "public"."team_players" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "team_players_delete_admin" ON "public"."team_players" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_admin_of_club"("t"."club_id")))));



CREATE POLICY "team_players_delete_for_club_admins" ON "public"."team_players" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."sessions" "s" ON (("s"."id" = "t"."session_id")))
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_admin_of_club"("s"."club_id")))));



CREATE POLICY "team_players_insert_admin" ON "public"."team_players" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_admin_of_club"("t"."club_id")))));



CREATE POLICY "team_players_insert_for_club_admins" ON "public"."team_players" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."sessions" "s" ON (("s"."id" = "t"."session_id")))
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_admin_of_club"("s"."club_id")))));



CREATE POLICY "team_players_select_for_club_members" ON "public"."team_players" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."sessions" "s" ON (("s"."id" = "t"."session_id")))
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_member_of_club"("s"."club_id")))));



CREATE POLICY "team_players_select_own_club" ON "public"."team_players" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_member_of_club"("t"."club_id")))));



CREATE POLICY "team_players_update_for_club_admins" ON "public"."team_players" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."sessions" "s" ON (("s"."id" = "t"."session_id")))
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_admin_of_club"("s"."club_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."sessions" "s" ON (("s"."id" = "t"."session_id")))
  WHERE (("t"."id" = "team_players"."team_id") AND "public"."is_admin_of_club"("s"."club_id")))));



ALTER TABLE "public"."teams" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "teams_delete_admin" ON "public"."teams" FOR DELETE USING ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "teams_delete_for_club_admins" ON "public"."teams" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."club_memberships" "cm" ON (("cm"."club_id" = "s"."club_id")))
  WHERE (("s"."id" = "teams"."session_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "teams_insert_admin" ON "public"."teams" FOR INSERT WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "teams_insert_for_club_admins" ON "public"."teams" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."club_memberships" "cm" ON (("cm"."club_id" = "s"."club_id")))
  WHERE (("s"."id" = "teams"."session_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "teams_select_for_club_members" ON "public"."teams" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."club_memberships" "cm" ON (("cm"."club_id" = "s"."club_id")))
  WHERE (("s"."id" = "teams"."session_id") AND ("cm"."user_id" = "auth"."uid"())))));



CREATE POLICY "teams_select_own_club" ON "public"."teams" FOR SELECT USING ("public"."is_member_of_club"("club_id"));



CREATE POLICY "teams_update_admin" ON "public"."teams" FOR UPDATE USING ("public"."is_admin_of_club"("club_id")) WITH CHECK ("public"."is_admin_of_club"("club_id"));



CREATE POLICY "teams_update_for_club_admins" ON "public"."teams" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."club_memberships" "cm" ON (("cm"."club_id" = "s"."club_id")))
  WHERE (("s"."id" = "teams"."session_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."sessions" "s"
     JOIN "public"."club_memberships" "cm" ON (("cm"."club_id" = "s"."club_id")))
  WHERE (("s"."id" = "teams"."session_id") AND ("cm"."user_id" = "auth"."uid"()) AND ("cm"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_notifications_insert_own_or_service" ON "public"."user_notifications" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "user_notifications_select_own" ON "public"."user_notifications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_notifications_update_own" ON "public"."user_notifications" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON TABLE "public"."club_memberships" TO "anon";
GRANT ALL ON TABLE "public"."club_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."club_memberships" TO "service_role";



GRANT ALL ON FUNCTION "public"."accept_club_invite"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_club_invite"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_club_invite"("p_token" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."accept_club_invite"("p_token" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."accept_club_invite"("p_token" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_club_invite"("p_token" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_club_invite"("p_token" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_link_member_player"("target_user_id" "uuid", "target_player_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_link_member_player"("target_user_id" "uuid", "target_player_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."admin_link_member_player"("target_user_id" "uuid", "target_player_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_link_member_player"("target_user_id" "uuid", "target_player_id" bigint) TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_remove_member"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_remove_member"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_remove_member"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_remove_member"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_remove_member"("target_user_id" "uuid", "target_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_remove_member"("target_user_id" "uuid", "target_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_remove_member"("target_user_id" "uuid", "target_club_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text", "target_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text", "target_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_update_member_role"("target_user_id" "uuid", "new_role" "text", "target_club_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."players" TO "anon";
GRANT ALL ON TABLE "public"."players" TO "authenticated";
GRANT ALL ON TABLE "public"."players" TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_my_onboarding"("p_first_name" "text", "p_last_name" "text", "p_nickname" "text", "p_category_key" "text", "p_preferred_position" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_my_onboarding"("p_first_name" "text", "p_last_name" "text", "p_nickname" "text", "p_category_key" "text", "p_preferred_position" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."complete_my_onboarding"("p_first_name" "text", "p_last_name" "text", "p_nickname" "text", "p_category_key" "text", "p_preferred_position" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_my_onboarding"("p_first_name" "text", "p_last_name" "text", "p_nickname" "text", "p_category_key" "text", "p_preferred_position" "text") TO "service_role";



GRANT ALL ON TABLE "public"."club_invites" TO "anon";
GRANT ALL ON TABLE "public"."club_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."club_invites" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_club_invite"("p_role" "text", "p_expires_in_days" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_club_invite"("p_role" "text", "p_expires_in_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_club_invite"("p_role" "text", "p_expires_in_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_club_invite"("p_role" "text", "p_expires_in_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."finalize_mvp_voting_for_session"("p_session_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."finalize_mvp_voting_for_session"("p_session_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."finalize_mvp_voting_for_session"("p_session_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_badge_level"("mvp_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_badge_level"("mvp_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_badge_level"("mvp_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_club_members_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_club_members_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_club_members_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_invite_public"("p_token" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_invite_public"("p_token" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_invite_public"("p_token" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_invite_public"("p_token" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_membership"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_membership"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_membership"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_players_public"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_players_public"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_players_public"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin_of_club"("check_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin_of_club"("check_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin_of_club"("check_club_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_member_of_club"("check_club_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_member_of_club"("check_club_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_member_of_club"("check_club_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_existing_player_by_email"("p_user_id" "uuid", "p_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."link_existing_player_by_email"("p_user_id" "uuid", "p_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_existing_player_by_email"("p_user_id" "uuid", "p_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."link_player_on_auth_user_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."link_player_on_auth_user_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."link_player_on_auth_user_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_player_category"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_player_category"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_player_category"() TO "service_role";


















GRANT ALL ON TABLE "public"."club_categories" TO "anon";
GRANT ALL ON TABLE "public"."club_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."club_categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."club_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."club_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."club_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."club_feature_flags" TO "anon";
GRANT ALL ON TABLE "public"."club_feature_flags" TO "authenticated";
GRANT ALL ON TABLE "public"."club_feature_flags" TO "service_role";



GRANT ALL ON SEQUENCE "public"."club_feature_flags_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."club_feature_flags_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."club_feature_flags_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."club_invites_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."club_invites_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."club_invites_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."session_mvp_votes" TO "anon";
GRANT ALL ON TABLE "public"."session_mvp_votes" TO "authenticated";
GRANT ALL ON TABLE "public"."session_mvp_votes" TO "service_role";



GRANT ALL ON TABLE "public"."session_mvp_vote_totals" TO "anon";
GRANT ALL ON TABLE "public"."session_mvp_vote_totals" TO "authenticated";
GRANT ALL ON TABLE "public"."session_mvp_vote_totals" TO "service_role";



GRANT ALL ON TABLE "public"."session_mvp_winners" TO "anon";
GRANT ALL ON TABLE "public"."session_mvp_winners" TO "authenticated";
GRANT ALL ON TABLE "public"."session_mvp_winners" TO "service_role";



GRANT ALL ON TABLE "public"."session_players" TO "anon";
GRANT ALL ON TABLE "public"."session_players" TO "authenticated";
GRANT ALL ON TABLE "public"."session_players" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."player_mvp_stats" TO "anon";
GRANT ALL ON TABLE "public"."player_mvp_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."player_mvp_stats" TO "service_role";



GRANT ALL ON TABLE "public"."club_mvp_leaderboard" TO "anon";
GRANT ALL ON TABLE "public"."club_mvp_leaderboard" TO "authenticated";
GRANT ALL ON TABLE "public"."club_mvp_leaderboard" TO "service_role";



GRANT ALL ON TABLE "public"."club_settings" TO "anon";
GRANT ALL ON TABLE "public"."club_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."club_settings" TO "service_role";



GRANT ALL ON TABLE "public"."clubs" TO "anon";
GRANT ALL ON TABLE "public"."clubs" TO "authenticated";
GRANT ALL ON TABLE "public"."clubs" TO "service_role";



GRANT ALL ON TABLE "public"."invites" TO "anon";
GRANT ALL ON TABLE "public"."invites" TO "authenticated";
GRANT ALL ON TABLE "public"."invites" TO "service_role";



GRANT ALL ON TABLE "public"."penalties" TO "anon";
GRANT ALL ON TABLE "public"."penalties" TO "authenticated";
GRANT ALL ON TABLE "public"."penalties" TO "service_role";



GRANT ALL ON SEQUENCE "public"."penalties_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."penalties_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."penalties_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."player_badges" TO "anon";
GRANT ALL ON TABLE "public"."player_badges" TO "authenticated";
GRANT ALL ON TABLE "public"."player_badges" TO "service_role";



GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."results" TO "anon";
GRANT ALL ON TABLE "public"."results" TO "authenticated";
GRANT ALL ON TABLE "public"."results" TO "service_role";



GRANT ALL ON SEQUENCE "public"."results_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."results_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."results_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."seasons" TO "anon";
GRANT ALL ON TABLE "public"."seasons" TO "authenticated";
GRANT ALL ON TABLE "public"."seasons" TO "service_role";



GRANT ALL ON SEQUENCE "public"."seasons_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."seasons_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."seasons_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."session_mvp_votes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."session_mvp_votes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."session_mvp_votes_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."session_players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."session_players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."session_players_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sessions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."team_players" TO "anon";
GRANT ALL ON TABLE "public"."team_players" TO "authenticated";
GRANT ALL ON TABLE "public"."team_players" TO "service_role";



GRANT ALL ON SEQUENCE "public"."team_players_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."team_players_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."team_players_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teams_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER trg_link_player_on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.link_player_on_auth_user_created();


  create policy "session_photos_delete_authenticated"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using ((bucket_id = 'session-photos'::text));



  create policy "session_photos_insert_authenticated"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'session-photos'::text));



  create policy "session_photos_select_authenticated"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using ((bucket_id = 'session-photos'::text));



  create policy "session_photos_update_authenticated"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using ((bucket_id = 'session-photos'::text))
with check ((bucket_id = 'session-photos'::text));



