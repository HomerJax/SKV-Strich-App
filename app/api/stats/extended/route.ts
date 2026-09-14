import { NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type Scope = "season" | "career";

type TeamRow = { id: number; session_id: number };
type TeamPlayerRow = { team_id: number; player_id: number };
type SessionRow = { id: number; date: string; season_id: number | null };
type ResultRow = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};
type PlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
};
type SeasonRow = {
  id: number;
  start_date: string | null;
  end_date: string | null;
};

type TeammateStats = {
  playerId: number;
  name: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
};

function getTodayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentSeason(seasons: SeasonRow[]) {
  const today = getTodayIsoDate();
  return (
    seasons.find(
      (season) =>
        season.start_date &&
        season.end_date &&
        today >= season.start_date &&
        today <= season.end_date
    ) ??
    seasons[0] ??
    null
  );
}

function displayName(player: PlayerRow) {
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;

  const firstName = player.first_name?.trim();
  const lastName = player.last_name?.trim();
  const combined = [firstName, lastName].filter(Boolean).join(" ");
  return combined || player.name?.trim() || `Spieler ${player.id}`;
}

function getOutcome(result: ResultRow, myTeamId: number) {
  const isA = result.team_a_id === myTeamId;
  const goalsA = result.goals_team_a ?? 0;
  const goalsB = result.goals_team_b ?? 0;

  if (goalsA === goalsB) return "draw" as const;
  if ((isA && goalsA > goalsB) || (!isA && goalsB > goalsA)) return "win" as const;
  return "loss" as const;
}

