import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  BADGE_DEFINITIONS,
  getBadgeDefinition,
  type BadgeKey,
} from "@/lib/badges/catalog";

const BADGE_FEATURE_KEY = "hall_of_fame_badges";

type SessionRow = {
  id: number;
  date: string;
  season_id: number | null;
  type: string | null;
};

type SeasonRow = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type PlayerRow = {
  id: number;
  user_id: string | null;
  is_guest: boolean | null;
};

type SessionPlayerRow = {
  session_id: number | null;
  player_id: number | null;
};

type ResultRow = {
  session_id: number | null;
  team_a_id: number | null;
  team_b_id: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type TeamPlayerRow = {
  team_id: number | null;
  player_id: number | null;
};

type ExistingAchievementRow = {
  player_id: number;
  badge_key: string;
  season_ref: string;
};

type ClubSettingsRow = {
  badges_started_at: string | null;
  badges_activation_season_id: number | null;
};

type Outcome = "win" | "loss" | "draw";

type AchievementCandidate = {
  club_id: string;
  player_id: number;
  badge_key: BadgeKey;
  season_id: number | null;
  season_ref: string;
  grant_reason: Record<string, string | number | boolean | null>;
};

export type AchievementSyncResult = {
  enabled: boolean;
  badgesStartedAt: string | null;
  inserted: Array<{
    playerId: number;
    badgeKey: BadgeKey;
    title: string;
    seasonRef: string;
  }>;
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isTrainingSession(session: SessionRow) {
  return !session.type || session.type === "training";
}

function isSeasonCurrentOnDate(season: SeasonRow, dateIso: string) {
  if (season.start_date && season.start_date > dateIso) return false;
  if (season.end_date && season.end_date < dateIso) return false;
  return Boolean(season.start_date || season.end_date);
}

function findCurrentSeason(seasons: SeasonRow[], dateIso: string) {
  const exact = seasons.find((season) => isSeasonCurrentOnDate(season, dateIso));
  if (exact) return exact;

  return (
    seasons.find(
      (season) => !season.start_date || season.start_date <= dateIso,
    ) ?? seasons[0] ?? null
  );
}

async function isBadgeFeatureEnabled(clubId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("club_feature_flags")
    .select("enabled")
    .eq("club_id", clubId)
    .eq("feature_key", BADGE_FEATURE_KEY)
    .maybeSingle<{ enabled: boolean }>();

  if (error) {
    throw new Error(`Badge-Feature-Flag konnte nicht geladen werden: ${error.message}`);
  }

  return data?.enabled === true;
}

async function ensureBadgeActivation(clubId: string) {
  const supabase = createAdminClient();
  const nowDate = todayIso();

  const [
    { data: settingsData, error: settingsError },
    { data: seasonsData, error: seasonsError },
  ] = await Promise.all([
    supabase
      .from("club_settings")
      .select("badges_started_at, badges_activation_season_id")
      .eq("club_id", clubId)
      .maybeSingle<ClubSettingsRow>(),
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
  ]);

  if (settingsError) {
    throw new Error(`Badge-Start konnte nicht geladen werden: ${settingsError.message}`);
  }

  if (seasonsError) {
    throw new Error(`Saisons konnten für Badges nicht geladen werden: ${seasonsError.message}`);
  }

  const seasons = (seasonsData ?? []) as SeasonRow[];
  const currentSeason = findCurrentSeason(seasons, nowDate);
  const badgesStartedAt = settingsData?.badges_started_at ?? nowDate;
  const activationSeasonId =
    settingsData?.badges_activation_season_id ?? currentSeason?.id ?? null;

  if (
    !settingsData?.badges_started_at ||
    settingsData.badges_activation_season_id == null
  ) {
    const { error: updateError } = await supabase.from("club_settings").upsert(
      {
        club_id: clubId,
        badges_started_at: badgesStartedAt,
        badges_activation_season_id: activationSeasonId,
      },
      { onConflict: "club_id" },
    );

    if (updateError) {
      throw new Error(`Badge-Start konnte nicht gespeichert werden: ${updateError.message}`);
    }
  }

  return {
    badgesStartedAt,
    activationSeasonId,
    seasons,
  };
}

function buildPresentPlayersBySession(rows: SessionPlayerRow[]) {
  const presentBySession = new Map<number, Set<number>>();

  for (const row of rows) {
    if (row.session_id == null || row.player_id == null) continue;

    if (!presentBySession.has(row.session_id)) {
      presentBySession.set(row.session_id, new Set<number>());
    }

    presentBySession.get(row.session_id)!.add(row.player_id);
  }

  return presentBySession;
}

function buildPlayersByTeam(rows: TeamPlayerRow[]) {
  const playersByTeam = new Map<number, Set<number>>();

  for (const row of rows) {
    if (row.team_id == null || row.player_id == null) continue;

    if (!playersByTeam.has(row.team_id)) {
      playersByTeam.set(row.team_id, new Set<number>());
    }

    playersByTeam.get(row.team_id)!.add(row.player_id);
  }

  return playersByTeam;
}

function buildOutcomesBySession(
  results: ResultRow[],
  playersByTeam: Map<number, Set<number>>,
) {
  const outcomesBySession = new Map<number, Map<number, Outcome>>();

  for (const result of results) {
    if (
      result.session_id == null ||
      result.team_a_id == null ||
      result.team_b_id == null ||
      result.goals_team_a == null ||
      result.goals_team_b == null
    ) {
      continue;
    }

    const outcomes = new Map<number, Outcome>();
    const teamAPlayers = playersByTeam.get(result.team_a_id) ?? new Set<number>();
    const teamBPlayers = playersByTeam.get(result.team_b_id) ?? new Set<number>();

    let outcomeA: Outcome = "draw";
    let outcomeB: Outcome = "draw";

    if (result.goals_team_a > result.goals_team_b) {
      outcomeA = "win";
      outcomeB = "loss";
    } else if (result.goals_team_b > result.goals_team_a) {
      outcomeA = "loss";
      outcomeB = "win";
    }

    for (const playerId of teamAPlayers) outcomes.set(playerId, outcomeA);
    for (const playerId of teamBPlayers) outcomes.set(playerId, outcomeB);

    outcomesBySession.set(result.session_id, outcomes);
  }

  return outcomesBySession;
}

function addCandidate(
  target: AchievementCandidate[],
  candidate: AchievementCandidate,
) {
  if (!getBadgeDefinition(candidate.badge_key)) return;

  const duplicate = target.some(
    (item) =>
      item.player_id === candidate.player_id &&
      item.badge_key === candidate.badge_key &&
      item.season_ref === candidate.season_ref,
  );

  if (!duplicate) target.push(candidate);
}

function addThresholdBadges(params: {
  candidates: AchievementCandidate[];
  clubId: string;
  playerId: number;
  seasonId: number | null;
  seasonRef: string;
  value: number;
  metric: string;
  thresholds: Array<[number, BadgeKey]>;
}) {
  for (const [threshold, badgeKey] of params.thresholds) {
    if (params.value < threshold) continue;

    addCandidate(params.candidates, {
      club_id: params.clubId,
      player_id: params.playerId,
      badge_key: badgeKey,
      season_id: params.seasonId,
      season_ref: params.seasonRef,
      grant_reason: {
        metric: params.metric,
        value: params.value,
        threshold,
      },
    });
  }
}

function computeMaxAttendanceStreak(
  playerId: number,
  sessions: SessionRow[],
  presentBySession: Map<number, Set<number>>,
) {
  let current = 0;
  let max = 0;

  for (const session of sessions) {
    const present = presentBySession.get(session.id)?.has(playerId) === true;

    if (present) {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }

  return max;
}

function computeOutcomeMetrics(
  playerId: number,
  sessions: SessionRow[],
  presentBySession: Map<number, Set<number>>,
  outcomesBySession: Map<number, Map<number, Outcome>>,
) {
  let currentWins = 0;
  let currentLosses = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let wins = 0;
  let losses = 0;
  let draws = 0;
  let curseBroken = false;
  let comeback = false;
  let hasAppeared = false;
  let missedSinceAppearance = 0;

  for (const session of sessions) {
    const present = presentBySession.get(session.id)?.has(playerId) === true;

    if (!present) {
      if (hasAppeared) missedSinceAppearance += 1;
      currentWins = 0;
      currentLosses = 0;
      continue;
    }

    const outcome = outcomesBySession.get(session.id)?.get(playerId) ?? null;

    if (hasAppeared && missedSinceAppearance >= 3 && outcome === "win") {
      comeback = true;
    }

    hasAppeared = true;
    missedSinceAppearance = 0;

    if (!outcome) {
      continue;
    }

    if (outcome === "win") {
      wins += 1;
      if (currentLosses >= 3) curseBroken = true;
      currentWins += 1;
      currentLosses = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWins);
      continue;
    }

    if (outcome === "loss") {
      losses += 1;
      currentLosses += 1;
      currentWins = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLosses);
      continue;
    }

    draws += 1;
    currentWins = 0;
    currentLosses = 0;
  }

  return {
    wins,
    losses,
    draws,
    decided: wins + losses,
    maxWinStreak,
    maxLossStreak,
    curseBroken,
    comeback,
  };
}

export async function syncClubAchievements(
  clubId: string,
): Promise<AchievementSyncResult> {
  const enabled = await isBadgeFeatureEnabled(clubId);

  if (!enabled) {
    return {
      enabled: false,
      badgesStartedAt: null,
      inserted: [],
    };
  }

  const { badgesStartedAt, seasons } = await ensureBadgeActivation(clubId);
  const supabase = createAdminClient();

  const [
    { data: playersData, error: playersError },
    { data: sessionsData, error: sessionsError },
    { data: existingData, error: existingError },
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, user_id, is_guest")
      .eq("club_id", clubId),
    supabase
      .from("sessions")
      .select("id, date, season_id, type")
      .eq("club_id", clubId)
      .order("date", { ascending: true }),
    supabase
      .from("player_achievements")
      .select("player_id, badge_key, season_ref")
      .eq("club_id", clubId),
  ]);

  if (playersError) {
    throw new Error(`Spieler konnten für Badges nicht geladen werden: ${playersError.message}`);
  }

  if (sessionsError) {
    throw new Error(`Sessions konnten für Badges nicht geladen werden: ${sessionsError.message}`);
  }

  if (existingError) {
    throw new Error(`Vorhandene Badges konnten nicht geladen werden: ${existingError.message}`);
  }

  const players = ((playersData ?? []) as PlayerRow[]).filter(
    (player) => player.is_guest !== true,
  );
  const sessions = ((sessionsData ?? []) as SessionRow[]).filter(isTrainingSession);
  const sessionIds = sessions.map((session) => session.id);

  if (players.length === 0 || sessionIds.length === 0) {
    return {
      enabled: true,
      badgesStartedAt,
      inserted: [],
    };
  }

  const [
    { data: sessionPlayersData, error: sessionPlayersError },
    { data: resultsData, error: resultsError },
  ] = await Promise.all([
    supabase
      .from("session_players")
      .select("session_id, player_id")
      .in("session_id", sessionIds),
    supabase
      .from("results")
      .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
      .eq("club_id", clubId)
      .in("session_id", sessionIds),
  ]);

  if (sessionPlayersError) {
    throw new Error(
      `Teilnahmen konnten für Badges nicht geladen werden: ${sessionPlayersError.message}`,
    );
  }

  if (resultsError) {
    throw new Error(`Ergebnisse konnten für Badges nicht geladen werden: ${resultsError.message}`);
  }

  const results = (resultsData ?? []) as ResultRow[];
  const teamIds = Array.from(
    new Set(
      results
        .flatMap((result) => [result.team_a_id, result.team_b_id])
        .filter((value): value is number => value != null),
    ),
  );

  const teamPlayersPromise =
    teamIds.length > 0
      ? supabase
          .from("team_players")
          .select("team_id, player_id")
          .in("team_id", teamIds)
      : Promise.resolve({ data: [] as TeamPlayerRow[], error: null });

  const { data: teamPlayersData, error: teamPlayersError } = await teamPlayersPromise;

  if (teamPlayersError) {
    throw new Error(
      `Team-Zuordnungen konnten für Badges nicht geladen werden: ${teamPlayersError.message}`,
    );
  }

  const presentBySession = buildPresentPlayersBySession(
    (sessionPlayersData ?? []) as SessionPlayerRow[],
  );
  const playersByTeam = buildPlayersByTeam(
    (teamPlayersData ?? []) as TeamPlayerRow[],
  );
  const outcomesBySession = buildOutcomesBySession(results, playersByTeam);
  const candidates: AchievementCandidate[] = [];

  for (const player of players) {
    const careerAppearances = sessions.filter(
      (session) => presentBySession.get(session.id)?.has(player.id) === true,
    ).length;
    const careerWins = sessions.reduce((sum, session) => {
      return outcomesBySession.get(session.id)?.get(player.id) === "win"
        ? sum + 1
        : sum;
    }, 0);

    addThresholdBadges({
      candidates,
      clubId,
      playerId: player.id,
      seasonId: null,
      seasonRef: "career",
      value: careerAppearances,
      metric: "career_appearances",
      thresholds: [
        [10, "career_appearances_10"],
        [25, "career_appearances_25"],
        [50, "career_appearances_50"],
        [100, "career_appearances_100"],
        [250, "career_appearances_250"],
        [500, "career_appearances_500"],
      ],
    });

    addThresholdBadges({
      candidates,
      clubId,
      playerId: player.id,
      seasonId: null,
      seasonRef: "career",
      value: careerWins,
      metric: "career_wins",
      thresholds: [
        [1, "career_wins_1"],
        [10, "career_wins_10"],
        [25, "career_wins_25"],
        [50, "career_wins_50"],
        [100, "career_wins_100"],
        [250, "career_wins_250"],
      ],
    });

    for (const season of seasons) {
      const seasonSessions = sessions.filter(
        (session) =>
          session.season_id === season.id && session.date >= badgesStartedAt,
      );

      if (seasonSessions.length === 0) continue;

      const appearances = seasonSessions.filter(
        (session) => presentBySession.get(session.id)?.has(player.id) === true,
      ).length;

      if (appearances === 0) continue;

      const seasonRef = `season:${season.id}`;
      const attendanceStreak = computeMaxAttendanceStreak(
        player.id,
        seasonSessions,
        presentBySession,
      );
      const outcomes = computeOutcomeMetrics(
        player.id,
        seasonSessions,
        presentBySession,
        outcomesBySession,
      );

      addCandidate(candidates, {
        club_id: clubId,
        player_id: player.id,
        badge_key: "season_kickoff",
        season_id: season.id,
        season_ref: seasonRef,
        grant_reason: {
          metric: "season_appearance",
          value: appearances,
          season: season.name,
        },
      });

      addThresholdBadges({
        candidates,
        clubId,
        playerId: player.id,
        seasonId: season.id,
        seasonRef,
        value: attendanceStreak,
        metric: "attendance_streak",
        thresholds: [
          [3, "attendance_streak_3"],
          [5, "attendance_streak_5"],
          [10, "attendance_streak_10"],
          [15, "attendance_streak_15"],
          [20, "attendance_streak_20"],
        ],
      });

      addThresholdBadges({
        candidates,
        clubId,
        playerId: player.id,
        seasonId: season.id,
        seasonRef,
        value: outcomes.maxWinStreak,
        metric: "win_streak",
        thresholds: [
          [1, "win_streak_1"],
          [3, "win_streak_3"],
          [5, "win_streak_5"],
          [7, "win_streak_7"],
          [10, "win_streak_10"],
        ],
      });

      addThresholdBadges({
        candidates,
        clubId,
        playerId: player.id,
        seasonId: season.id,
        seasonRef,
        value: outcomes.maxLossStreak,
        metric: "loss_streak",
        thresholds: [
          [3, "loss_streak_3"],
          [5, "loss_streak_5"],
          [7, "loss_streak_7"],
        ],
      });

      if (outcomes.curseBroken) {
        addCandidate(candidates, {
          club_id: clubId,
          player_id: player.id,
          badge_key: "curse_broken",
          season_id: season.id,
          season_ref: seasonRef,
          grant_reason: {
            metric: "curse_broken",
            threshold: 3,
            season: season.name,
          },
        });
      }

      if (appearances >= 8 && outcomes.losses >= 5) {
        addCandidate(candidates, {
          club_id: clubId,
          player_id: player.id,
          badge_key: "resilient",
          season_id: season.id,
          season_ref: seasonRef,
          grant_reason: {
            metric: "resilience",
            appearances,
            losses: outcomes.losses,
            season: season.name,
          },
        });
      }

      const winRate = outcomes.decided > 0 ? outcomes.wins / outcomes.decided : 0;

      if (outcomes.decided >= 10 && winRate >= 0.7) {
        addCandidate(candidates, {
          club_id: clubId,
          player_id: player.id,
          badge_key: "lucky_charm",
          season_id: season.id,
          season_ref: seasonRef,
          grant_reason: {
            metric: "win_rate",
            decided: outcomes.decided,
            wins: outcomes.wins,
            win_rate: Number(winRate.toFixed(4)),
            season: season.name,
          },
        });
      }

      if (outcomes.comeback) {
        addCandidate(candidates, {
          club_id: clubId,
          player_id: player.id,
          badge_key: "comeback",
          season_id: season.id,
          season_ref: seasonRef,
          grant_reason: {
            metric: "comeback_after_absence",
            missed_sessions: 3,
            season: season.name,
          },
        });
      }
    }
  }

  const existingKeys = new Set(
    ((existingData ?? []) as ExistingAchievementRow[]).map(
      (row) => `${row.player_id}:${row.badge_key}:${row.season_ref}`,
    ),
  );
  const toInsert = candidates.filter(
    (candidate) =>
      !existingKeys.has(
        `${candidate.player_id}:${candidate.badge_key}:${candidate.season_ref}`,
      ),
  );

  if (toInsert.length === 0) {
    return {
      enabled: true,
      badgesStartedAt,
      inserted: [],
    };
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("player_achievements")
    .insert(toInsert)
    .select("player_id, badge_key, season_ref");

  if (insertError) {
    throw new Error(`Neue Badges konnten nicht gespeichert werden: ${insertError.message}`);
  }

  const inserted = ((insertedData ?? []) as ExistingAchievementRow[])
    .map((row) => {
      const badge = getBadgeDefinition(row.badge_key);
      if (!badge) return null;

      return {
        playerId: row.player_id,
        badgeKey: badge.key as BadgeKey,
        title: badge.title,
        seasonRef: row.season_ref,
      };
    })
    .filter(
      (
        item,
      ): item is {
        playerId: number;
        badgeKey: BadgeKey;
        title: string;
        seasonRef: string;
      } => item !== null,
    );

  return {
    enabled: true,
    badgesStartedAt,
    inserted,
  };
}

export function getBadgeCatalogSize() {
  return BADGE_DEFINITIONS.length;
}
