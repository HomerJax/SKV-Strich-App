import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import { addRanks } from "@/app/standings/standings-ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date?: string | null;
};

type Session = {
  id: number;
  date: string;
  season_id: number | null;
  mvp_voting_finalized_at: string | null;
};

type StandingRow = {
  player_id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  wins: number;
  sessions: number;
  mvps: number;
  currentWinStreak: number;
  currentLossStreak: number;
  currentAttendanceStreak: number;
};

type RankRow = StandingRow & {
  rank: number;
  deltaRank?: number | null;
};

type SessionPlayerRow = {
  session_id: number;
  player_id: number;
};

type PlayerStandingSourceRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  is_guest: boolean | null;
};

type ResultSourceRow = {
  session_id: number;
  goals_team_a: number | null;
  goals_team_b: number | null;
  team_a_id: number | null;
  team_b_id: number | null;
};

type TeamPlayerRow = {
  team_id: number;
  player_id: number;
};

type MvpVoteRow = {
  session_id: number;
  voted_player_id: number;
};

async function fetchSessions(
  clubId: string,
  seasonIdOrAll: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  let query = supabase
    .from("sessions")
    .select("id, date, season_id, mvp_voting_finalized_at")
    .eq("club_id", clubId)
    .order("date", { ascending: true });

  if (seasonIdOrAll !== "all") {
    query = query.eq("season_id", Number(seasonIdOrAll));
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Session[];
}

function buildPresentPlayersBySession(rows: SessionPlayerRow[]) {
  const presentBySession = new Map<number, Set<number>>();

  for (const row of rows) {
    if (!presentBySession.has(row.session_id)) {
      presentBySession.set(row.session_id, new Set<number>());
    }

    presentBySession.get(row.session_id)!.add(row.player_id);
  }

  return presentBySession;
}

function buildTeamPlayerSets(rows: TeamPlayerRow[]) {
  const playersByTeamSet = new Map<number, Set<number>>();

  for (const row of rows) {
    if (!playersByTeamSet.has(row.team_id)) {
      playersByTeamSet.set(row.team_id, new Set<number>());
    }

    playersByTeamSet.get(row.team_id)!.add(row.player_id);
  }

  return playersByTeamSet;
}

function buildDecidedResultMap(results: ResultSourceRow[]) {
  const resultBySession = new Map<
    number,
    {
      winnerTeamId: number;
      loserTeamId: number;
    }
  >();

  for (const result of results) {
    const ga = result.goals_team_a;
    const gb = result.goals_team_b;

    if (
      ga == null ||
      gb == null ||
      ga === gb ||
      result.team_a_id == null ||
      result.team_b_id == null
    ) {
      continue;
    }

    resultBySession.set(result.session_id, {
      winnerTeamId: ga > gb ? result.team_a_id : result.team_b_id,
      loserTeamId: ga > gb ? result.team_b_id : result.team_a_id,
    });
  }

  return resultBySession;
}

function computeCurrentTrainingStreaks({
  sessions,
  presentRows,
  results,
  teamPlayers,
  nonGuestPlayerIds,
}: {
  sessions: Session[];
  presentRows: SessionPlayerRow[];
  results: ResultSourceRow[];
  teamPlayers: TeamPlayerRow[];
  nonGuestPlayerIds: Set<number>;
}) {
  const presentBySession = buildPresentPlayersBySession(presentRows);
  const teamPlayerSets = buildTeamPlayerSets(teamPlayers);
  const resultBySession = buildDecidedResultMap(results);
  const sessionsDesc = [...sessions].sort((a, b) => b.date.localeCompare(a.date));

  const currentAttendanceStreak = new Map<number, number>();
  const currentWinStreak = new Map<number, number>();
  const currentLossStreak = new Map<number, number>();

  for (const playerId of nonGuestPlayerIds) {
    let attendanceStreak = 0;

    for (const session of sessionsDesc) {
      const present = presentBySession.get(session.id)?.has(playerId) === true;

      if (!present) {
        break;
      }

      attendanceStreak += 1;
    }

    currentAttendanceStreak.set(playerId, attendanceStreak);

    let winStreak = 0;

    for (const session of sessionsDesc) {
      const result = resultBySession.get(session.id);

      if (!result) {
        continue;
      }

      const present = presentBySession.get(session.id)?.has(playerId) === true;

      if (!present) {
        break;
      }

      const winnerPlayers = teamPlayerSets.get(result.winnerTeamId);

      if (winnerPlayers?.has(playerId)) {
        winStreak += 1;
        continue;
      }

      break;
    }

    currentWinStreak.set(playerId, winStreak);

    let lossStreak = 0;

    for (const session of sessionsDesc) {
      const result = resultBySession.get(session.id);

      if (!result) {
        continue;
      }

      const present = presentBySession.get(session.id)?.has(playerId) === true;

      if (!present) {
        break;
      }

      const loserPlayers = teamPlayerSets.get(result.loserTeamId);

      if (loserPlayers?.has(playerId)) {
        lossStreak += 1;
        continue;
      }

      break;
    }

    currentLossStreak.set(playerId, lossStreak);
  }

  return {
    currentAttendanceStreak,
    currentWinStreak,
    currentLossStreak,
  };
}

function buildMvpWinsMap(votes: MvpVoteRow[]) {
  const sessionVoteMap = new Map<number, Map<number, number>>();

  for (const vote of votes) {
    const sessionId = Number(vote.session_id);
    const playerId = Number(vote.voted_player_id);

    if (!Number.isFinite(sessionId) || !Number.isFinite(playerId)) {
      continue;
    }

    if (!sessionVoteMap.has(sessionId)) {
      sessionVoteMap.set(sessionId, new Map<number, number>());
    }

    const playerCounts = sessionVoteMap.get(sessionId)!;
    playerCounts.set(playerId, (playerCounts.get(playerId) ?? 0) + 1);
  }

  const mvpWinsMap = new Map<number, number>();

  for (const [, playerCounts] of sessionVoteMap) {
    let maxVotes = 0;

    for (const [, count] of playerCounts) {
      if (count > maxVotes) {
        maxVotes = count;
      }
    }

    if (maxVotes <= 0) {
      continue;
    }

    const winners = Array.from(playerCounts.entries())
      .filter(([, count]) => count === maxVotes)
      .map(([playerId]) => playerId);

    for (const playerId of winners) {
      mvpWinsMap.set(playerId, (mvpWinsMap.get(playerId) ?? 0) + 1);
    }
  }

  return mvpWinsMap;
}

async function computeStandings(
  clubId: string,
  sessions: Session[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<StandingRow[]> {
  const sessionIds = sessions.map((session) => session.id);

  if (sessionIds.length === 0) {
    return [];
  }

  const { data: spData, error: spErr } = await supabase
    .from("session_players")
    .select("session_id, player_id")
    .in("session_id", sessionIds);

  if (spErr) {
    throw new Error(spErr.message);
  }

  const presentRows = (spData ?? []) as SessionPlayerRow[];
  const playerIds = Array.from(new Set(presentRows.map((row) => row.player_id)));

  const { data: playerData, error: playerErr } = await supabase
    .from("players")
    .select("id, name, first_name, last_name, nickname, is_guest")
    .eq("club_id", clubId)
    .in("id", playerIds.length > 0 ? playerIds : [-1]);

  if (playerErr) {
    throw new Error(playerErr.message);
  }

  const typedPlayers = (playerData ?? []) as PlayerStandingSourceRow[];

  const nonGuestPlayerIds = new Set<number>(
    typedPlayers
      .filter((player) => player.is_guest !== true)
      .map((player) => player.id)
  );

  const { data: resultData, error: resultErr } = await supabase
    .from("results")
    .select("session_id, goals_team_a, goals_team_b, team_a_id, team_b_id")
    .eq("club_id", clubId)
    .in("session_id", sessionIds);

  if (resultErr) {
    throw new Error(resultErr.message);
  }

  const results = (resultData ?? []) as ResultSourceRow[];

  const teamIds = Array.from(
    new Set(
      results
        .flatMap((result) => [result.team_a_id, result.team_b_id])
        .filter((value): value is number => typeof value === "number")
    )
  );

  let teamPlayers: TeamPlayerRow[] = [];

  if (teamIds.length > 0) {
    const { data: tpData, error: tpErr } = await supabase
      .from("team_players")
      .select("team_id, player_id")
      .in("team_id", teamIds);

    if (tpErr) {
      throw new Error(tpErr.message);
    }

    teamPlayers = (tpData ?? []) as TeamPlayerRow[];
  }

  const playersByTeam = new Map<number, number[]>();

  for (const teamPlayer of teamPlayers) {
    if (!playersByTeam.has(teamPlayer.team_id)) {
      playersByTeam.set(teamPlayer.team_id, []);
    }

    playersByTeam.get(teamPlayer.team_id)!.push(teamPlayer.player_id);
  }

  const playerById = new Map<
    number,
    {
      name: string | null;
      first_name: string | null;
      last_name: string | null;
      nickname: string | null;
    }
  >();

  for (const player of typedPlayers) {
    if (player.is_guest === true) {
      continue;
    }

    playerById.set(player.id, {
      name: player.name,
      first_name: player.first_name,
      last_name: player.last_name,
      nickname: player.nickname,
    });
  }

  const sessionsCount = new Map<number, number>();

  for (const row of presentRows) {
    if (!nonGuestPlayerIds.has(row.player_id)) {
      continue;
    }

    sessionsCount.set(row.player_id, (sessionsCount.get(row.player_id) ?? 0) + 1);
  }

  const winsCount = new Map<number, number>();

  for (const result of results) {
    const ga = result.goals_team_a;
    const gb = result.goals_team_b;

    if (ga == null || gb == null || ga === gb) {
      continue;
    }

    const winnerTeamId = ga > gb ? result.team_a_id : result.team_b_id;

    if (!winnerTeamId) {
      continue;
    }

    const winnerPlayers = playersByTeam.get(winnerTeamId) ?? [];

    for (const playerId of winnerPlayers) {
      if (!nonGuestPlayerIds.has(playerId)) {
        continue;
      }

      winsCount.set(playerId, (winsCount.get(playerId) ?? 0) + 1);
    }
  }

  const streaks = computeCurrentTrainingStreaks({
    sessions,
    presentRows,
    results,
    teamPlayers,
    nonGuestPlayerIds,
  });

  const finalizedSessionIds = sessions
    .filter((session) => session.mvp_voting_finalized_at !== null)
    .map((session) => session.id);

  let mvpWinsMap = new Map<number, number>();

  if (finalizedSessionIds.length > 0) {
    const { data: mvpVotesData, error: mvpVotesError } = await supabase
      .from("session_mvp_votes")
      .select("session_id, voted_player_id")
      .eq("club_id", clubId)
      .in("session_id", finalizedSessionIds);

    if (mvpVotesError) {
      throw new Error(mvpVotesError.message);
    }

    mvpWinsMap = buildMvpWinsMap((mvpVotesData ?? []) as MvpVoteRow[]);
  }

  const allPlayers = Array.from(
    new Set([
      ...Array.from(sessionsCount.keys()),
      ...Array.from(winsCount.keys()),
      ...Array.from(mvpWinsMap.keys()),
    ])
  );

  return allPlayers.map((playerId) => {
    const player = playerById.get(playerId);

    return {
      player_id: playerId,
      name: player?.name ?? "Unbekannt",
      first_name: player?.first_name ?? null,
      last_name: player?.last_name ?? null,
      nickname: player?.nickname ?? null,
      wins: winsCount.get(playerId) ?? 0,
      sessions: sessionsCount.get(playerId) ?? 0,
      mvps: mvpWinsMap.get(playerId) ?? 0,
      currentWinStreak: streaks.currentWinStreak.get(playerId) ?? 0,
      currentLossStreak: streaks.currentLossStreak.get(playerId) ?? 0,
      currentAttendanceStreak: streaks.currentAttendanceStreak.get(playerId) ?? 0,
    };
  });
}

function mergeWithPreviousRanks(
  currentRows: RankRow[],
  previousRows: RankRow[] | null
): RankRow[] {
  if (!previousRows) {
    return currentRows;
  }

  const prevRankByPlayerId = new Map<number, number>();

  for (const row of previousRows) {
    prevRankByPlayerId.set(row.player_id, row.rank);
  }

  return currentRows.map((row) => {
    const previousRank = prevRankByPlayerId.get(row.player_id);
    const deltaRank = previousRank == null ? null : previousRank - row.rank;

    return {
      ...row,
      deltaRank,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { clubId } = await requireClub();
    const supabase = await createClient();

    const { data: seasonData, error: seasonError } = await supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("club_id", clubId)
      .order("id", { ascending: false });

    if (seasonError) {
      return NextResponse.json({ error: seasonError.message }, { status: 500 });
    }

    const seasons = (seasonData ?? []) as Season[];

    const requestedSeason = request.nextUrl.searchParams.get("season");
    const selected =
      requestedSeason ?? (seasons.length > 0 ? String(seasons[0].id) : "all");

    const sessions = await fetchSessions(clubId, selected, supabase);

    if (sessions.length === 0) {
      return NextResponse.json({
        seasons,
        selected,
        rows: [],
      });
    }

    const previousSessions =
      sessions.length >= 2 ? sessions.slice(0, sessions.length - 1) : null;

    const currentRows = addRanks(
      await computeStandings(clubId, sessions, supabase)
    ) as RankRow[];

    const previousRows = previousSessions
      ? (addRanks(
          await computeStandings(clubId, previousSessions, supabase)
        ) as RankRow[])
      : null;

    const rows = mergeWithPreviousRanks(currentRows, previousRows);

    return NextResponse.json({
      seasons,
      selected,
      rows,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Fehler beim Laden der Tabelle.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}