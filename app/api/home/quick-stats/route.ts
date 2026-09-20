import { NextResponse } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";

type SeasonRow = {
  id: number;
  start_date: string | null;
  end_date: string | null;
};

type ResultRow = {
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

function isDateWithinSeason(dateIso: string, season: SeasonRow) {
  if (!season.start_date || !season.end_date) return false;
  return dateIso >= season.start_date && dateIso <= season.end_date;
}

export async function GET() {
  const { clubId, player } = await requireClub();

  if (!player) {
    return NextResponse.json({
      attendanceCount: 0,
      successRate: null,
      attendanceRank: null,
    });
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: seasonsData }, { data: clubPlayersData }] = await Promise.all([
    supabase
      .from("seasons")
      .select("id,start_date,end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
    supabase.from("players").select("id").eq("club_id", clubId),
  ]);

  const seasons = (seasonsData ?? []) as SeasonRow[];
  const currentSeason =
    seasons.find((season) => isDateWithinSeason(today, season)) ??
    seasons[0] ??
    null;

  if (!currentSeason) {
    return NextResponse.json({
      attendanceCount: 0,
      successRate: null,
      attendanceRank: null,
    });
  }

  const { data: sessionData } = await supabase
    .from("sessions")
    .select("id")
    .eq("club_id", clubId)
    .eq("season_id", currentSeason.id)
    .lte("date", today);

  const sessionIds = (sessionData ?? [])
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id));

  if (sessionIds.length === 0) {
    return NextResponse.json({
      attendanceCount: 0,
      successRate: null,
      attendanceRank: null,
    });
  }

  const clubPlayerIds = (clubPlayersData ?? [])
    .map((row) => Number(row.id))
    .filter((id) => Number.isFinite(id));

  const [{ data: resultsData }, { data: attendanceData }] = await Promise.all([
    supabase
      .from("results")
      .select("team_a_id,team_b_id,goals_team_a,goals_team_b")
      .eq("club_id", clubId)
      .in("session_id", sessionIds),
    clubPlayerIds.length
      ? supabase
          .from("session_players")
          .select("player_id")
          .in("player_id", clubPlayerIds)
          .in("session_id", sessionIds)
      : Promise.resolve({ data: [] as { player_id: number }[], error: null }),
  ]);

  const results = (resultsData ?? []) as ResultRow[];
  const teamIds = Array.from(
    new Set(
      results.flatMap((result) =>
        [result.team_a_id, result.team_b_id].filter(
          (value): value is number => typeof value === "number" && Number.isFinite(value),
        ),
      ),
    ),
  );

  const { data: myTeamsData } = teamIds.length
    ? await supabase
        .from("team_players")
        .select("team_id")
        .eq("player_id", player.id)
        .in("team_id", teamIds)
    : { data: [] as { team_id: number }[] };

  const myTeamIds = new Set(
    (myTeamsData ?? [])
      .map((row) => Number(row.team_id))
      .filter((id) => Number.isFinite(id)),
  );

  let wins = 0;
  let completed = 0;
  for (const result of results) {
    const isA = result.team_a_id !== null && myTeamIds.has(result.team_a_id);
    const isB = result.team_b_id !== null && myTeamIds.has(result.team_b_id);
    if (!isA && !isB) continue;
    if (
      typeof result.goals_team_a !== "number" ||
      typeof result.goals_team_b !== "number"
    ) {
      continue;
    }

    completed += 1;
    if (
      (isA && result.goals_team_a > result.goals_team_b) ||
      (isB && result.goals_team_b > result.goals_team_a)
    ) {
      wins += 1;
    }
  }

  const attendanceCounts = new Map<number, number>();
  for (const row of attendanceData ?? []) {
    const playerId = Number(row.player_id);
    attendanceCounts.set(playerId, (attendanceCounts.get(playerId) ?? 0) + 1);
  }

  const attendanceCount = attendanceCounts.get(player.id) ?? 0;
  const attendanceRank =
    1 +
    clubPlayerIds.filter(
      (playerId) => (attendanceCounts.get(playerId) ?? 0) > attendanceCount,
    ).length;

  return NextResponse.json(
    {
      attendanceCount,
      successRate: completed > 0 ? Math.round((wins / completed) * 100) : null,
      attendanceRank,
    },
    {
      headers: {
        "cache-control": "private, no-store",
      },
    },
  );
}
