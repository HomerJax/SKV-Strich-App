import "server-only";

import { getLocalizedBadgeDefinition } from "@/lib/badges/catalog";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/i18n/server";
import type { AppLocale } from "@/lib/i18n/config";

export type TeamFeedItem = {
  id: string;
  kind: "badge" | "result";
  title: string;
  body: string;
  href: string;
  occurredAt: string;
  badgeKey?: string;
  actorName?: string;
  badgeDetailText?: string;
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

function badgeNewsLabel(params: {
  badgeKey: string;
  scope: "season" | "career";
  category: "attendance" | "wins" | "losses" | "special" | "career";
}, locale: AppLocale) {
  if (params.badgeKey.startsWith("career_wins_")) {
    return locale === "de" ? "🏆 Karrieremeilenstein" : "🏆 Career milestone";
  }

  if (params.badgeKey.startsWith("career_appearances_")) {
    return locale === "de" ? "⚽ Einsatz-Jubiläum" : "⚽ Appearance milestone";
  }

  if (params.scope === "season" && params.category === "attendance") {
    return locale === "de" ? "🔥 Saison-Update" : "🔥 Season update";
  }

  if (params.scope === "season" && params.category === "wins") {
    return locale === "de" ? "📈 Serie läuft" : "📈 Winning streak";
  }

  if (params.scope === "season" && params.category === "losses") {
    return locale === "de" ? "😬 Kabinen-Update" : "😬 Dressing-room update";
  }

  if (params.category === "special") {
    return locale === "de" ? "✨ Neues Special" : "✨ New special";
  }

  return locale === "de" ? "🏅 Neues Badge erreicht" : "🏅 New badge unlocked";
}

function badgeNewsCopy(params: {
  badgeKey: string;
  actorName: string;
  fallbackTitle: string;
  scope: "season" | "career";
  category: "attendance" | "wins" | "losses" | "special" | "career";
}, locale: AppLocale) {
  const winsMatch = params.badgeKey.match(/^career_wins_(\d+)$/);
  if (winsMatch?.[1]) {
    return {
      title: locale === "de"
        ? `${winsMatch[1]} Karrieresiege erreicht`
        : `${winsMatch[1]} career wins reached`,
      body: badgeNewsLabel(params, locale),
      detailText: locale === "de"
        ? `${params.actorName} hat ${winsMatch[1]} Siege in seiner Karriere erreicht.`
        : `${params.actorName} has reached ${winsMatch[1]} career wins.`,
    };
  }

  const appearancesMatch = params.badgeKey.match(/^career_appearances_(\d+)$/);
  if (appearancesMatch?.[1]) {
    return {
      title: locale === "de"
        ? `${appearancesMatch[1]} Karriere-Einsätze erreicht`
        : `${appearancesMatch[1]} career appearances reached`,
      body: badgeNewsLabel(params, locale),
      detailText: locale === "de"
        ? `${params.actorName} hat ${appearancesMatch[1]} Einsätze in seiner Karriere erreicht.`
        : `${params.actorName} has reached ${appearancesMatch[1]} career appearances.`,
    };
  }

  return {
    title: params.fallbackTitle,
    body: badgeNewsLabel(params, locale),
    detailText: locale === "de"
      ? `${params.actorName} hat „${params.fallbackTitle}“ erreicht.`
      : `${params.actorName} unlocked “${params.fallbackTitle}”.`,
  };
}

function playerName(player: BadgePlayer | BadgePlayer[] | null, locale: AppLocale) {
  const value = Array.isArray(player) ? player[0] ?? null : player;
  if (!value) return locale === "de" ? "Ein Spieler" : "A player";

  const nickname = value.nickname?.trim();
  if (nickname) return nickname;

  const name = [value.first_name, value.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || (locale === "de" ? "Ein Spieler" : "A player");
}

function resultSummary(rows: ResultRow[], locale: AppLocale) {
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
  if (scores.length === 1) {
    return locale === "de" ? `Ergebnis ${scores[0]}` : `Result ${scores[0]}`;
  }
  return locale === "de"
    ? `${scores.length} Spiele · ${scores.join(" · ")}`
    : `${scores.length} games · ${scores.join(" · ")}`;
}

function sessionOccurredAt(session: SessionRow) {
  const time = session.start_time?.slice(0, 5) || "12:00";
  return `${session.date}T${time}:00`;
}

export async function getTeamFeedItems(
  clubId: string,
  limit = 20,
): Promise<TeamFeedItem[]> {
  const { locale } = await getServerI18n();
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
    const summary = resultSummary(resultRowsBySession.get(session.id) ?? [], locale);
    if (!summary) return [];

    return [{
      id: `result:${session.id}`,
      kind: "result" as const,
      title: locale === "de" ? "Training abgeschlossen" : "Training completed",
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
        const badge = getLocalizedBadgeDefinition(achievement.badge_key, locale);
        if (!badge) return [];

        const actorName = playerName(achievement.players, locale);
        const copy = badgeNewsCopy({
          badgeKey: achievement.badge_key,
          actorName,
          fallbackTitle: badge.title,
          scope: badge.scope,
          category: badge.category,
        }, locale);

        return [{
          id: `badge:${achievement.id}`,
          kind: "badge" as const,
          title: copy.title,
          body: copy.body,
          href: `/badges?player=${achievement.player_id}`,
          occurredAt: achievement.earned_at,
          badgeKey: achievement.badge_key,
          actorName,
          badgeDetailText: copy.detailText,
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
  const { locale } = await getServerI18n();
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

  const badge = getLocalizedBadgeDefinition(data.badge_key, locale);
  if (!badge) return null;

  const actorName = playerName(data.players, locale);
  const copy = badgeNewsCopy({
    badgeKey: data.badge_key,
    actorName,
    fallbackTitle: badge.title,
    scope: badge.scope,
    category: badge.category,
  }, locale);

  return {
    id: `badge:${data.id}`,
    kind: "badge",
    title: copy.title,
    body: copy.body,
    href: `/badges?player=${data.player_id}`,
    occurredAt: data.earned_at,
    badgeKey: data.badge_key,
    actorName,
    badgeDetailText: copy.detailText,
  };
}
