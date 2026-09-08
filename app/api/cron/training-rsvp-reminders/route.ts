import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToUsers } from "@/lib/push/send-push";

export const runtime = "nodejs";

const APP_TIME_ZONE = "Europe/Berlin";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

type SessionRow = {
  id: number;
  club_id: string;
  date: string;
  start_time: string | null;
  type: string | null;
};

type ClubRow = {
  id: string;
  deleted_at: string | null;
};

type PlayerRow = {
  id: number;
  club_id: string;
  user_id: string | null;
  is_active: boolean | null;
  is_guest: boolean | null;
  roster_role: string | null;
};

type RsvpRow = {
  session_id: number;
  player_id: number;
};

type ExistingNotificationRow = {
  dedupe_key: string | null;
};

type ReminderCandidate = {
  session: SessionRow;
  userId: string;
  dedupeKey: string;
};

function getCronSecret() {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    throw new Error("CRON_SECRET is not configured.");
  }

  return secret;
}

function formatDateInTimeZone(date: Date) {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");

  if (!year || !month || !day) {
    throw new Error("Reminder date could not be calculated.");
  }

  return `${year}-${month}-${day}`;
}

function formatStartTime(startTime: string | null) {
  if (!startTime) return null;

  const match = startTime.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : null;
}

function getSessionLabel(type: string | null) {
  return type === "event" ? "Termin" : "Training";
}

function getPushCopy(session: SessionRow) {
  const label = getSessionLabel(session.type);
  const startTime = formatStartTime(session.start_time);

  return {
    title: `${label} morgen: bist du dabei?`,
    body: startTime
      ? `Bitte kurz zu- oder absagen – Start ${startTime} Uhr.`
      : "Bitte kurz zu- oder absagen. Deine Rückmeldung fehlt noch.",
    url: `/sessions/${session.id}`,
  };
}

