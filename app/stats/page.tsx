import { redirect } from "next/navigation";
import { TrendingUp, UsersRound, History, Award } from "lucide-react";
import { requireClub } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import PageHero from "@/components/ui/PageHero";
import ScopeToggle from "@/components/stats/ScopeToggle";
import BadgeProgressCard from "@/components/badges/BadgeProgressCard";
import PlayerTrendCard from "@/components/stats/PlayerTrendCard";
import StatsHero from "@/components/stats/StatsHero";
import RecentResultsCard from "@/components/stats/RecentResultsCard";
import TeamImpactCard from "@/components/stats/TeamImpactCard";
import StatsSection from "@/components/stats/StatsSection";
import ProFeatureLock from "@/components/billing/ProFeatureLock";
import { getClubBillingAccess } from "@/lib/billing/club-billing";
import { getServerI18n } from "@/lib/i18n/server";
import { translate } from "@/lib/i18n/messages";
import type { AppLocale } from "@/lib/i18n/config";
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
  display_name: string | null;
  primary_color: string | null;
};

type StatsScope = "season" | "career";

type ImpactDetail = {
  sessionId: number;
  date: string | null;
  scoreLabel: string;
  myTeamLabel: string;
  myTeamScore: number;
  opponentScore: number;
  goalsFor: number;
  goalsAgainst: number;
  impactValue: number;
  explanation: string;
};

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

function getScopeDescription(scope: StatsScope, locale: AppLocale) {
  return translate(
    locale,
    scope === "career" ? "stats.scopeCareer" : "stats.scopeSeason",
  );
}

function getImpactExplanation(
  params: {
    outcome: RecentResult["outcome"];
    myTeamScore: number;
    opponentScore: number;
    impactValue: number;
  },
  locale: AppLocale,
) {
  const { outcome, myTeamScore, opponentScore, impactValue } = params;
  const values = { mine: myTeamScore, opponent: opponentScore };

  if (outcome === "draw") return translate(locale, "stats.impactDraw");
  if (impactValue > 1) return translate(locale, "stats.impactUnderdogWin", values);
  if (impactValue > 0) return translate(locale, "stats.impactBalancedWin", values);
  if (impactValue < 0) return translate(locale, "stats.impactFavoriteLoss", values);
  return translate(locale, "stats.impactUnderdogLoss", values);
}

