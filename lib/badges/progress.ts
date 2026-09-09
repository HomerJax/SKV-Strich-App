import "server-only";

import { getBadgeDefinition } from "@/lib/badges/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

type SessionRow = {
  id: number;
  date: string;
  season_id: number | null;
  type: string | null;
};

type SeasonRow = {
  id: number;
  start_date: string | null;
  end_date: string | null;
};

type AttendanceRow = {
  session_id: number | null;
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
};

type AchievementRow = {
  badge_key: string;
};

type SettingsRow = {
  badges_started_at: string | null;
};

type Outcome = "win" | "loss" | "draw";

export type BadgeProgressItem = {
  badgeKey: string;
  title: string;
  description: string;
  scope: "career" | "season";
  metric: "appearances" | "wins" | "attendance_streak" | "win_streak";
  current: number;
  target: number;
  remaining: number;
  progressPercent: number;
  unit: "Teilnahmen" | "Siege" | "Trainings";
};

export type PlayerBadgeProgress = {
  earnedCount: number;
  appearances: number;
  wins: number;
  attendanceStreak: number;
  winStreak: number;
  items: BadgeProgressItem[];
};

const APPEARANCE_TARGETS = [
  [10, "career_appearances_10"],
  [25, "career_appearances_25"],
  [50, "career_appearances_50"],
  [100, "career_appearances_100"],
  [250, "career_appearances_250"],
  [500, "career_appearances_500"],
] as const;

const CAREER_WIN_TARGETS = [
  [1, "career_wins_1"],
  [10, "career_wins_10"],
  [25, "career_wins_25"],
  [50, "career_wins_50"],
  [100, "career_wins_100"],
  [250, "career_wins_250"],
] as const;

const ATTENDANCE_STREAK_TARGETS = [
  [3, "attendance_streak_3"],
  [5, "attendance_streak_5"],
  [10, "attendance_streak_10"],
  [15, "attendance_streak_15"],
  [20, "attendance_streak_20"],
] as const;

const WIN_STREAK_TARGETS = [
  [1, "win_streak_1"],
  [3, "win_streak_3"],
  [5, "win_streak_5"],
  [7, "win_streak_7"],
  [10, "win_streak_10"],
] as const;

function isTrainingSession(session: SessionRow) {
  return !session.type || session.type === "training";
}

function isCurrentSeason(season: SeasonRow, today: string) {
  if (season.start_date && season.start_date > today) return false;
  if (season.end_date && season.end_date < today) return false;
  return Boolean(season.start_date || season.end_date);
}

function findCurrentSeason(seasons: SeasonRow[], today: string) {
  return (
    seasons.find((season) => isCurrentSeason(season, today)) ??
    seasons.find((season) => !season.start_date || season.start_date <= today) ??
    seasons[0] ??
    null
  );
}

function toProgressItem(params: {
  badgeKey: string;
  metric: BadgeProgressItem["metric"];
  current: number;
  target: number;
  unit: BadgeProgressItem["unit"];
}): BadgeProgressItem | null {
  const definition = getBadgeDefinition(params.badgeKey);
  if (!definition) return null;

  const remaining = Math.max(0, params.target - params.current);
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round((params.current / params.target) * 100)),
  );

  return {
    badgeKey: params.badgeKey,
    title: definition.title,
    description: definition.description,
    scope: definition.scope,
    metric: params.metric,
    current: params.current,
    target: params.target,
    remaining,
    progressPercent,
    unit: params.unit,
  };
}

function nextTarget(
  targets: readonly (readonly [number, string])[],
  current: number,
  earned: Set<string>,
) {
  return targets.find(([target, badgeKey]) => current < target && !earned.has(badgeKey)) ?? null;
}

