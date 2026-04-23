import Link from "next/link";
import { redirect } from "next/navigation";
import {
  TrendingUp,
  UsersRound,
  History,
  Award,
} from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import PageHero from "@/components/ui/PageHero";
import ScopeToggle from "@/components/stats/ScopeToggle";
import BadgeProgressCard from "@/components/badges/BadgeProgressCard";
import PlayerTrendCard from "@/components/stats/PlayerTrendCard";
import StatsHero from "@/components/stats/StatsHero";
import RecentResultsCard from "@/components/stats/RecentResultsCard";
import TeamImpactCard from "@/components/stats/TeamImpactCard";
import StatsSection from "@/components/stats/StatsSection";
import {
  getImpactMeta,
  getImpactValue,
  isMvpRevealClosed,
  type RecentResult,
} from "@/lib/stats/utils";

type PageProps = {
  searchParams?: Promise<{
    scope?: string;
  }>;
};

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

type TeamRow = {
  id: number;
  session_id: number;
};

type SessionRow = {
  id: number;
  date: string;
  season_id: number | null;
};

type SeasonRow = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type PlayerStrengthRow = {
  id: number;
  strength: number | null;
};

type PlayerMetaRow = {
  id: number;
  mvp_count: number | null;
};

type MvpVoteRow = {
  session_id: number;
  voted_player_id: number;
};

type ClubRow = {
  id: string;
  primary_color: string | null;
};

type StatsScope = "season" | "career";

function trendValueForOutcome(outcome: RecentResult["outcome"]) {
  if (outcome === "win") return 1;
  if (outcome === "loss") return -1;
  return 0;
}

function getTodayIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isDateWithinSeason(dateIso: string, season: SeasonRow) {
  if (!season.start_date || !season.end_date) return false;
  return dateIso >= season.start_date && dateIso <= season.end_date;
}

function getCurrentSeason(seasons: SeasonRow[]) {
  const today = getTodayIsoDate();
  const current = seasons.find((season) => isDateWithinSeason(today, season));
  if (current) return current;
  return seasons[0] ?? null;
}

function getScopeDescription(scope: StatsScope) {
  if (scope === "career") {
    return "Alle gespeicherten Ergebnisse, Trends und MVP-Erfolge über deine gesamte Zeit im Club.";
  }

  return "Deine Ergebnisse, Trends und MVP-Erfolge aus der aktuell laufenden Saison.";
}