function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return monthKey;

  return new Intl.DateTimeFormat("de-DE", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export async function GET(request: Request) {
  const { clubId, player } = await requireClub();
  const supabase = await createClient();

  if (!player) {
    return NextResponse.json({ enabled: false });
  }

  const { searchParams } = new URL(request.url);
  const scope: Scope = searchParams.get("scope") === "career" ? "career" : "season";

  const [
    { data: playerTeamRows, error: playerTeamError },
    { data: seasonsData, error: seasonsError },
  ] = await Promise.all([
    supabase.from("team_players").select("team_id").eq("player_id", player.id),
    supabase
      .from("seasons")
      .select("id, start_date, end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
  ]);

  if (playerTeamError) {
    return NextResponse.json({ error: playerTeamError.message }, { status: 500 });
  }
  if (seasonsError) {
    return NextResponse.json({ error: seasonsError.message }, { status: 500 });
  }

  const teamIds = Array.from(
    new Set(
      (playerTeamRows ?? [])
        .map((row) => Number(row.team_id))
        .filter(Number.isFinite)
    )
  );

  if (teamIds.length === 0) {
    return NextResponse.json({ enabled: true, bestMonth: null, teammates: null });
  }

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("id, session_id")
    .in("id", teamIds);

  if (teamsError) {
    return NextResponse.json({ error: teamsError.message }, { status: 500 });
  }

  const teams = (teamsData ?? []) as TeamRow[];
  const sessionIds = Array.from(new Set(teams.map((team) => team.session_id)));

  if (sessionIds.length === 0) {
    return NextResponse.json({ enabled: true, bestMonth: null, teammates: null });
  }

  const { data: sessionsData, error: sessionsError } = await supabase
    .from("sessions")
    .select("id, date, season_id")
    .eq("club_id", clubId)
    .in("id", sessionIds);

  if (sessionsError) {
    return NextResponse.json({ error: sessionsError.message }, { status: 500 });
  }

  const seasons = (seasonsData ?? []) as SeasonRow[];
  const currentSeason = getCurrentSeason(seasons);
  const allSessions = (sessionsData ?? []) as SessionRow[];
  const scopedSessions =
    scope === "career"
      ? allSessions
      : currentSeason
        ? allSessions.filter((session) => session.season_id === currentSeason.id)
        : [];

  const scopedSessionIds = new Set(scopedSessions.map((session) => session.id));
  const scopedTeams = teams.filter((team) => scopedSessionIds.has(team.session_id));
  const scopedTeamIds = scopedTeams.map((team) => team.id);

  if (scopedTeamIds.length === 0) {
    return NextResponse.json({ enabled: true, bestMonth: null, teammates: null });
  }

  const [
    { data: teammateRowsData, error: teammateRowsError },
    { data: resultsData, error: resultsError },
  ] = await Promise.all([
    supabase
      .from("team_players")
      .select("team_id, player_id")
      .in("team_id", scopedTeamIds),
    supabase
      .from("results")
      .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
      .eq("club_id", clubId)
      .in("session_id", Array.from(scopedSessionIds)),
  ]);

  if (teammateRowsError) {
    return NextResponse.json({ error: teammateRowsError.message }, { status: 500 });
  }
  if (resultsError) {
    return NextResponse.json({ error: resultsError.message }, { status: 500 });
  }

  const teammateRows = (teammateRowsData ?? []) as TeamPlayerRow[];
  const teammateIds = Array.from(
    new Set(
      teammateRows
        .map((row) => row.player_id)
        .filter((id) => id !== player.id && Number.isFinite(id))
    )
  );

  const { data: playersData, error: playersError } = teammateIds.length
    ? await supabase
        .from("players")
        .select("id, name, first_name, last_name, nickname")
        .eq("club_id", clubId)
        .in("id", teammateIds)
    : { data: [] as PlayerRow[], error: null };

  if (playersError) {
    return NextResponse.json({ error: playersError.message }, { status: 500 });
  }

  const playerNameById = new Map<number, string>(
    ((playersData ?? []) as PlayerRow[]).map((row) => [row.id, displayName(row)])
  );
  const sessionById = new Map(scopedSessions.map((session) => [session.id, session]));
  const myTeamBySession = new Map<number, number>();
  for (const team of scopedTeams) {
    myTeamBySession.set(team.session_id, team.id);
  }

  const teammateStats = new Map<number, TeammateStats>();
  for (const row of teammateRows) {
    if (row.player_id === player.id) continue;

    const entry = teammateStats.get(row.player_id) ?? {
      playerId: row.player_id,
      name: playerNameById.get(row.player_id) ?? `Spieler ${row.player_id}`,
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
    };
    entry.games += 1;
    teammateStats.set(row.player_id, entry);
  }

  const monthStats = new Map<
    string,
    { month: string; wins: number; losses: number; draws: number; games: number }
  >();

  for (const result of (resultsData ?? []) as ResultRow[]) {
    const myTeamId = myTeamBySession.get(result.session_id);
    if (!myTeamId) continue;
    if (result.team_a_id !== myTeamId && result.team_b_id !== myTeamId) continue;

    const outcome = getOutcome(result, myTeamId);
    const session = sessionById.get(result.session_id);
    const monthKey = session?.date?.slice(0, 7);

    if (monthKey) {
      const month = monthStats.get(monthKey) ?? {
        month: monthKey,
        wins: 0,
        losses: 0,
        draws: 0,
        games: 0,
      };
      month.games += 1;
      if (outcome === "win") month.wins += 1;
      if (outcome === "loss") month.losses += 1;
      if (outcome === "draw") month.draws += 1;
      monthStats.set(monthKey, month);
    }

    const teammatesOnTeam = teammateRows
      .filter((row) => row.team_id === myTeamId && row.player_id !== player.id)
      .map((row) => row.player_id);

    for (const teammateId of teammatesOnTeam) {
      const entry = teammateStats.get(teammateId);
      if (!entry) continue;
      if (outcome === "win") entry.wins += 1;
      if (outcome === "loss") entry.losses += 1;
      if (outcome === "draw") entry.draws += 1;
    }
  }

  const months = Array.from(monthStats.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aRate = a.games > 0 ? a.wins / a.games : 0;
    const bRate = b.games > 0 ? b.wins / b.games : 0;
    if (bRate !== aRate) return bRate - aRate;
    if (b.games !== a.games) return b.games - a.games;
    return b.month.localeCompare(a.month);
  });

  const bestMonthRaw = months[0] ?? null;
  const bestMonth = bestMonthRaw
    ? {
        label: monthLabel(bestMonthRaw.month),
        wins: bestMonthRaw.wins,
        losses: bestMonthRaw.losses,
        draws: bestMonthRaw.draws,
        games: bestMonthRaw.games,
      }
    : null;

  const teammateList = Array.from(teammateStats.values());
  const mostPlayed = [...teammateList].sort(
    (a, b) => b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name)
  )[0] ?? null;
  const mostWins = [...teammateList].sort(
    (a, b) => b.wins - a.wins || b.games - a.games || a.name.localeCompare(b.name)
  )[0] ?? null;
  const mostLosses = [...teammateList].sort(
    (a, b) => b.losses - a.losses || b.games - a.games || a.name.localeCompare(b.name)
  )[0] ?? null;

  return NextResponse.json({
    enabled: true,
    bestMonth,
    teammates: {
      mostPlayed,
      mostWins,
      mostLosses,
    },
  });
}