export async function getPlayerBadgeProgress(
  clubId: string,
  playerId: number,
): Promise<PlayerBadgeProgress> {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: sessionsData, error: sessionsError },
    { data: seasonsData, error: seasonsError },
    { data: settingsData },
    { data: achievementsData, error: achievementsError },
  ] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date, season_id, type")
      .eq("club_id", clubId)
      .lte("date", today)
      .order("date", { ascending: true }),
    supabase
      .from("seasons")
      .select("id, start_date, end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
    supabase
      .from("club_settings")
      .select("badges_started_at")
      .eq("club_id", clubId)
      .maybeSingle<SettingsRow>(),
    supabase
      .from("player_achievements")
      .select("badge_key")
      .eq("club_id", clubId)
      .eq("player_id", playerId),
  ]);

  if (sessionsError) {
    throw new Error(`Sessions konnten für Badge-Fortschritt nicht geladen werden: ${sessionsError.message}`);
  }
  if (seasonsError) {
    throw new Error(`Saisons konnten für Badge-Fortschritt nicht geladen werden: ${seasonsError.message}`);
  }
  if (achievementsError) {
    throw new Error(`Achievements konnten für Badge-Fortschritt nicht geladen werden: ${achievementsError.message}`);
  }

  const sessions = ((sessionsData ?? []) as SessionRow[]).filter(isTrainingSession);
  const sessionIds = sessions.map((session) => session.id);
  const seasons = (seasonsData ?? []) as SeasonRow[];
  const currentSeason = findCurrentSeason(seasons, today);
  const badgesStartedAt = settingsData?.badges_started_at ?? null;
  const earned = new Set(
    ((achievementsData ?? []) as AchievementRow[]).map((row) => row.badge_key),
  );

  if (sessionIds.length === 0) {
    return {
      earnedCount: earned.size,
      appearances: 0,
      wins: 0,
      attendanceStreak: 0,
      winStreak: 0,
      items: [],
    };
  }

  const [
    { data: attendanceData, error: attendanceError },
    { data: resultsData, error: resultsError },
  ] = await Promise.all([
    supabase
      .from("session_players")
      .select("session_id")
      .eq("player_id", playerId)
      .in("session_id", sessionIds),
    supabase
      .from("results")
      .select("session_id, team_a_id, team_b_id, goals_team_a, goals_team_b")
      .eq("club_id", clubId)
      .in("session_id", sessionIds),
  ]);

  if (attendanceError) {
    throw new Error(`Teilnahmen konnten für Badge-Fortschritt nicht geladen werden: ${attendanceError.message}`);
  }
  if (resultsError) {
    throw new Error(`Ergebnisse konnten für Badge-Fortschritt nicht geladen werden: ${resultsError.message}`);
  }

  const presentSessionIds = new Set(
    ((attendanceData ?? []) as AttendanceRow[])
      .map((row) => row.session_id)
      .filter((value): value is number => value != null),
  );

  const results = (resultsData ?? []) as ResultRow[];
  const teamIds = Array.from(
    new Set(
      results
        .flatMap((result) => [result.team_a_id, result.team_b_id])
        .filter((value): value is number => value != null),
    ),
  );

  const { data: teamPlayersData, error: teamPlayersError } =
    teamIds.length > 0
      ? await supabase
          .from("team_players")
          .select("team_id")
          .eq("player_id", playerId)
          .in("team_id", teamIds)
      : { data: [] as TeamPlayerRow[], error: null };

  if (teamPlayersError) {
    throw new Error(`Team-Zuordnungen konnten für Badge-Fortschritt nicht geladen werden: ${teamPlayersError.message}`);
  }

  const ownTeamIds = new Set(
    ((teamPlayersData ?? []) as TeamPlayerRow[])
      .map((row) => row.team_id)
      .filter((value): value is number => value != null),
  );

  const outcomesBySession = new Map<number, Outcome>();
  for (const result of results) {
    if (
      result.session_id == null ||
      result.goals_team_a == null ||
      result.goals_team_b == null
    ) {
      continue;
    }

    const isTeamA = result.team_a_id != null && ownTeamIds.has(result.team_a_id);
    const isTeamB = result.team_b_id != null && ownTeamIds.has(result.team_b_id);
    if (!isTeamA && !isTeamB) continue;

    if (result.goals_team_a === result.goals_team_b) {
      outcomesBySession.set(result.session_id, "draw");
    } else if (
      (isTeamA && result.goals_team_a > result.goals_team_b) ||
      (isTeamB && result.goals_team_b > result.goals_team_a)
    ) {
      outcomesBySession.set(result.session_id, "win");
    } else {
      outcomesBySession.set(result.session_id, "loss");
    }
  }

  const appearances = presentSessionIds.size;
  const wins = Array.from(outcomesBySession.values()).filter((outcome) => outcome === "win").length;

  const eligibleSeasonSessions = sessions.filter((session) => {
    if (currentSeason && session.season_id !== currentSeason.id) return false;
    if (badgesStartedAt && session.date < badgesStartedAt) return false;
    return true;
  });

  let attendanceStreak = 0;
  let winStreak = 0;

  for (let index = eligibleSeasonSessions.length - 1; index >= 0; index -= 1) {
    const session = eligibleSeasonSessions[index];
    const present = presentSessionIds.has(session.id);
    if (!present) break;
    attendanceStreak += 1;
  }

  for (let index = eligibleSeasonSessions.length - 1; index >= 0; index -= 1) {
    const session = eligibleSeasonSessions[index];
    const present = presentSessionIds.has(session.id);
    if (!present) break;

    const outcome = outcomesBySession.get(session.id) ?? null;
    if (!outcome) continue;
    if (outcome !== "win") break;
    winStreak += 1;
  }

  const items: BadgeProgressItem[] = [];

  const appearanceTarget = nextTarget(APPEARANCE_TARGETS, appearances, earned);
  if (appearanceTarget) {
    const item = toProgressItem({
      badgeKey: appearanceTarget[1],
      metric: "appearances",
      current: appearances,
      target: appearanceTarget[0],
      unit: "Teilnahmen",
    });
    if (item) items.push(item);
  }

  const careerWinTarget = nextTarget(CAREER_WIN_TARGETS, wins, earned);
  if (careerWinTarget) {
    const item = toProgressItem({
      badgeKey: careerWinTarget[1],
      metric: "wins",
      current: wins,
      target: careerWinTarget[0],
      unit: "Siege",
    });
    if (item) items.push(item);
  }

  const attendanceTarget = nextTarget(
    ATTENDANCE_STREAK_TARGETS,
    attendanceStreak,
    earned,
  );
  if (attendanceTarget) {
    const item = toProgressItem({
      badgeKey: attendanceTarget[1],
      metric: "attendance_streak",
      current: attendanceStreak,
      target: attendanceTarget[0],
      unit: "Trainings",
    });
    if (item) items.push(item);
  }

  const winStreakTarget = nextTarget(WIN_STREAK_TARGETS, winStreak, earned);
  if (winStreakTarget) {
    const item = toProgressItem({
      badgeKey: winStreakTarget[1],
      metric: "win_streak",
      current: winStreak,
      target: winStreakTarget[0],
      unit: "Siege",
    });
    if (item) items.push(item);
  }

  items.sort((a, b) => {
    if (b.progressPercent !== a.progressPercent) {
      return b.progressPercent - a.progressPercent;
    }
    if (a.remaining !== b.remaining) return a.remaining - b.remaining;
    return a.target - b.target;
  });

  return {
    earnedCount: earned.size,
    appearances,
    wins,
    attendanceStreak,
    winStreak,
    items: items.slice(0, 3),
  };
}