export async function GET(request: NextRequest) {
  let cronSecret: string;

  try {
    cronSecret = getCronSecret();
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cron secret is not configured.",
      },
      { status: 500 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const targetDate = formatDateInTimeZone(new Date(Date.now() + ONE_DAY_MS));

    const { data: sessionsData, error: sessionsError } = await supabase
      .from("sessions")
      .select("id, club_id, date, start_time, type")
      .eq("date", targetDate);

    if (sessionsError) {
      throw new Error(`Trainings konnten nicht geladen werden: ${sessionsError.message}`);
    }

    const sessions = (sessionsData ?? []) as SessionRow[];

    if (!sessions.length) {
      return NextResponse.json({
        ok: true,
        targetDate,
        sessions: 0,
        candidates: 0,
        notificationsCreated: 0,
        pushesSent: 0,
        pushesFailed: 0,
      });
    }

    const clubIds = [...new Set(sessions.map((session) => session.club_id))];
    const sessionIds = sessions.map((session) => session.id);

    const [clubsResult, playersResult, rsvpsResult] = await Promise.all([
      supabase
        .from("clubs")
        .select("id, deleted_at")
        .in("id", clubIds),
      supabase
        .from("players")
        .select("id, club_id, user_id, is_active, is_guest, roster_role")
        .in("club_id", clubIds)
        .not("user_id", "is", null),
      supabase
        .from("session_rsvps")
        .select("session_id, player_id")
        .in("session_id", sessionIds),
    ]);

    if (clubsResult.error) {
      throw new Error(`Clubs konnten nicht geladen werden: ${clubsResult.error.message}`);
    }

    if (playersResult.error) {
      throw new Error(`Spieler konnten nicht geladen werden: ${playersResult.error.message}`);
    }

    if (rsvpsResult.error) {
      throw new Error(`Zu-/Absagen konnten nicht geladen werden: ${rsvpsResult.error.message}`);
    }

    const activeClubIds = new Set(
      ((clubsResult.data ?? []) as ClubRow[])
        .filter((club) => !club.deleted_at)
        .map((club) => club.id),
    );

    const players = ((playersResult.data ?? []) as PlayerRow[]).filter(
      (player) =>
        activeClubIds.has(player.club_id) &&
        player.user_id &&
        player.is_active !== false &&
        player.is_guest !== true &&
        player.roster_role !== "staff",
    );

    const playersByClub = new Map<string, PlayerRow[]>();

    for (const player of players) {
      const current = playersByClub.get(player.club_id) ?? [];
      current.push(player);
      playersByClub.set(player.club_id, current);
    }

    const answered = new Set(
      ((rsvpsResult.data ?? []) as RsvpRow[]).map(
        (rsvp) => `${rsvp.session_id}:${rsvp.player_id}`,
      ),
    );

    const candidates: ReminderCandidate[] = [];

    for (const session of sessions) {
      if (!activeClubIds.has(session.club_id)) continue;

      const usersForSession = new Set<string>();

      for (const player of playersByClub.get(session.club_id) ?? []) {
        if (!player.user_id) continue;
        if (answered.has(`${session.id}:${player.id}`)) continue;
        if (usersForSession.has(player.user_id)) continue;

        usersForSession.add(player.user_id);
        candidates.push({
          session,
          userId: player.user_id,
          dedupeKey: `training_rsvp_reminder:${session.id}:${player.user_id}`,
        });
      }
    }

    if (!candidates.length) {
      return NextResponse.json({
        ok: true,
        targetDate,
        sessions: sessions.length,
        candidates: 0,
        notificationsCreated: 0,
        pushesSent: 0,
        pushesFailed: 0,
      });
    }

    const dedupeKeys = candidates.map((candidate) => candidate.dedupeKey);
    const { data: existingData, error: existingError } = await supabase
      .from("user_notifications")
      .select("dedupe_key")
      .in("dedupe_key", dedupeKeys);

    if (existingError) {
      throw new Error(
        `Bestehende Erinnerungen konnten nicht geprüft werden: ${existingError.message}`,
      );
    }

    const existingKeys = new Set(
      ((existingData ?? []) as ExistingNotificationRow[])
        .map((row) => row.dedupe_key)
        .filter((key): key is string => Boolean(key)),
    );

    const newCandidates = candidates.filter(
      (candidate) => !existingKeys.has(candidate.dedupeKey),
    );

    if (!newCandidates.length) {
      return NextResponse.json({
        ok: true,
        targetDate,
        sessions: sessions.length,
        candidates: candidates.length,
        notificationsCreated: 0,
        alreadySent: candidates.length,
        pushesSent: 0,
        pushesFailed: 0,
      });
    }

    const notificationRows = newCandidates.map((candidate) => {
      const copy = getPushCopy(candidate.session);

      return {
        user_id: candidate.userId,
        club_id: candidate.session.club_id,
        type: "training_rsvp_reminder",
        title: copy.title,
        body: copy.body,
        cta_href: copy.url,
        cta_label: "Zu-/Absagen",
        dedupe_key: candidate.dedupeKey,
      };
    });

    const { error: notificationError } = await supabase
      .from("user_notifications")
      .insert(notificationRows);

    if (notificationError) {
      throw new Error(
        `Erinnerungen konnten nicht gespeichert werden: ${notificationError.message}`,
      );
    }

    let pushesSent = 0;
    let pushesFailed = 0;
    let usersFilteredByPreference = 0;

    for (const session of sessions) {
      const userIds = [
        ...new Set(
          newCandidates
            .filter((candidate) => candidate.session.id === session.id)
            .map((candidate) => candidate.userId),
        ),
      ];

      if (!userIds.length) continue;

      const copy = getPushCopy(session);
      const result = await sendPushToUsers({
        userIds,
        title: copy.title,
        body: copy.body,
        url: copy.url,
        preference: "training_reminders",
      });

      pushesSent += result.sent;
      pushesFailed += result.failed;
      usersFilteredByPreference += result.filtered;
    }

    return NextResponse.json({
      ok: true,
      targetDate,
      sessions: sessions.length,
      candidates: candidates.length,
      notificationsCreated: newCandidates.length,
      alreadySent: candidates.length - newCandidates.length,
      usersFilteredByPreference,
      pushesSent,
      pushesFailed,
    });
  } catch (error) {
    console.error("Training RSVP reminder cron failed", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Training RSVP reminder cron failed.",
      },
      { status: 500 },
    );
  }
}