function EmptyStatsContent({
  showMvp,
  badgeMvpCount,
  locale,
}: {
  showMvp: boolean;
  badgeMvpCount: number;
  locale: AppLocale;
}) {
  const t = (
    key: Parameters<typeof translate>[1],
    params?: Record<string, string | number | null | undefined>,
  ) => translate(locale, key, params);

  return (
    <>
      <StatsSection
        title={t("stats.form")}
        subtitle={t("stats.formHint")}
        defaultOpen={true}
        icon={<TrendingUp className="h-5 w-5" />}
      >
        <PlayerTrendCard enabled={true} points={[]} />
      </StatsSection>

      <StatsSection
        title={t("stats.teamImpact")}
        subtitle={t("stats.teamImpactHint")}
        defaultOpen={false}
        icon={<UsersRound className="h-5 w-5" />}
      >
        <TeamImpactCard
          impactGames={0}
          impactWins={0}
          impactTotal={0}
          impactPerMatch={0}
          impactDetails={[]}
          impactMeta={getImpactMeta(0, locale)}
        />
      </StatsSection>

      <StatsSection
        title={t("stats.recentResults")}
        subtitle={t("stats.recentResultsHint")}
        defaultOpen={true}
        icon={<History className="h-5 w-5" />}
      >
        <RecentResultsCard results={[]} />
      </StatsSection>

      {showMvp ? (
        <StatsSection
          title={t("stats.badges")}
          subtitle={t("stats.badgesHint")}
          defaultOpen={true}
          icon={<Award className="h-5 w-5" />}
        >
          <div className="space-y-4">
            <BadgeProgressCard
              mvpCount={badgeMvpCount}
              title={t("stats.badgeProgress")}
            />

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">
                {t("stats.comingSoon")}
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {t("stats.moreBadges")}
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
  locale,
}: {
  scope: StatsScope;
  seasonName: string | null;
  primaryColorKey: string | null | undefined;
  locale: AppLocale;
}) {
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  return (
    <PageHero
      eyebrow={t("stats.player")}
      title={t("stats.myStats")}
      description={getScopeDescription(scope, locale)}
      primaryColorKey={primaryColorKey}
      backLabel={t("stats.back")}
      backHref="/"
      topRightSlot={<ScopeToggle scope={scope} seasonName={seasonName} />}
      compact
    />
  );
}

export default async function StatsPage({ searchParams }: PageProps) {
  const { locale, t } = await getServerI18n();
  const resolvedSearchParams = await searchParams;
  const requestedScope = String(resolvedSearchParams?.scope ?? "season").trim();
  const scope: StatsScope = requestedScope === "career" ? "career" : "season";

  const { clubId, player, supportViewPlayer, isSupportView } = await requireClub();
  const viewPlayer = player ?? supportViewPlayer;
  const supabase = isSupportView ? createAdminClient() : await createClient();

  const [
    flags,
    { data: clubSettingsData, error: clubSettingsError },
    { data: seasonsData, error: seasonsError },
    { data: clubData, error: clubError },
    billingAccess,
  ] = await Promise.all([
    getFeatureFlagsForClub(clubId),
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
      .select("id, display_name, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    getClubBillingAccess(supabase, clubId),
  ]);

  if (!flags.player_stats_overview) {
    redirect("/");
  }

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
  const clubName = clubData?.display_name?.trim() || t("stats.yourTeam");

  if (!billingAccess.isPro) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
            locale={locale}
          />

          <div className="relative overflow-hidden rounded-[28px]">
            <div className="pointer-events-none select-none opacity-35 blur-[1px] grayscale">
              <StatsHero
                sessionsPlayed={12}
                wins={7}
                losses={3}
                draws={2}
                completedResults={12}
                showMvp={true}
                mvpWins={3}
                mvpPerGame={0.25}
              />

              <div className="mt-5 space-y-5">
                <EmptyStatsContent showMvp={true} badgeMvpCount={3} />
              </div>
            </div>

            <div className="absolute inset-x-0 top-8 z-10 mx-auto w-[calc(100%-2rem)] max-w-2xl">
              <ProFeatureLock
                clubName={clubName}
                title={t("stats.proTitle")}
                description={t("stats.proDescription")}
                featureList={[
                  t("stats.proFeatureForm"),
                  t("stats.proFeatureImpact"),
                  t("stats.proFeatureMvp"),
                  t("stats.proFeatureScope"),
                ]}
              />
            </div>
          </div>
        </section>
      </main>
    );
  }

  if (!viewPlayer) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
            locale={locale}
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
            locale={locale}
          />
        </section>
      </main>
    );
  }

  const [
    { data: playerMetaData, error: playerMetaError },
    { data: sessionPlayersData, error: sessionPlayersError },
    { data: playerTeamRowsData, error: playerTeamRowsError },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, mvp_count")
      .eq("club_id", clubId)
      .eq("id", viewPlayer.id)
      .maybeSingle<PlayerMetaRow>(),
    supabase
      .from("session_players")
      .select("session_id")
      .eq("player_id", viewPlayer.id),
    supabase
      .from("team_players")
      .select("team_id")
      .eq("player_id", viewPlayer.id),
  ]);

  if (playerMetaError) {
    throw new Error(
      `Spieler-Metadaten konnten nicht geladen werden: ${playerMetaError.message}`
    );
  }

  if (sessionPlayersError) {
    throw new Error(
      `Session-Teilnahmen konnten nicht geladen werden: ${sessionPlayersError.message}`
    );
  }

  if (playerTeamRowsError) {
    throw new Error(
      `Team-Zuordnungen konnten nicht geladen werden: ${playerTeamRowsError.message}`
    );
  }

  const badgeMvpCount = playerMetaData?.mvp_count ?? 0;
  const playerSessionIds = Array.from(
    new Set(
      ((sessionPlayersData ?? []) as { session_id: number }[])
        .map((row) => row.session_id)
        .filter((value) => Number.isFinite(value))
    )
  );
  const allPlayerTeamIds = Array.from(
    new Set(
      ((playerTeamRowsData ?? []) as { team_id: number }[])
        .map((row) => row.team_id)
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
            locale={locale}
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
            locale={locale}
          />
        </section>
      </main>
    );
  }

  const teamsPromise =
    allPlayerTeamIds.length > 0
      ? supabase
          .from("teams")
          .select("id, session_id")
          .in("id", allPlayerTeamIds)
      : Promise.resolve({ data: [] as TeamRow[], error: null });

  const [
    { data: sessionRowsData, error: scopedSessionsError },
    { data: teamsData, error: teamsError },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date, season_id")
      .in("id", playerSessionIds)
      .eq("club_id", clubId),
    teamsPromise,
  ]);

  if (scopedSessionsError) {
    throw new Error(`Sessions konnten nicht geladen werden: ${scopedSessionsError.message}`);
  }

  if (teamsError) {
    throw new Error(`Teams konnten nicht geladen werden: ${teamsError.message}`);
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
            locale={locale}
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
            locale={locale}
          />
        </section>
      </main>
    );
  }

  if (allPlayerTeamIds.length === 0) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
          <StatsIntro
            scope={scope}
            seasonName={currentSeasonName}
            primaryColorKey={primaryColorKey}
            locale={locale}
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
            locale={locale}
          />
        </section>
      </main>
    );
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
            locale={locale}
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
            locale={locale}
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

  const relevantResultSessionIds = Array.from(
    new Set(
      myResults
        .map((result) => result.session_id)
        .filter((value) => Number.isFinite(value))
    )
  );

  const teamPlayersPromise =
    relevantTeamIds.length > 0
      ? supabase
          .from("team_players")
          .select("team_id, player_id")
          .in("team_id", relevantTeamIds)
      : Promise.resolve({ data: [] as TeamPlayerRow[], error: null });

  const mvpVotesPromise =
    flags.session_mvp_voting && relevantResultSessionIds.length > 0
      ? supabase
          .from("session_mvp_votes")
          .select("session_id, voted_player_id")
          .eq("club_id", clubId)
          .in("session_id", relevantResultSessionIds)
      : Promise.resolve({ data: [] as MvpVoteRow[], error: null });

  const [
    { data: teamPlayersData, error: teamPlayersError },
    { data: mvpVotesData, error: mvpVotesError },
  ] = await Promise.all([teamPlayersPromise, mvpVotesPromise]);

  if (teamPlayersError) {
    throw new Error(
      `Team-Spieler konnten nicht geladen werden: ${teamPlayersError.message}`
    );
  }

  if (mvpVotesError) {
    throw new Error(
      `MVP-Stimmen konnten nicht geladen werden: ${mvpVotesError.message}`
    );
  }

  const teamPlayers = (teamPlayersData ?? []) as TeamPlayerRow[];
  const teamScoreById = new Map<number, number>();

  if (relevantTeamIds.length > 0) {
    const teamBuckets = new Map<number, TeamPlayerRow[]>();

    for (const row of teamPlayers) {
      const current = teamBuckets.get(row.team_id) ?? [];
      current.push(row);
      teamBuckets.set(row.team_id, current);
    }

    if (useStrength) {
      const playerIds = Array.from(
        new Set(teamPlayers.map((row) => row.player_id).filter(Number.isFinite))
      );

      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, strength")
        .in("id", playerIds.length > 0 ? playerIds : [-1]);

      if (playersError) {
        throw new Error(
          `Spieler-Stärken konnten nicht geladen werden: ${playersError.message}`
        );
      }

      const players = (playersData ?? []) as PlayerStrengthRow[];
      const strengthByPlayerId = new Map<number, number>(
        players.map((p) => [p.id, p.strength ?? strengthDefault])
      );

      for (const teamId of relevantTeamIds) {
        const rows = teamBuckets.get(teamId) ?? [];
        const score = rows.reduce((sum, row) => {
          return sum + (strengthByPlayerId.get(row.player_id) ?? strengthDefault);
        }, 0);

        teamScoreById.set(teamId, score);
      }
    } else {
      for (const teamId of relevantTeamIds) {
        teamScoreById.set(teamId, (teamBuckets.get(teamId) ?? []).length);
      }
    }
  }

  let mvpWins = 0;
  let mvpPerGame = 0;

  if (flags.session_mvp_voting && myResults.length > 0) {
    const relevantResultSessionIdSet = new Set(relevantResultSessionIds);
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
        !relevantResultSessionIdSet.has(voteSessionId) ||
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

      if (winnerIds.includes(viewPlayer.id)) {
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

  const impactDetails: ImpactDetail[] = [];

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

    const date = sessionsById.get(result.session_id)?.date ?? null;
    const scoreLabel = `${goalsA}:${goalsB}`;
    const myTeamLabel = myTeamIsA ? "Team 1" : "Team 2";

    impactDetails.push({
      sessionId: result.session_id,
      date,
      scoreLabel,
      myTeamLabel,
      myTeamScore,
      opponentScore,
      goalsFor,
      goalsAgainst,
      impactValue,
      explanation: getImpactExplanation(
        {
          outcome,
          myTeamScore,
          opponentScore,
          impactValue,
        },
        locale,
      ),
    });

    return {
      sessionId: result.session_id,
      date,
      outcome,
      scoreLabel,
      myTeamLabel,
    };
  });

  recentResults.sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  impactDetails.sort((a, b) => {
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
  const impactMeta = getImpactMeta(impactPerMatch, locale);

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <StatsIntro
          scope={scope}
          seasonName={currentSeasonName}
          primaryColorKey={primaryColorKey}
          locale={locale}
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
            title={t("stats.myForm")}
            subtitle={t("stats.trendCount", { count: trendPoints.length })}
            defaultOpen={true}
            icon={<TrendingUp className="h-5 w-5" />}
          >
            <PlayerTrendCard enabled={true} points={trendPoints} />
          </StatsSection>
        ) : null}

        {flags.team_impact ? (
          <StatsSection
            title={t("stats.teamImpact")}
            subtitle={t("stats.impactShortHint")}
            defaultOpen={false}
            icon={<UsersRound className="h-5 w-5" />}
          >
            <TeamImpactCard
              impactGames={totals.impactGames}
              impactWins={totals.impactWins}
              impactTotal={totals.impactTotal}
              impactPerMatch={impactPerMatch}
              impactDetails={impactDetails}
              impactMeta={impactMeta}
            />
          </StatsSection>
        ) : null}

        <StatsSection
          title={t("stats.recentResults")}
          subtitle={t("stats.recentFiveHint")}
          defaultOpen={true}
          icon={<History className="h-5 w-5" />}
        >
          <RecentResultsCard results={lastFive} />
        </StatsSection>

        {flags.session_mvp_voting ? (
          <StatsSection
            title={t("stats.badges")}
            subtitle={t("stats.badgesHint")}
            defaultOpen={true}
            icon={<Award className="h-5 w-5" />}
          >
            <div className="space-y-4">
              <BadgeProgressCard
                mvpCount={badgeMvpCount}
                title={t("stats.badgeProgress")}
              />

              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-800">
                  Preview
                </div>

                <div className="mt-3 text-sm font-black text-slate-950">
                  {t("stats.trophyRoomComing")}
                </div>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {t("stats.trophyRoomText")}
                </p>

                <div className="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    {t("stats.unlockedVisible")}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    {t("stats.openGreyed")}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    {t("stats.frequencyStreaks")}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
                    {t("stats.shareLater")}
                  </div>
                </div>

                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {t("stats.awardsPreviewHint")}
                </p>
              </div>
            </div>
          </StatsSection>
        ) : null}
      </section>
    </main>
  );
}
