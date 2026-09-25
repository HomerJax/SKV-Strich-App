import "server-only";

import { getBadgeDefinition } from "@/lib/badges/catalog";
import { createClient } from "@/lib/supabase/server";

export type TeamFeedItem = {
  id: string;
  kind: "badge" | "result";
  title: string;
  body: string;
  href: string;
  occurredAt: string;
};

type SessionRow = {
  id: number;
  date: string;
  start_time: string | null;
};

type ResultRow = {
  session_id: number;
  game_no: number | null;
  goals_team_a: number | null;
  goals_team_b: number | null;
};

type BadgePlayer = {
  first_name: string | null;
  last_name: string | null;
  nickname?: string | null;
};

type AchievementRow = {
  id: string;
  player_id: number;
  badge_key: string;
  earned_at: string;
  players: BadgePlayer | BadgePlayer[] | null;
};

function playerName(player: BadgePlayer | BadgePlayer[] | null) {
  const value = Array.isArray(player) ? player[0] ?? null : player;
  if (!value) return "Ein Spieler";

  const nickname = value.nickname?.trim();
  if (nickname) return nickname;

  const name = [value.first_name, value.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Ein Spieler";
}

function resultSummary(rows: ResultRow[]) {
  const sorted = [...rows].sort(
    (a, b) => Number(a.game_no ?? 1) - Number(b.game_no ?? 1),
  );

  const scores = sorted
    .filter(
      (row) =>
        typeof row.goals_team_a === "number" &&
        typeof row.goals_team_b === "number",
    )
    .map((row) => `${row.goals_team_a}:${row.goals_team_b}`);

  if (scores.length === 0) return null;
  if (scores.length === 1) return `Ergebnis ${scores[0]}`;
  return `${scores.length} Spiele · ${scores.join(" · ")}`;
}

function sessionOccurredAt(session: SessionRow) {
  const time = session.start_time?.slice(0, 5) || "12:00";
  return `${session.date}T${time}:00`;
}

export async function getTeamFeedItems(
  clubId: string,
  limit = 20,
): Promise<TeamFeedItem[]> {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: sessionsData } = await supabase
    .from("sessions")
    .select("id, date, start_time")
    .eq("club_id", clubId)
    .lte("date", today)
    .order("date", { ascending: false })
    .limit(Math.max(12, limit * 3));

  const sessions = (sessionsData ?? []) as SessionRow[];
  const sessionIds = sessions.map((session) => session.id);

  let resultRows: ResultRow[] = [];
  if (sessionIds.length > 0) {
    const { data } = await supabase
      .from("results")
      .select("session_id, game_no, goals_team_a, goals_team_b")
      .in("session_id", sessionIds);

    resultRows = (data ?? []) as ResultRow[];
  }

  const resultRowsBySession = new Map<number, ResultRow[]>();
  for (const row of resultRows) {
    const list = resultRowsBySession.get(row.session_id) ?? [];
    list.push(row);
    resultRowsBySession.set(row.session_id, list);
  }

  const resultItems: TeamFeedItem[] = sessions.flatMap((session) => {
    const summary = resultSummary(resultRowsBySession.get(session.id) ?? []);
    if (!summary) return [];

    return [{
      id: `result:${session.id}`,
      kind: "result" as const,
      title: "Training abgeschlossen",
      body: summary,
      href: `/sessions/${session.id}`,
      occurredAt: sessionOccurredAt(session),
    }];
  });

  const { data: achievementsData, error: achievementsError } = await supabase
    .from("player_achievements")
    .select(`
      id,
      player_id,
      badge_key,
      earned_at,
      players (
        first_name,
        last_name,
        nickname
      )
    `)
    .eq("club_id", clubId)
    .order("earned_at", { ascending: false })
    .limit(Math.max(12, limit * 3));

  const badgeItems: TeamFeedItem[] = achievementsError
    ? []
    : ((achievementsData ?? []) as AchievementRow[]).flatMap((achievement) => {
        const badge = getBadgeDefinition(achievement.badge_key);
        if (!badge) return [];

        return [{
          id: `badge:${achievement.id}`,
          kind: "badge" as const,
          title: `${playerName(achievement.players)} hat „${badge.title}“ erreicht`,
          body: badge.description,
          href: `/badges?player=${achievement.player_id}`,
          occurredAt: achievement.earned_at,
        }];
      });

  return [...badgeItems, ...resultItems]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);
}


export async function getAchievementFeedItem(params: {
  clubId: string;
  playerId: number;
  badgeKey: string;
}): Promise<TeamFeedItem | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("player_achievements")
    .select(`
      id,
      player_id,
      badge_key,
      earned_at,
      players (
        first_name,
        last_name,
        nickname
      )
    `)
    .eq("club_id", params.clubId)
    .eq("player_id", params.playerId)
    .eq("badge_key", params.badgeKey)
    .order("earned_at", { ascending: false })
    .limit(1)
    .maybeSingle<AchievementRow>();

  if (error || !data) return null;

  const badge = getBadgeDefinition(data.badge_key);
  if (!badge) return null;

  return {
    id: `badge:${data.id}`,
    kind: "badge",
    title: `${playerName(data.players)} hat „${badge.title}“ erreicht`,
    body: badge.description,
    href: `/badges?player=${data.player_id}`,
    occurredAt: data.earned_at,
  };
}