function EmptyStatsContent({
  showMvp,
  badgeMvpCount,
}: {
  showMvp: boolean;
  badgeMvpCount: number;
}) {
  return (
    <>
      <StatsSection
        title="Form"
        subtitle="Verlauf über alle gespielten Einheiten."
        defaultOpen={true}
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <PlayerTrendCard enabled={true} points={[]} />
      </StatsSection>

      <StatsSection
        title="Team Impact"
        subtitle="Wie stark dein Einfluss auf Ergebnisse und Team-Balance war."
        defaultOpen={false}
        icon={<UsersRound className="h-5 w-5" />}
      >
        <TeamImpactCard
          impactGames={0}
          impactWins={0}
          impactTotal={0}
          impactPerMatch={0}
          impactMeta={getImpactMeta(0)}
        />
      </StatsSection>

      <StatsSection
        title="Letzte Ergebnisse"
        subtitle="Deine letzten fünf abgeschlossenen Ergebnisse."
        defaultOpen={true}
        icon={<History className="h-5 w-5" />}
      >
        <RecentResultsCard results={[]} />
      </StatsSection>

      {showMvp ? (
        <StatsSection
          title="Badges"
          subtitle="Dein aktueller Badge-Status auf Basis deiner gesamten MVP-Erfolge."
          defaultOpen={true}
          icon={<Award className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <BadgeProgressCard
              mvpCount={badgeMvpCount}
              title="Badge-Fortschritt"
            />

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                Coming Soon
              </div>
              <p className="mt-1 text-sm text-slate-600">
                Weitere Badges folgen. Hier werden später zusätzliche Erfolge
                und Auszeichnungen für Training, Teilnahme, Serien und
                besondere Leistungen sichtbar.
              </p>
            </div>
          </div>
        </StatsSection>
      ) : null}
    </>
  );
}

function StatsIntro({
  scope,
  seasonName,
  primaryColorKey,
}: {
  scope: StatsScope;
  seasonName: string | null;
  primaryColorKey: string | null | undefined;
}) {
  return (
    <PageHero
      eyebrow="Spieler"
      title="Meine Stats"
      description={getScopeDescription(scope)}
      primaryColorKey={primaryColorKey}
      backLabel="Zurück"
      backHref="/"
      topRightSlot={<ScopeToggle scope={scope} seasonName={seasonName} />}
      compact
    />
  );
}

export default async function StatsPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const requestedScope = String(resolvedSearchParams?.scope ?? "season").trim();
  const scope: StatsScope = requestedScope === "career" ? "career" : "season";

  const { clubId, player } = await requireClub();
  const flags = await getFeatureFlagsForClub(clubId);

  if (!flags.player_stats_overview) {
    redirect("/");
  }

  const supabase = await createClient();

  const [
    { data: clubSettingsData, error: clubSettingsError },
    { data: seasonsData, error: seasonsError },
    { data: clubData, error: clubError },
  ] = await Promise.all([
    supabase
      .from("club_settings")
      .select("use_strength, strength_default")
      .eq("club_id", clubId)
      .maybeSingle<ClubSettingsRow>(),
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
    supabase
      .from("clubs")
      .select("id, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
  ]);

  if (clubSettingsError) {
    throw new Error(
      `Club-Settings konnten nicht geladen werden: ${clubSettingsError.message}`
    );
  }

  if (seasonsError) {
    throw new Error(`Saisons konnten nicht geladen werden: ${seasonsError.message}`);
  }

  if (clubError) {
    throw new Error(`Club konnte nicht geladen werden: ${clubError.message}`);
  }

  const clubSettings = (clubSettingsData ?? {
    use_strength: true,
    strength_default: 3,
  }) as ClubSettingsRow;

  const seasons = (seasonsData ?? []) as SeasonRow[];
  const currentSeason = getCurrentSeason(seasons);
  const currentSeasonName = currentSeason?.name ?? null;

  const useStrength = clubSettings.use_strength ?? true;
  const strengthDefault = clubSettings.strength_default ?? 3;
  const primaryColorKey = clubData?.primary_color ?? "black";

  if (!player) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
          />

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

          <EmptyStatsContent
            showMvp={flags.session_mvp_voting}
            badgeMvpCount={0}
          />
        </section>
      </main>
    );
  }

  const { data: playerMetaData, error: playerMetaError } = await supabase
    .from("players")
    .select("id, mvp_count")
    .eq("club_id", clubId)
    .eq("id", player.id)
    .maybeSingle<PlayerMetaRow>();

  if (playerMetaError) {
    throw new Error(
      `Spieler-Metadaten konnten nicht geladen werden: ${playerMetaError.message}`
    );
  }

  const badgeMvpCount = playerMetaData?.mvp_count ?? 0;

  const { data: sessionPlayersData, error: sessionPlayersError } = await supabase
    .from("session_players")
    .select("session_id")
    .eq("player_id", player.id);

  if (sessionPlayersError) {
    throw new Error(
      `Session-Teilnahmen konnten nicht geladen werden: ${sessionPlayersError.message}`
    );
  }

  const playerSessionIds = Array.from(
    new Set(
      ((sessionPlayersData ?? []) as { session_id: number }[])
        .map((row) => row.session_id)
        .filter((value) => Number.isFinite(value))
    )
  );

  if (playerSessionIds.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
          />

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

          <EmptyStatsContent
            showMvp={flags.session_mvp_voting}
            badgeMvpCount={badgeMvpCount}
          />
        </section>
      </main>
    );
  }

  const { data: sessionRowsData, error: scopedSessionsError } = await supabase
    .from("sessions")
    .select("id, date, season_id")
    .in("id", playerSessionIds)
    .eq("club_id", clubId);

  if (scopedSessionsError) {
    throw new Error(`Sessions konnten nicht geladen werden: ${scopedSessionsError.message}`);
  }

  const allPlayerSessions = (sessionRowsData ?? []) as SessionRow[];

  const scopedSessions =
    scope === "career"
      ? allPlayerSessions
      : currentSeason
        ? allPlayerSessions.filter((session) => session.season_id === currentSeason.id)
        : [];

  const scopedSessionIds = scopedSessions
    .map((session) => session.id)
    .filter((value) => Number.isFinite(value));

  const sessionsById = new Map<number, SessionRow>(
    scopedSessions.map((session) => [session.id, session])
  );

  if (scopedSessionIds.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
          />

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

          <EmptyStatsContent
            showMvp={flags.session_mvp_voting}
            badgeMvpCount={badgeMvpCount}
          />
        </section>
      </main>
    );
  }

  const { data: playerTeamRowsData, error: playerTeamRowsError } = await supabase
    .from("team_players")
    .select("team_id")
    .eq("player_id", player.id);

  if (playerTeamRowsError) {
    throw new Error(
      `Team-Zuordnungen konnten nicht geladen werden: ${playerTeamRowsError.message}`
    );
  }

  const allPlayerTeamIds = Array.from(
    new Set(
      ((playerTeamRowsData ?? []) as { team_id: number }[])
        .map((row) => row.team_id)
        .filter((value) => Number.isFinite(value))
    )
  );

  if (allPlayerTeamIds.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
          />

          <StatsHero
            sessionsPlayed={scopedSessionIds.length}
            wins={0}
            losses={0}
            draws={0}
            completedResults={0}
            showMvp={flags.session_mvp_voting}
            mvpWins={0}
            mvpPerGame={0}
          />

          <EmptyStatsContent
            showMvp={flags.session_mvp_voting}
            badgeMvpCount={badgeMvpCount}
          />
        </section>
      </main>
    );
  }

  const { data: teamsData, error: teamsError } = await supabase
    .from("teams")
    .select("id, session_id")
    .in("id", allPlayerTeamIds);

  if (teamsError) {
    throw new Error(`Teams konnten nicht geladen werden: ${teamsError.message}`);
  }

  const teams = (teamsData ?? []) as TeamRow[];
  const scopedSessionIdSet = new Set(scopedSessionIds);

  const myTeamIdsBySessionId = new Map<number, number[]>();

  for (const team of teams) {
    if (!scopedSessionIdSet.has(team.session_id)) continue;

    const current = myTeamIdsBySessionId.get(team.session_id) ?? [];
    current.push(team.id);
    myTeamIdsBySessionId.set(team.session_id, current);
  }

  const relevantSessionIdsForResults = Array.from(myTeamIdsBySessionId.keys());

  if (relevantSessionIdsForResults.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
          />

          <StatsHero
            sessionsPlayed={scopedSessionIds.length}
            wins={0}
            losses={0}
            draws={0}
            completedResults={0}
            showMvp={flags.session_mvp_voting}
            mvpWins={0}
            mvpPerGame={0}
          />

          <EmptyStatsContent
            showMvp={flags.session_mvp_voting}
            badgeMvpCount={badgeMvpCount}
          />
        </section>
      </main>
    );
  }

  const { data: resultsData, error: resultsError } = await supabase
    .from("results")
    .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
    .eq("club_id", clubId)
    .in("session_id", relevantSessionIdsForResults);

  if (resultsError) {
    throw new Error(`Ergebnisse konnten nicht geladen werden: ${resultsError.message}`);
  }

  const allResults = (resultsData ?? []) as ResultRow[];

  const myResults = allResults.filter((result) => {
    const myTeamIds = myTeamIdsBySessionId.get(result.session_id);
    if (!myTeamIds || myTeamIds.length === 0) return false;

    return myTeamIds.some(
      (teamId) => teamId === result.team_a_id || teamId === result.team_b_id
    );
  });

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

  let mvpWins = 0;
  let mvpPerGame = 0;

  if (flags.session_mvp_voting && myResults.length > 0) {
    const relevantResultSessionIds = new Set(
      myResults
        .map((result) => result.session_id)
        .filter((value) => Number.isFinite(value))
    );

    const { data: mvpVotesData, error: mvpVotesError } = await supabase
      .from("session_mvp_votes")
      .select("session_id, voted_player_id")
      .eq("club_id", clubId)
      .in("session_id", Array.from(relevantResultSessionIds));

    if (mvpVotesError) {
      throw new Error(
        `MVP-Stimmen konnten nicht geladen werden: ${mvpVotesError.message}`
      );
    }

    const revealedSessionIds = new Set<number>();

    for (const result of myResults) {
      const session = sessionsById.get(result.session_id);
      if (session?.date && isMvpRevealClosed(session.date)) {
        revealedSessionIds.add(session.id);
      }
    }

    const votes = (mvpVotesData ?? []) as MvpVoteRow[];
    const sessionVoteMap = new Map<number, Map<number, number>>();

    for (const vote of votes) {
      const voteSessionId = Number(vote.session_id);
      const votedPlayerId = Number(vote.voted_player_id);

      if (
        !Number.isFinite(voteSessionId) ||
        !Number.isFinite(votedPlayerId) ||
        !relevantResultSessionIds.has(voteSessionId) ||
        !revealedSessionIds.has(voteSessionId)
      ) {
        continue;
      }

      const playerCounts =
        sessionVoteMap.get(voteSessionId) ?? new Map<number, number>();
      playerCounts.set(votedPlayerId, (playerCounts.get(votedPlayerId) ?? 0) + 1);
      sessionVoteMap.set(voteSessionId, playerCounts);
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
    const myTeamIds = myTeamIdsBySessionId.get(result.session_id) ?? [];

    const matchedTeamId =
      myTeamIds.find(
        (teamId) => teamId === result.team_a_id || teamId === result.team_b_id
      ) ?? null;

    const resolvedMyTeamId =
      matchedTeamId ?? result.team_a_id ?? result.team_b_id ?? null;

    const myTeamIsA =
      resolvedMyTeamId !== null && result.team_a_id === resolvedMyTeamId;

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

    const myTeamResultId = myTeamIsA ? result.team_a_id : result.team_b_id;
    const opponentTeamId = myTeamIsA ? result.team_b_id : result.team_a_id;

    const myTeamScore =
      myTeamResultId !== null ? (teamScoreById.get(myTeamResultId) ?? 0) : 0;
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
  const sessionsPlayed = myResults.length;
  mvpPerGame = completedResults > 0 ? mvpWins / completedResults : 0;

  const trendPoints = [...recentResults].reverse().map((item, index) => ({
    id: `${item.sessionId}-${index}`,
    label: `${index + 1}`,
    value: trendValueForOutcome(item.outcome),
  }));

  const impactPerMatch =
    totals.impactGames > 0 ? totals.impactTotal / totals.impactGames : 0;
  const impactMeta = getImpactMeta(impactPerMatch);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <StatsIntro
          scope={scope}
          seasonName={currentSeasonName}
          primaryColorKey={primaryColorKey}
        />

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

        {flags.player_trends ? (
          <StatsSection
            title="Meine Form"
            subtitle={`Verlauf über alle ${trendPoints.length} bewerteten Sessions`}
            defaultOpen={true}
            icon={<TrendingUp className="h-5 w-5" />}
          >
            <PlayerTrendCard enabled={true} points={trendPoints} />
          </StatsSection>
        ) : null}

        {flags.team_impact ? (
          <StatsSection
            title="Team Impact"
            subtitle="Wie Teams mit dir performen"
            defaultOpen={false}
            icon={<UsersRound className="h-5 w-5" />}
          >
            <TeamImpactCard
              impactGames={totals.impactGames}
              impactWins={totals.impactWins}
              impactTotal={totals.impactTotal}
              impactPerMatch={impactPerMatch}
              impactMeta={impactMeta}
            />
          </StatsSection>
        ) : null}

        <StatsSection
          title="Letzte Ergebnisse"
          subtitle="Deine letzten 5 bewerteten Sessions"
          defaultOpen={true}
          icon={<History className="h-5 w-5" />}
        >
          <RecentResultsCard results={lastFive} />
        </StatsSection>

        {flags.session_mvp_voting ? (
          <StatsSection
            title="Badges"
            subtitle="Dein aktueller Badge-Status auf Basis deiner MVP-Erfolge"
            defaultOpen={true}
            icon={<Award className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <BadgeProgressCard
                mvpCount={badgeMvpCount}
                title="Badge-Fortschritt"
              />

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="text-sm font-semibold text-slate-900">
                  Coming Soon
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Weitere Badges folgen. Hier werden später zusätzliche Erfolge
                  und Auszeichnungen für Training, Teilnahme, Serien und
                  besondere Leistungen sichtbar.
                </p>
              </div>
            </div>
          </StatsSection>
        ) : null}
      </section>
    </main>
  );
}