import "server-only";

import { getLocalizedBadgeDefinition } from "@/lib/badges/catalog";
import { createClient } from "@/lib/supabase/server";
import { getServerI18n } from "@/lib/i18n/server";
import type { AppLocale } from "@/lib/i18n/config";

export type TeamFeedItem = {
  id: string;
  kind: "badge" | "result" | "birthday" | "beer" | "late_rsvp" | "attendance" | "wheel" | "paid";
  title: string;
  body: string;
  href: string;
  occurredAt: string;
  badgeKey?: string;
  actorName?: string;
  badgeDetailText?: string;
  reactions?: Record<string, number>;
  myReactions?: string[];
  commentCount?: number;
  recentComments?: TeamFeedCommentPreview[];
};

export type TeamFeedCommentPreview = {
  userId: string;
  name: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  mine: boolean;
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

type BirthdayPlayer = { id: number; first_name: string | null; last_name: string | null; nickname: string | null; birth_date: string | null; };
type BeerRow = { player_id: number; quantity: number | null; created_at: string; players: BadgePlayer | BadgePlayer[] | null; };
type LateRsvpRow = { id: number; player_id: number; value: string; created_at: string; source_key: string | null; players: BadgePlayer | BadgePlayer[] | null; };

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
        ? `${params.actorName} · ${winsMatch[1]} Karrieresiege erreicht`
        : `${params.actorName} · ${winsMatch[1]} career wins reached`,
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
        ? `${params.actorName} · ${appearancesMatch[1]} Karriere-Einsätze erreicht`
        : `${params.actorName} · ${appearancesMatch[1]} career appearances reached`,
      body: badgeNewsLabel(params, locale),
      detailText: locale === "de"
        ? `${params.actorName} hat ${appearancesMatch[1]} Einsätze in seiner Karriere erreicht.`
        : `${params.actorName} has reached ${appearancesMatch[1]} career appearances.`,
    };
  }

  return {
    title: `${params.actorName} · ${params.fallbackTitle}`,
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

function berlinDateKey(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function sessionOccurredAt(session: SessionRow) {
  const time = session.start_time?.slice(0, 5) || "12:00";
  return `${session.date}T${time}:00`;
}

export async function getTeamFeedItems(
  clubId: string,
  limit = 20,
  includeCommentPreviews = true,
): Promise<TeamFeedItem[]> {
  const { locale } = await getServerI18n();
  const supabase = await createClient();
  const today = berlinDateKey(new Date());

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

  const { data: birthdayData } = await supabase
    .from("players")
    .select("id, first_name, last_name, nickname, birth_date")
    .eq("club_id", clubId)
    .eq("is_guest", false)
    .not("birth_date", "is", null);

  const todayMonthDay = today.slice(5);
  const birthdayItems: TeamFeedItem[] = ((birthdayData ?? []) as BirthdayPlayer[])
    .filter((player) => player.birth_date?.slice(5) === todayMonthDay)
    .map((player) => {
      const actorName = playerName(player, locale);
      return {
        id: `birthday:${player.id}:${today}`,
        kind: "birthday" as const,
        title: locale === "de" ? `🎂 Alles Gute, ${actorName}!` : `🎂 Happy birthday, ${actorName}!`,
        body: locale === "de" ? "Glückwunsch! 🎉 · Freu mich auf deine Kischde 🍺" : "Happy birthday! 🎉 · Looking forward to your crate 🍺",
        href: `/badges?player=${player.id}`,
        occurredAt: `${today}T08:00:00`,
        actorName,
      };
    });

  // Beer moments start with the feature launch. Do not backfill older test evenings.
  const beerFeatureStart = "2026-10-01T00:00:00+02:00";
  const beerSince = new Date(beerFeatureStart).toISOString();
  const { data: beerData } = await supabase
    .from("beer_consumptions")
    .select(`player_id, quantity, created_at, players (first_name, last_name, nickname)`)
    .eq("club_id", clubId)
    .gte("created_at", beerSince)
    .is("cancelled_at", null);

  const beerByDayPlayer = new Map<string, { playerId: number; quantity: number; occurredAt: string; player: BadgePlayer | BadgePlayer[] | null }>();
  for (const row of (beerData ?? []) as BeerRow[]) {
    const day = berlinDateKey(row.created_at);
    const key = `${day}:${row.player_id}`;
    const current = beerByDayPlayer.get(key);
    beerByDayPlayer.set(key, {
      playerId: row.player_id,
      quantity: (current?.quantity ?? 0) + Number(row.quantity ?? 0),
      occurredAt: row.created_at > (current?.occurredAt ?? "") ? row.created_at : current!.occurredAt,
      player: row.players,
    });
  }

  // Keep a stable post for every player/day with 3+ beers; never replace
  // an existing post (and its comments) with the day's latest top drinker.
  const beerItems: TeamFeedItem[] = [...beerByDayPlayer.values()]
    .filter((entry) => entry.quantity >= 3)
    .map((entry) => {
      const day = berlinDateKey(entry.occurredAt);
      const actorName = playerName(entry.player, locale);
      return {
        id: `beer:${day}:${entry.playerId}`,
        kind: "beer" as const,
        title: locale === "de" ? `🍺 ${actorName} hat ${entry.quantity} Bier vernichtet.` : `🍺 ${actorName} put away ${entry.quantity} beers.`,
        body: locale === "de" ? "Prost Mahlzeit. Maschine. 😄" : "Cheers. Absolute machine. 😄",
        href: "/mannschaftskasse/bier",
        occurredAt: entry.occurredAt,
        actorName,
      };
    });

  const { data: lateRsvpData } = await supabase
    .from("penalties")
    .select(`id, player_id, value, created_at, source_key, players (first_name, last_name, nickname)`)
    .eq("club_id", clubId)
    .like("source_key", "late_rsvp:%")
    .order("created_at", { ascending: false })
    .limit(Math.max(12, limit * 2));

  const lateRsvpItems: TeamFeedItem[] = ((lateRsvpData ?? []) as LateRsvpRow[]).map((row) => {
    const actorName = playerName(row.players, locale);
    const amount = /€/.test(row.value) ? row.value : `${row.value} €`;
    const sessionId = row.source_key?.split(":")[1];
    return {
      id: `late-rsvp:${row.id}`,
      kind: "late_rsvp" as const,
      title: locale === "de" ? `⏰ ${actorName} ist doch noch dabei!` : `⏰ ${actorName} made it after all!`,
      body: locale === "de"
        ? `Schön, dass du’s noch geschafft hast. 😄 Danke auch für deinen ${amount} FBZG – die Mannschaftskasse freut sich. 🍻`
        : `Glad you still made it. 😄 Thanks for the ${amount} team contribution too. 🍻`,
      href: sessionId ? `/sessions/${sessionId}` : "/mannschaftskasse",
      occurredAt: row.created_at,
      actorName,
    };
  });

  // Confirmed penalties and cosmetic wheel results become locker-room news.
  const [{ data: reviews }, { data: spins }, { data: paidPenalties }] = await Promise.all([
    supabase.from("session_attendance_reviews")
      .select("id,session_id,kind,reviewed_at,players(first_name,last_name,nickname)")
      .eq("club_id",clubId).eq("status","penalized").order("reviewed_at",{ascending:false}).limit(Math.max(12,limit*2)),
    supabase.from("penalty_wheel_spins")
      .select("id,outcome,outcome_label,outcome_detail,outcome_icon,spun_at,players(first_name,last_name,nickname),penalties(value,source_key)")
      .eq("club_id",clubId).order("spun_at",{ascending:false}).limit(Math.max(12,limit*2)),
    supabase.from("penalties")
      .select("id,reason,type,value,resolved_at,source_key,cash_transaction_id,players(first_name,last_name,nickname)")
      .eq("club_id",clubId).not("resolved_at","is",null)
      .order("resolved_at",{ascending:false}).limit(Math.max(20,limit*3))
  ]);
  type ReviewNews={id:number;session_id:number;kind:string;reviewed_at:string|null;players:BadgePlayer|BadgePlayer[]|null};
  type WheelNews={id:number;outcome:string;outcome_label:string|null;outcome_detail:string|null;outcome_icon:string|null;spun_at:string;players:BadgePlayer|BadgePlayer[]|null;penalties:{value:string|null;source_key:string|null}|{value:string|null;source_key:string|null}[]|null};
  type PaidPenaltyNews={id:number;reason:string|null;type:"money"|"beer"|"custom";value:string|null;resolved_at:string;source_key:string|null;cash_transaction_id:number|null;players:BadgePlayer|BadgePlayer[]|null};
  const attendanceItems:TeamFeedItem[]=((reviews??[]) as ReviewNews[]).map(row=>{
    const actor=playerName(row.players,locale);
    return {
      id:`attendance:${row.id}`,kind:"attendance",
      title:row.kind==="no_show"?`👻 ${actor} hat die Kabine versetzt!`:`🚨 ${actor} hat spät abgesagt!`,
      body:"Die Strafe wurde vom Verantwortlichen bestätigt. Die Mannschaftskasse freut sich. 😄",
      href:`/sessions/${row.session_id}`,occurredAt:row.reviewed_at??new Date().toISOString(),actorName:actor
    };
  });
  const wheelCopy:Record<string,string>={
    lucky:"🍀 Kabinen-Joker – heute keine Sprüche!",
    usual:"😎 Alles beim Alten – immerhin gut gedreht!",
    confession:"🎤 Kabinen-Beichte beim nächsten Training!",
    challenge:"🔥 Die nächste Aufwärmrunde gehört dir!"
  };
  const wheelItems:TeamFeedItem[]=((spins??[]) as WheelNews[]).flatMap(row=>{
    const penalty=Array.isArray(row.penalties)?row.penalties[0]??null:row.penalties;
    if(penalty?.source_key?.startsWith("test:"))return [];
    const actor=playerName(row.players,locale);
    const label=row.outcome_label?.trim() || row.outcome;
    const detail=row.outcome_detail?.trim() || wheelCopy[row.outcome] || "Das Rad hat entschieden!";
    const symbol=row.outcome_icon?.trim() || "🎡";
    return [{
      id:`wheel:${row.id}`,kind:"wheel" as const,
      title:`🎡 ${actor} hat gezockt: ${symbol} ${label}!`,
      body:`${detail} · Die ursprüngliche Geld- oder Bierstrafe bleibt unverändert.`,
      href:"/mannschaftskasse",occurredAt:row.spun_at,actorName:actor
    }];
  });
  const paidItems:TeamFeedItem[]=((paidPenalties??[]) as PaidPenaltyNews[]).flatMap(row=>{
    if(row.source_key?.startsWith("test:"))return [];
    if(row.type==="money"&&!row.cash_transaction_id)return [];
    const actor=playerName(row.players,locale);
    const label=row.value?.trim()||"seine Strafe";
    const isMoney=row.type==="money";
    const displayAmount=isMoney&&!/€|EUR/i.test(label)?`${label} €`:label;
    return [{
      id:`paid:${row.id}`,kind:"paid" as const,
      title:isMoney?`💰 ${actor} hat bezahlt – ${displayAmount} in der Kasse!`:`🍻 ${actor} hat seine Strafe erledigt!`,
      body:isMoney
        ?`Schuldenfrei! Die Mannschaftskasse sagt Danke. 😄 · ${row.reason||"FBZG"}`
        :`${displayAmount} abgehakt. Die Kabine freut sich. 🙌`,
      href:"/mannschaftskasse",occurredAt:row.resolved_at,actorName:actor
    }];
  });
  const combinedItems = [...paidItems, ...wheelItems, ...attendanceItems, ...lateRsvpItems, ...birthdayItems, ...beerItems, ...badgeItems, ...resultItems];
  const reactionFeedIds = combinedItems.filter((item) => item.kind === "birthday" || item.kind === "beer" || item.kind === "late_rsvp").map((item) => item.id);
  if (reactionFeedIds.length > 0) {
    const { data: reactionRows } = await supabase.from("team_feed_reactions").select("feed_id,reaction,user_id").eq("club_id", clubId).in("feed_id", reactionFeedIds);
    const { data: { user } } = await supabase.auth.getUser();
    for (const item of combinedItems) {
      if (item.kind !== "birthday" && item.kind !== "beer" && item.kind !== "late_rsvp") continue;
      const rows = (reactionRows ?? []).filter((row) => row.feed_id === item.id);
      item.reactions = rows.reduce<Record<string, number>>((acc, row) => { acc[row.reaction] = (acc[row.reaction] ?? 0) + 1; return acc; }, {});
      item.myReactions = user ? rows.filter((row) => row.user_id === user.id).map((row) => row.reaction) : [];
    }
  }

  const visibleItems = combinedItems
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);

  // Fetch previews together instead of one HTTP request per news item.
  // Comments are tied to stable feed IDs and remain visible if ranking changes.
  if (includeCommentPreviews && visibleItems.length > 0) {
    const { data: commentRows, error: commentError } = await supabase
      .from("team_feed_comments")
      .select("feed_id,user_id,body,created_at,updated_at")
      .eq("club_id", clubId)
      .in("feed_id", visibleItems.map((item) => item.id))
      .order("created_at", { ascending: false })
      .limit(5000);
    if (commentError) {
      console.error("Team feed comment previews unavailable", commentError.message);
    } else if (commentRows?.length) {
      const authorIds = [...new Set(commentRows.map((row) => row.user_id))];
      const [{ data: authors }, { data: auth }] = await Promise.all([
        supabase.from("players")
          .select("user_id,first_name,last_name")
          .eq("club_id", clubId)
          .in("user_id", authorIds),
        supabase.auth.getUser(),
      ]);
      const nameByUserId = new Map(
        (authors ?? []).map((author) => [
          author.user_id,
          [author.first_name, author.last_name].filter(Boolean).join(" ") || "Mitspieler",
        ]),
      );
      const grouped = new Map<string, { count: number; recent: TeamFeedCommentPreview[] }>();
      for (const row of commentRows) {
        const group = grouped.get(row.feed_id) ?? { count: 0, recent: [] };
        group.count++;
        if (group.recent.length < 2) {
          group.recent.push({
            userId: row.user_id,
            name: nameByUserId.get(row.user_id) ?? "Mitspieler",
            body: row.body,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            mine: auth.user?.id === row.user_id,
          });
        }
        grouped.set(row.feed_id, group);
      }
      for (const item of visibleItems) {
        const summary = grouped.get(item.id);
        item.commentCount = summary?.count ?? 0;
        item.recentComments = summary?.recent ?? [];
      }
    }
  }
  return visibleItems;
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
