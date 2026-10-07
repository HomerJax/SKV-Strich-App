import { NextRequest, NextResponse } from "next/server";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { canManageClub } from "@/lib/auth/access";
import {
  buildRoundRobinSchedule,
  calculateTournamentStandings,
  hasUniqueTournamentWinner,
  type TournamentMatch,
  type TournamentTeam,
} from "@/lib/tournament";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionTournamentRow = {
  session_mode: string | null;
  tournament_team_count: number | null;
  tournament_match_minutes: number | null;
  tournament_winner_team_id: number | null;
  tournament_completed_at: string | null;
};

type TeamRow = { id: number; name: string };
type TeamPlayerRow = { team_id: number; player_id: number };
type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  strength: number | null;
  preferred_position: string | null;
};

function playerLabel(player: PlayerRow) {
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;
  const fullName = [player.first_name?.trim(), player.last_name?.trim()].filter(Boolean).join(" ");
  return fullName || player.name?.trim() || `#${player.id}`;
}

function parseIntSafe(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function canManage(access: Awaited<ReturnType<typeof requireSessionAccess>>) {
  if ("error" in access) return false;
  return canManageClub({ isPowerUser: access.isPowerUser, role: access.membership.role });
}

async function loadTournament(access: Exclude<Awaited<ReturnType<typeof requireSessionAccess>>, { error: string }>, sessionId: number) {
  const { adminSupabase, clubId } = access;

  const [
    { data: sessionConfig, error: sessionConfigError },
    { data: teamsData, error: teamsError },
    { data: matchesData, error: matchesError },
  ] = await Promise.all([
    adminSupabase
      .from("sessions")
      .select("session_mode,tournament_team_count,tournament_match_minutes,tournament_winner_team_id,tournament_completed_at")
      .eq("id", sessionId)
      .eq("club_id", clubId)
      .single<SessionTournamentRow>(),
    adminSupabase
      .from("teams")
      .select("id,name")
      .eq("session_id", sessionId)
      .eq("club_id", clubId)
      .order("id", { ascending: true }),
    adminSupabase
      .from("tournament_matches")
      .select("id,game_no,team_a_id,team_b_id,goals_team_a,goals_team_b")
      .eq("session_id", sessionId)
      .eq("club_id", clubId)
      .order("game_no", { ascending: true }),
  ]);

  if (sessionConfigError) throw new Error(sessionConfigError.message);
  if (teamsError) throw new Error(teamsError.message);
  if (matchesError) throw new Error(matchesError.message);

  const teams = (teamsData ?? []) as TeamRow[];
  const teamIds = teams.map((team) => team.id);

  const { data: teamPlayersData, error: teamPlayersError } = teamIds.length
    ? await adminSupabase
        .from("team_players")
        .select("team_id,player_id")
        .in("team_id", teamIds)
    : { data: [] as TeamPlayerRow[], error: null };

  if (teamPlayersError) throw new Error(teamPlayersError.message);

  const playerIds = Array.from(
    new Set(((teamPlayersData ?? []) as TeamPlayerRow[]).map((row) => row.player_id)),
  );

  const { data: playersData, error: playersError } = playerIds.length
    ? await adminSupabase
        .from("players")
        .select("id,name,first_name,last_name,nickname,strength,preferred_position")
        .eq("club_id", clubId)
        .in("id", playerIds)
    : { data: [] as PlayerRow[], error: null };

  if (playersError) throw new Error(playersError.message);

  const playerById = new Map(((playersData ?? []) as PlayerRow[]).map((player) => [player.id, player]));
  const membersByTeam = new Map<number, Array<{ id: number; name: string; strength: number | null; preferredPosition: string | null }>>();

  for (const row of (teamPlayersData ?? []) as TeamPlayerRow[]) {
    const player = playerById.get(row.player_id);
    if (!player) continue;
    const list = membersByTeam.get(row.team_id) ?? [];
    list.push({
      id: player.id,
      name: playerLabel(player),
      strength: player.strength,
      preferredPosition: player.preferred_position,
    });
    membersByTeam.set(row.team_id, list);
  }

  const tournamentTeams = teams.map((team) => ({
    id: team.id,
    name: team.name,
    players: (membersByTeam.get(team.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, "de")),
  }));

  const matches = (matchesData ?? []) as TournamentMatch[];
  const standings = calculateTournamentStandings(teams as TournamentTeam[], matches);

  return {
    config: sessionConfig,
    teams: tournamentTeams,
    matches,
    standings,
  };
}

async function replaceTournamentTeams(
  access: Exclude<Awaited<ReturnType<typeof requireSessionAccess>>, { error: string }>,
  sessionId: number,
  teamCount: number,
  rounds: number,
) {
  const { adminSupabase, clubId } = access;

  const { data: presentData, error: presentError } = await adminSupabase
    .from("session_players")
    .select("player_id")
    .eq("session_id", sessionId);

  if (presentError) throw new Error(presentError.message);

  const presentIds = (presentData ?? [])
    .map((row) => Number(row.player_id))
    .filter((id) => Number.isFinite(id));

  if (presentIds.length < teamCount * 2) {
    throw new Error(`Für ${teamCount} Teams sollten mindestens ${teamCount * 2} Spieler anwesend sein.`);
  }

  const { data: playersData, error: playersError } = await adminSupabase
    .from("players")
    .select("id,name,first_name,last_name,nickname,strength,preferred_position")
    .eq("club_id", clubId)
    .in("id", presentIds);

  if (playersError) throw new Error(playersError.message);

  const players = ((playersData ?? []) as PlayerRow[]).sort((a, b) => {
    const sa = a.strength ?? 3;
    const sb = b.strength ?? 3;
    if (sb !== sa) return sb - sa;
    return playerLabel(a).localeCompare(playerLabel(b), "de");
  });

  const { data: oldTeamsData, error: oldTeamsError } = await adminSupabase
    .from("teams")
    .select("id")
    .eq("session_id", sessionId)
    .eq("club_id", clubId);

  if (oldTeamsError) throw new Error(oldTeamsError.message);
  const oldTeamIds = (oldTeamsData ?? []).map((team) => Number(team.id)).filter(Number.isFinite);

  if (oldTeamIds.length) {
    const { error: deleteAssignmentsError } = await adminSupabase
      .from("team_players")
      .delete()
      .in("team_id", oldTeamIds);
    if (deleteAssignmentsError) throw new Error(deleteAssignmentsError.message);

    const { error: deleteTeamsError } = await adminSupabase
      .from("teams")
      .delete()
      .in("id", oldTeamIds);
    if (deleteTeamsError) throw new Error(deleteTeamsError.message);
  }

  const { data: createdTeamsData, error: createdTeamsError } = await adminSupabase
    .from("teams")
    .insert(
      Array.from({ length: teamCount }, (_, index) => ({
        session_id: sessionId,
        club_id: clubId,
        name: `Team ${index + 1}`,
      })),
    )
    .select("id,name");

  if (createdTeamsError) throw new Error(createdTeamsError.message);
  const createdTeams = (createdTeamsData ?? []) as TeamRow[];

  const buckets = createdTeams.map((team) => ({
    team,
    players: [] as PlayerRow[],
    strength: 0,
    keepers: 0,
  }));

  for (const player of players) {
    const sortedBuckets = [...buckets].sort((a, b) => {
      const countDiff = a.players.length - b.players.length;
      if (countDiff !== 0) return countDiff;
      const strengthDiff = a.strength - b.strength;
      if (strengthDiff !== 0) return strengthDiff;
      if (player.preferred_position === "goalkeeper") {
        const keeperDiff = a.keepers - b.keepers;
        if (keeperDiff !== 0) return keeperDiff;
      }
      return a.team.id - b.team.id;
    });

    const target = sortedBuckets[0];
    target.players.push(player);
    target.strength += player.strength ?? 3;
    if (player.preferred_position === "goalkeeper") target.keepers += 1;
  }

  const assignments = buckets.flatMap((bucket) =>
    bucket.players.map((player) => ({
      team_id: bucket.team.id,
      player_id: player.id,
    })),
  );

  const { error: assignmentError } = await adminSupabase
    .from("team_players")
    .insert(assignments);

  if (assignmentError) throw new Error(assignmentError.message);

  const fixtures = buildRoundRobinSchedule(createdTeams.map((team) => team.id), rounds);
  if (fixtures.length) {
    const { error: fixtureError } = await adminSupabase
      .from("tournament_matches")
      .insert(
        fixtures.map((fixture) => ({
          ...fixture,
          club_id: clubId,
          session_id: sessionId,
          goals_team_a: null,
          goals_team_b: null,
        })),
      );
    if (fixtureError) throw new Error(fixtureError.message);
  }
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "Ungültige Session." }, { status: 400 });
  }

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const tournament = await loadTournament(access, sessionId);
    return NextResponse.json({ ok: true, ...tournament });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turnier konnte nicht geladen werden." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const sessionId = Number(id);
  if (!Number.isFinite(sessionId)) {
    return NextResponse.json({ error: "Ungültige Session." }, { status: 400 });
  }

  const access = await requireSessionAccess(sessionId);
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  if (!canManage(access)) {
    return NextResponse.json({ error: "Nur Admins können den Turniermodus verwalten." }, { status: 403 });
  }

  if (access.session.type === "event") {
    return NextResponse.json({ error: "Der Turniermodus ist nur für Trainings verfügbar." }, { status: 400 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const intent = String(payload.intent ?? "");

  try {
    if (intent === "setup" || intent === "regenerate") {
      const teamCount = Math.max(2, Math.min(6, parseIntSafe(payload.teamCount, 3)));
      const matchMinutes = Math.max(1, Math.min(60, parseIntSafe(payload.matchMinutes, 8)));
      const rounds = Math.max(1, Math.min(12, parseIntSafe(payload.rounds, 2)));

      const { data: existingResults, error: existingResultsError } = await access.adminSupabase
        .from("results")
        .select("id")
        .eq("session_id", sessionId)
        .limit(1);

      if (existingResultsError) throw new Error(existingResultsError.message);
      if ((existingResults ?? []).length > 0) {
        return NextResponse.json(
          { error: "Für diese Session ist bereits ein Ergebnis gespeichert. Vor dem Wechsel bitte das Ergebnis löschen." },
          { status: 409 },
        );
      }

      const { error: clearMatchesError } = await access.adminSupabase
        .from("tournament_matches")
        .delete()
        .eq("session_id", sessionId)
        .eq("club_id", access.clubId);

      if (clearMatchesError) throw new Error(clearMatchesError.message);

      await replaceTournamentTeams(access, sessionId, teamCount, rounds);

      const { error: sessionUpdateError } = await access.adminSupabase
        .from("sessions")
        .update({
          session_mode: "tournament",
          tournament_team_count: teamCount,
          tournament_match_minutes: matchMinutes,
          tournament_winner_team_id: null,
          tournament_completed_at: null,
          winner_photo_path: null,
        })
        .eq("id", sessionId)
        .eq("club_id", access.clubId);

      if (sessionUpdateError) throw new Error(sessionUpdateError.message);

      const tournament = await loadTournament(access, sessionId);
      return NextResponse.json({ ok: true, message: "Turnier wurde vorbereitet.", ...tournament });
    }

    if (intent === "save_match") {
      const gameNo = parseIntSafe(payload.gameNo, 0);
      const goalsA = parseIntSafe(payload.goalsA, -1);
      const goalsB = parseIntSafe(payload.goalsB, -1);

      if (gameNo < 1 || goalsA < 0 || goalsB < 0) {
        return NextResponse.json({ error: "Bitte ein gültiges Ergebnis eingeben." }, { status: 400 });
      }

      const { data: config, error: configError } = await access.adminSupabase
        .from("sessions")
        .select("session_mode,tournament_completed_at")
        .eq("id", sessionId)
        .eq("club_id", access.clubId)
        .single<{ session_mode: string | null; tournament_completed_at: string | null }>();

      if (configError) throw new Error(configError.message);
      if (config.session_mode !== "tournament") {
        return NextResponse.json({ error: "Diese Session ist nicht im Turniermodus." }, { status: 409 });
      }
      if (config.tournament_completed_at) {
        return NextResponse.json({ error: "Das Turnier ist bereits abgeschlossen." }, { status: 409 });
      }

      const { error: matchUpdateError } = await access.adminSupabase
        .from("tournament_matches")
        .update({
          goals_team_a: goalsA,
          goals_team_b: goalsB,
          updated_at: new Date().toISOString(),
        })
        .eq("session_id", sessionId)
        .eq("club_id", access.clubId)
        .eq("game_no", gameNo);

      if (matchUpdateError) throw new Error(matchUpdateError.message);

      const tournament = await loadTournament(access, sessionId);
      return NextResponse.json({ ok: true, message: `Spiel ${gameNo} gespeichert.`, ...tournament });
    }

    if (intent === "finalize") {
      const tournament = await loadTournament(access, sessionId);
      const incomplete = tournament.matches.some(
        (match) => match.goals_team_a == null || match.goals_team_b == null,
      );

      if (incomplete || tournament.matches.length === 0) {
        return NextResponse.json({ error: "Bitte zuerst alle Turnierspiele abschließen." }, { status: 409 });
      }

      if (!hasUniqueTournamentWinner(tournament.standings)) {
        return NextResponse.json(
          { error: "Noch kein eindeutiger Turniersieger. Punkte, Tordifferenz und erzielte Tore sind gleich." },
          { status: 409 },
        );
      }

      const winner = tournament.standings[0];
      const runnerUp = tournament.standings[1];

      const { error: deleteResultError } = await access.adminSupabase
        .from("results")
        .delete()
        .eq("session_id", sessionId);
      if (deleteResultError) throw new Error(deleteResultError.message);

      const { error: resultError } = await access.adminSupabase
        .from("results")
        .insert({
          session_id: sessionId,
          club_id: access.clubId,
          game_no: 1,
          team_a_id: winner.teamId,
          team_b_id: runnerUp.teamId,
          goals_team_a: 1,
          goals_team_b: 0,
        });
      if (resultError) throw new Error(resultError.message);

      const { error: finalizeError } = await access.adminSupabase
        .from("sessions")
        .update({
          tournament_winner_team_id: winner.teamId,
          tournament_completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("club_id", access.clubId);
      if (finalizeError) throw new Error(finalizeError.message);

      const finalized = await loadTournament(access, sessionId);
      return NextResponse.json({
        ok: true,
        message: `${winner.teamName} gewinnt das Turnier. Für die Karriere zählt genau ein Session-Sieg.`,
        ...finalized,
      });
    }

    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Turnier-Aktion fehlgeschlagen." },
      { status: 500 },
    );
  }
}
