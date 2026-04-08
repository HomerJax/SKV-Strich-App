import Link from "next/link";
import { redirect } from "next/navigation";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import PlayerTrendCard from "@/components/stats/PlayerTrendCard";
import StatsHero from "@/components/stats/StatsHero";
import RecentResultsCard from "@/components/stats/RecentResultsCard";
import MvpCards from "@/components/stats/MvpCards";
import TeamImpactCard from "@/components/stats/TeamImpactCard";
import {
  getImpactMeta,
  getImpactValue,
  isMvpRevealClosed,
  trendValueForOutcome,
  type RecentResult,
} from "@/lib/stats/utils";

type ClubSettingsRow = {
  use_strength: boolean;
  strength_default: number | null;
};

type ResultRow = {
  session_id: number;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type TeamPlayerRow = {
  team_id: number;
  player_id: number;
};

type SessionRow = {
  id: number;
  date: string;
};

type PlayerStrengthRow = {
  id: number;
  strength: number | null;
};

type MvpVoteRow = {
  session_id: number;
  voted_player_id: number;
};

export default async function StatsPage() {
  const { clubId, player } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);

  if (!flags.player_stats_overview) {
    redirect("/");
  }

  const supabase = await createClient();

  const [
    { data: clubSettingsData, error: clubSettingsError },
    { data: teamPlayerRowsForPlayer, error: teamPlayerError },
  ] = await Promise.all([
    supabase
      .from("club_settings")
      .select("use_strength, strength_default")
      .eq("club_id", clubId)
      .maybeSingle<ClubSettingsRow>(),
    supabase.from("team_players").select("team_id").eq("player_id", player.id),
  ]);

  if (clubSettingsError) {
    throw new Error(
      `Club-Settings konnten nicht geladen werden: ${clubSettingsError.message}`
    );
  }

  if (teamPlayerError) {
    throw new Error(
      `Team-Zuordnungen konnten nicht geladen werden: ${teamPlayerError.message}`
    );
  }

  const clubSettings = (clubSettingsData ?? {
    use_strength: true,
    strength_default: 3,
  }) as ClubSettingsRow;

  const useStrength = clubSettings.use_strength ?? true;
  const strengthDefault = clubSettings.strength_default ?? 3;

  const teamIds = ((teamPlayerRowsForPlayer ?? []) as { team_id: number }[])
    .map((row) => row.team_id)
    .filter((value) => Number.isFinite(value));

  let mvpWins = 0;
  let mvpPerGame = 0;

  if (teamIds.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-24">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück
          </Link>
        </div>

        <StatsHero
          sessionsPlayed={0}
          wins={0}
          losses={0}
          draws={0}
          completedResults={0}
          showMvp={flags.session_mvp_voting}
          mvpWins={0}
          mvpPerGame={0}
        />

        {flags.session_mvp_voting ? <MvpCards mvpWins={0} mvpPerGame={0} /> : null}

        {flags.player_trends ? (
          <div className="mt-5">
            <PlayerTrendCard enabled={true} points={[]} />
          </div>
        ) : null}
      </main>
    );
  }

  const { data: resultsData, error: resultsError } = await supabase
    .from("results")
    .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
    .eq("club_id", clubId);

  if (resultsError) {
    throw new Error(`Ergebnisse konnten nicht geladen werden: ${resultsError.message}`);
  }

  const allResults = (resultsData ?? []) as ResultRow[];

  const myResults = allResults.filter((result) => {
    return (
      (result.team_a_id !== null && teamIds.includes(result.team_a_id)) ||
      (result.team_b_id !== null && teamIds.includes(result.team_b_id))
    );
  });

  const sessionsPlayed = myResults.length;

  const sessionIds = myResults
    .map((result) => result.session_id)
    .filter((value) => Number.isFinite(value));

  let sessionsById = new Map<number, SessionRow>();

  if (sessionIds.length > 0) {
    const { data: sessionRows, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, date")
      .in("id", sessionIds);

    if (sessionsError) {
      throw new Error(`Sessions konnten nicht geladen werden: ${sessionsError.message}`);
    }

    sessionsById = new Map<number, SessionRow>(
      ((sessionRows ?? []) as SessionRow[]).map((session) => [session.id, session])
    );
  }

  if (flags.session_mvp_voting) {
    const { data: mvpVotesData, error: mvpVotesError } = await supabase
      .from("session_mvp_votes")
      .select("session_id, voted_player_id")
      .eq("club_id", clubId);

    if (mvpVotesError) {
      throw new Error(
        `MVP-Stimmen konnten nicht geladen werden: ${mvpVotesError.message}`
      );
    }

    const relevantSessionIds = new Set(
      myResults
        .map((result) => result.session_id)
        .filter((value) => Number.isFinite(value))
    );

    const revealedSessionIds = new Set<number>();

    for (const session of sessionsById.values()) {
      if (isMvpRevealClosed(session.date)) {
        revealedSessionIds.add(session.id);
      }
    }

    const votes = (mvpVotesData ?? []) as MvpVoteRow[];
    const sessionVoteMap = new Map<number, Map<number, number>>();

    for (const vote of votes) {
      const sessionId = Number(vote.session_id);
      const votedPlayerId = Number(vote.voted_player_id);

      if (
        !Number.isFinite(sessionId) ||
        !Number.isFinite(votedPlayerId) ||
        !relevantSessionIds.has(sessionId) ||
        !revealedSessionIds.has(sessionId)
      ) {
        continue;
      }

      const playerCounts = sessionVoteMap.get(sessionId) ?? new Map<number, number>();
      playerCounts.set(votedPlayerId, (playerCounts.get(votedPlayerId) ?? 0) + 1);
      sessionVoteMap.set(sessionId, playerCounts);
    }

    let wins = 0;

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

      const winnerIds = Array.from(playerCounts.entries())
        .filter(([, count]) => count === maxVotes)
        .map(([playerId]) => playerId);

      if (winnerIds.includes(player.id)) {
        wins += 1;
      }
    }

    mvpWins = wins;
    mvpPerGame = sessionsPlayed > 0 ? wins / sessionsPlayed : 0;
  }

  const relevantTeamIds = Array.from(
    new Set(
      myResults.flatMap((result) =>
        [result.team_a_id, result.team_b_id].filter(
          (value): value is number => value !== null && Number.isFinite(value)
        )
      )
    )
  );

  const teamScoreById = new Map<number, number>();

  if (relevantTeamIds.length > 0) {
    const { data: teamPlayersData, error: teamPlayersError } = await supabase
      .from("team_players")
      .select("team_id, player_id")
      .in("team_id", relevantTeamIds);

    if (teamPlayersError) {
      throw new Error(
        `Team-Spieler konnten nicht geladen werden: ${teamPlayersError.message}`
      );
    }

    const teamPlayers = (teamPlayersData ?? []) as TeamPlayerRow[];

    const playerIds = Array.from(
      new Set(teamPlayers.map((row) => row.player_id).filter(Number.isFinite))
    );

    const { data: playersData, error: playersError } = await supabase
      .from("players")
      .select("id, strength")
      .in("id", playerIds);

    if (playersError) {
      throw new Error(
        `Spieler-Stärken konnten nicht geladen werden: ${playersError.message}`
      );
    }

    const players = (playersData ?? []) as PlayerStrengthRow[];
    const strengthByPlayerId = new Map<number, number>(
      players.map((p) => [p.id, p.strength ?? strengthDefault])
    );

    const teamBuckets = new Map<number, TeamPlayerRow[]>();
    for (const row of teamPlayers) {
      const current = teamBuckets.get(row.team_id) ?? [];
      current.push(row);
      teamBuckets.set(row.team_id, current);
    }

    for (const teamId of relevantTeamIds) {
      const rows = teamBuckets.get(teamId) ?? [];

      if (useStrength) {
        const score = rows.reduce((sum, row) => {
          return sum + (strengthByPlayerId.get(row.player_id) ?? strengthDefault);
        }, 0);

        teamScoreById.set(teamId, score);
      } else {
        teamScoreById.set(teamId, rows.length);
      }
    }
  }

  const totals = {
    wins: 0,
    losses: 0,
    draws: 0,
    impactTotal: 0,
    impactGames: 0,
    impactWins: 0,
  };

  const recentResults: RecentResult[] = myResults.map((result) => {
    const myTeamIsA =
      result.team_a_id !== null && teamIds.includes(result.team_a_id);

    const goalsA = result.goals_team_a ?? 0;
    const goalsB = result.goals_team_b ?? 0;

    let outcome: RecentResult["outcome"] = "draw";

    if (goalsA === goalsB) {
      outcome = "draw";
      totals.draws += 1;
    } else if ((myTeamIsA && goalsA > goalsB) || (!myTeamIsA && goalsB > goalsA)) {
      outcome = "win";
      totals.wins += 1;
    } else {
      outcome = "loss";
      totals.losses += 1;
    }

    const myTeamId = myTeamIsA ? result.team_a_id : result.team_b_id;
    const opponentTeamId = myTeamIsA ? result.team_b_id : result.team_a_id;

    const myTeamScore =
      myTeamId !== null ? (teamScoreById.get(myTeamId) ?? 0) : 0;
    const opponentScore =
      opponentTeamId !== null ? (teamScoreById.get(opponentTeamId) ?? 0) : 0;

    const goalsFor = myTeamIsA ? goalsA : goalsB;
    const goalsAgainst = myTeamIsA ? goalsB : goalsA;

    const impactValue = getImpactValue({
      myTeamScore,
      opponentScore,
      goalsFor,
      goalsAgainst,
    });

    totals.impactTotal += impactValue;
    totals.impactGames += 1;
    if (outcome === "win") {
      totals.impactWins += 1;
    }

    return {
      sessionId: result.session_id,
      date: sessionsById.get(result.session_id)?.date ?? null,
      outcome,
      scoreLabel: `${goalsA}:${goalsB}`,
      myTeamLabel: myTeamIsA ? "Team 1" : "Team 2",
    };
  });

  recentResults.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  const lastFive = recentResults.slice(0, 5);
  const completedResults = totals.wins + totals.losses + totals.draws;
  const trendPoints = [...lastFive].reverse().map((item, index) => ({
    id: `${item.sessionId}-${index}`,
    label: `${index + 1}`,
    value: trendValueForOutcome(item.outcome),
  }));

  const impactPerMatch =
    totals.impactGames > 0 ? totals.impactTotal / totals.impactGames : 0;
  const impactMeta = getImpactMeta(impactPerMatch);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
        >
          ← Zurück
        </Link>
      </div>

      <StatsHero
        sessionsPlayed={sessionsPlayed}
        wins={totals.wins}
        losses={totals.losses}
        draws={totals.draws}
        completedResults={completedResults}
        showMvp={flags.session_mvp_voting}
        mvpWins={mvpWins}
        mvpPerGame={mvpPerGame}
      />

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {flags.player_trends ? (
          <PlayerTrendCard enabled={true} points={trendPoints} />
        ) : null}

        <RecentResultsCard results={lastFive} />
      </div>

      {flags.session_mvp_voting ? (
        <MvpCards mvpWins={mvpWins} mvpPerGame={mvpPerGame} />
      ) : null}

      {flags.team_impact ? (
        <TeamImpactCard
          impactGames={totals.impactGames}
          impactWins={totals.impactWins}
          impactTotal={totals.impactTotal}
          impactPerMatch={impactPerMatch}
          impactMeta={impactMeta}
        />
      ) : null}
    </main>
  );
}