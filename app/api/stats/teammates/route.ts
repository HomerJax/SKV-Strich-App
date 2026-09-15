import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/context";
import { createClient } from "@/lib/supabase/server";

type Scope = "season" | "career";
type SeasonRow = { id: number; start_date: string | null; end_date: string | null };
type TeamRow = { id: number; session_id: number };
type TeamPlayerRow = { team_id: number; player_id: number };
type ResultRow = { session_id: number; team_a_id: number | null; team_b_id: number | null; goals_team_a: number | null; goals_team_b: number | null };
type PlayerRow = { id: number; name: string | null; first_name: string | null; last_name: string | null; nickname: string | null };
type Counter = { playerId: number; played: number; wins: number; losses: number };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function currentSeason(seasons: SeasonRow[]) {
  const today = todayIso();
  return seasons.find((season) => season.start_date && season.end_date && today >= season.start_date && today <= season.end_date) ?? seasons[0] ?? null;
}

function playerName(player: PlayerRow | undefined) {
  if (!player) return "Spieler";
  const nickname = player.nickname?.trim();
  if (nickname) return nickname;
  const fullName = [player.first_name, player.last_name].map((value) => value?.trim()).filter(Boolean).join(" ");
  return fullName || player.name?.trim() || "Spieler";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scope: Scope = url.searchParams.get("scope") === "career" ? "career" : "season";
  const ctx = await getAuthContext();

  if (!ctx.user || !ctx.activeClubId || !ctx.player?.id) {
    return NextResponse.json({ played: [], wins: [], losses: [] });
  }

  const clubId = ctx.activeClubId;
  const playerId = ctx.player.id;
  const supabase = await createClient();

  const [{ data: myTeamRows }, { data: seasonsData }] = await Promise.all([
    supabase.from("team_players").select("team_id").eq("player_id", playerId),
    scope === "season"
      ? supabase.from("seasons").select("id,start_date,end_date").eq("club_id", clubId).order("start_date", { ascending: false })
      : Promise.resolve({ data: [] as SeasonRow[] }),
  ]);

  const myTeamIds = Array.from(new Set((myTeamRows ?? []).map((row) => Number(row.team_id)).filter(Number.isFinite)));
  if (myTeamIds.length === 0) return NextResponse.json({ played: [], wins: [], losses: [] });

  const { data: teamsData } = await supabase.from("teams").select("id,session_id").eq("club_id", clubId).in("id", myTeamIds);
  const allMyTeams = (teamsData ?? []) as TeamRow[];
  if (allMyTeams.length === 0) return NextResponse.json({ played: [], wins: [], losses: [] });

  let scopedSessionIds = Array.from(new Set(allMyTeams.map((team) => Number(team.session_id)).filter(Number.isFinite)));

  if (scope === "season") {
    const season = currentSeason((seasonsData ?? []) as SeasonRow[]);
    if (!season) return NextResponse.json({ played: [], wins: [], losses: [] });
    const { data: scopedSessions } = await supabase.from("sessions").select("id").eq("club_id", clubId).eq("season_id", season.id).in("id", scopedSessionIds);
    scopedSessionIds = (scopedSessions ?? []).map((row) => Number(row.id)).filter(Number.isFinite);
  }

  const scopedSessionSet = new Set(scopedSessionIds);
  const scopedMyTeams = allMyTeams.filter((team) => scopedSessionSet.has(Number(team.session_id)));
  const scopedMyTeamIds = scopedMyTeams.map((team) => team.id);
  if (scopedMyTeamIds.length === 0) return NextResponse.json({ played: [], wins: [], losses: [] });

  const [{ data: teammateRowsData }, { data: resultsData }] = await Promise.all([
    supabase.from("team_players").select("team_id,player_id").in("team_id", scopedMyTeamIds),
    supabase.from("results").select("session_id,team_a_id,team_b_id,goals_team_a,goals_team_b").eq("club_id", clubId).in("session_id", scopedSessionIds),
  ]);

  const teammateRows = (teammateRowsData ?? []) as TeamPlayerRow[];
  const teammateIds = Array.from(new Set(teammateRows.map((row) => row.player_id).filter((id) => id !== playerId && Number.isFinite(id))));
  if (teammateIds.length === 0) return NextResponse.json({ played: [], wins: [], losses: [] });

  const { data: playersData } = await supabase.from("players").select("id,name,first_name,last_name,nickname").eq("club_id", clubId).in("id", teammateIds);
  const playerById = new Map(((playersData ?? []) as PlayerRow[]).map((player) => [player.id, player]));
  const resultBySession = new Map(((resultsData ?? []) as ResultRow[]).map((result) => [Number(result.session_id), result]));
  const teamById = new Map(scopedMyTeams.map((team) => [team.id, team]));
  const counters = new Map<number, Counter>();

  for (const row of teammateRows) {
    if (row.player_id === playerId) continue;
    const team = teamById.get(row.team_id);
    if (!team) continue;

    const counter = counters.get(row.player_id) ?? { playerId: row.player_id, played: 0, wins: 0, losses: 0 };
    counter.played += 1;

    const result = resultBySession.get(team.session_id);
    if (result && result.goals_team_a != null && result.goals_team_b != null) {
      const isA = result.team_a_id === team.id;
      const isB = result.team_b_id === team.id;
      if (isA || isB) {
        const myGoals = isA ? result.goals_team_a : result.goals_team_b;
        const otherGoals = isA ? result.goals_team_b : result.goals_team_a;
        if (myGoals > otherGoals) counter.wins += 1;
        if (myGoals < otherGoals) counter.losses += 1;
      }
    }

    counters.set(row.player_id, counter);
  }

  const rows = [...counters.values()].map((counter) => ({
    playerId: counter.playerId,
    name: playerName(playerById.get(counter.playerId)),
    played: counter.played,
    wins: counter.wins,
    losses: counter.losses,
  }));

  const top = (key: "played" | "wins" | "losses") => [...rows]
    .sort((a, b) => b[key] - a[key] || b.played - a.played || a.name.localeCompare(b.name, "de"))
    .filter((row) => row[key] > 0)
    .slice(0, 3)
    .map((row) => ({ playerId: row.playerId, name: row.name, value: row[key] }));

  return NextResponse.json({ played: top("played"), wins: top("wins"), losses: top("losses") });
}
