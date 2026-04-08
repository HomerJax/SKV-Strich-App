import { NextRequest } from "next/server";
import { fail, ok } from "@/lib/session-detail/response";
import { requireSessionAccess } from "@/lib/session-detail/access";
import { getPlayerDisplayName } from "@/lib/player-display";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PresentPlayerRow = {
  id: number;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  user_id: string | null;
  is_guest: boolean | null;
};

type VoteRow = {
  voted_player_id: number;
};

type NotificationInsert = {
  user_id: string;
  club_id: string;
  type: string;
  title: string;
  body: string | null;
  cta_href: string | null;
  cta_label: string | null;
  secondary_cta_href: string | null;
  secondary_cta_label: string | null;
  payload: Record<string, unknown> | null;
  dedupe_key: string;
};

function getPartsInBerlin(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
    dateKey: `${map.year}-${map.month}-${map.day}`,
    timeKey: `${map.hour}:${map.minute}`,
  };
}

function addOneDay(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return dateString;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + 1);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function formatRevealLabel(sessionDate: string) {
  const revealDate = addOneDay(sessionDate);
  const [year, month, day] = revealDate.split("-").map(Number);

  if (!year || !month || !day) {
    return `${revealDate} 10:00`;
  }

  const utcNoon = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(utcNoon).replace("12:00", "10:00");
}

function getRevealInfo(sessionDate: string) {
  const revealDate = addOneDay(sessionDate);
  const now = getPartsInBerlin(new Date());

  const votingOpen =
    now.dateKey < revealDate ||
    (now.dateKey === revealDate && now.timeKey < "10:00");

  return {
    revealDate,
    revealLabel: formatRevealLabel(sessionDate),
    votingOpen,
  };
}

async function loadPresentPlayers(
  supabase: Awaited<ReturnType<typeof requireSessionAccess>> extends infer T
    ? T extends { supabase: infer S }
      ? S
      : never
    : never,
  clubId: string,
  sessionId: number
) {
  const { data: sessionPlayersData, error: sessionPlayersError } = await supabase
    .from("session_players")
    .select("player_id")
    .eq("session_id", sessionId);

  if (sessionPlayersError) {
    throw new Error(
      `Session-Spieler konnten nicht geladen werden: ${sessionPlayersError.message}`
    );
  }

  const presentIds = (sessionPlayersData ?? [])
    .map((row) => Number(row.player_id))
    .filter(Boolean);

  if (presentIds.length === 0) {
    return [];
  }

  const { data: playersData, error: playersError } = await supabase
    .from("players")
    .select("id, name, first_name, last_name, nickname, user_id, is_guest")
    .eq("club_id", clubId)
    .in("id", presentIds);

  if (playersError) {
    throw new Error(`Spieler konnten nicht geladen werden: ${playersError.message}`);
  }

  return ((playersData ?? []) as PresentPlayerRow[])
    .slice()
    .sort((a, b) =>
      getPlayerDisplayName(a).localeCompare(getPlayerDisplayName(b), "de")
    );
}

async function insertNotificationIfMissing(notification: NotificationInsert) {
  const admin = createAdminClient();

  const { data: existing, error: existingError } = await admin
    .from("user_notifications")
    .select("id")
    .eq("dedupe_key", notification.dedupe_key)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Vorhandene Notification konnte nicht geprüft werden: ${existingError.message}`
    );
  }

  if (existing?.id) {
    return;
  }

  const { error: insertError } = await admin.from("user_notifications").insert({
    user_id: notification.user_id,
    club_id: notification.club_id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    cta_href: notification.cta_href,
    cta_label: notification.cta_label,
    secondary_cta_href: notification.secondary_cta_href,
    secondary_cta_label: notification.secondary_cta_label,
    payload: notification.payload,
    dedupe_key: notification.dedupe_key,
  });

  if (insertError) {
    throw new Error(
      `Notification konnte nicht erstellt werden: ${insertError.message}`
    );
  }
}

async function createMvpNotifications(params: {
  clubId: string;
  sessionId: number;
  participants: PresentPlayerRow[];
  winners: Array<{ playerId: number; name: string; votes: number }>;
}) {
  const { clubId, sessionId, participants, winners } = params;

  if (winners.length === 0) {
    return;
  }

  const winnerNames = winners.map((winner) => winner.name).join(", ");
  const winnerPlayerIds = new Set(winners.map((winner) => winner.playerId));

  const participantUsers = participants.filter(
    (player) => player.user_id && !player.is_guest
  );

  for (const participant of participantUsers) {
    await insertNotificationIfMissing({
      user_id: String(participant.user_id),
      club_id: clubId,
      type: "mvp_result",
      title: "MVP Voting beendet",
      body:
        winners.length === 1
          ? `${winnerNames} wurde zum MVP gewählt.`
          : `${winnerNames} wurden gemeinsam zum MVP gewählt.`,
      cta_href: `/sessions/${sessionId}`,
      cta_label: "Bewertung ansehen",
      secondary_cta_href: `/sessions/${sessionId}`,
      secondary_cta_label: "Teilen",
      payload: {
        sessionId,
        winnerPlayerIds: Array.from(winnerPlayerIds),
      },
      dedupe_key: `mvp_result_session_${sessionId}_user_${participant.user_id}`,
    });
  }

  for (const winner of winners) {
    const winnerPlayer = participants.find((player) => player.id === winner.playerId);

    if (!winnerPlayer?.user_id) {
      continue;
    }

    await insertNotificationIfMissing({
      user_id: String(winnerPlayer.user_id),
      club_id: clubId,
      type: "mvp_winner",
      title: "Glückwunsch! Du bist MVP 🏆",
      body: "Du wurdest zum MVP gewählt. Schau dir jetzt die Bewertung an.",
      cta_href: `/sessions/${sessionId}`,
      cta_label: "Bewertung ansehen",
      secondary_cta_href: `/sessions/${sessionId}`,
      secondary_cta_label: "Teilen",
      payload: {
        sessionId,
        playerId: winner.playerId,
      },
      dedupe_key: `mvp_winner_session_${sessionId}_user_${winnerPlayer.user_id}`,
    });
  }
}

async function ensureMvpVotingEnabled(clubId: string) {
  const flags = await getFeatureFlagsForClub(clubId);

  if (!flags.session_mvp_voting) {
    return false;
  }

  return true;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const sessionId = Number(resolvedParams.id);

  if (!Number.isFinite(sessionId)) {
    return fail("Ungültige Session-ID.", 400);
  }

  const access = await requireSessionAccess(sessionId);

  if ("error" in access) {
    return fail(access.error ?? "Unbekannter Fehler.", access.status);
  }

  const { supabase, adminSupabase, clubId, session } = access;

  try {
    const isEnabled = await ensureMvpVotingEnabled(clubId);

    if (!isEnabled) {
      return fail("MVP Voting ist für diesen Club nicht aktiviert.", 403);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return fail(authError.message, 401);
    }

    if (!user) {
      return fail("Nicht eingeloggt.", 401);
    }

    const { data: resultData, error: resultError } = await supabase
      .from("results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (resultError) {
      return fail(`Ergebnis konnte nicht geladen werden: ${resultError.message}`, 500);
    }

    const hasResult = Boolean(resultData?.id);
    const reveal = getRevealInfo(session.date);
    const presentPlayers = await loadPresentPlayers(supabase, clubId, sessionId);

    const currentUserPlayer = presentPlayers.find(
      (player) => player.user_id === user.id
    );

    const canVote = Boolean(currentUserPlayer?.id) && hasResult && reveal.votingOpen;

    const { data: myVoteData, error: myVoteError } = await supabase
      .from("session_mvp_votes")
      .select("voted_player_id")
      .eq("session_id", sessionId)
      .eq("voter_user_id", user.id)
      .maybeSingle();

    if (myVoteError) {
      return fail(
        `Eigene MVP-Stimme konnte nicht geladen werden: ${myVoteError.message}`,
        500
      );
    }

    let results: {
      winners: Array<{ playerId: number; name: string; votes: number }>;
      leaderboard: Array<{ playerId: number; name: string; votes: number }>;
      totalVotes: number;
    } | null = null;

    if (!reveal.votingOpen) {
      const { data: votesData, error: votesError } = await supabase
        .from("session_mvp_votes")
        .select("voted_player_id")
        .eq("session_id", sessionId);

      if (votesError) {
        return fail(
          `MVP-Stimmen konnten nicht geladen werden: ${votesError.message}`,
          500
        );
      }

      const countMap = new Map<number, number>();

      for (const vote of (votesData ?? []) as VoteRow[]) {
        const votedPlayerId = Number(vote.voted_player_id);
        countMap.set(votedPlayerId, (countMap.get(votedPlayerId) ?? 0) + 1);
      }

      const leaderboard = presentPlayers
        .map((player) => ({
          playerId: player.id,
          name: getPlayerDisplayName(player),
          votes: countMap.get(player.id) ?? 0,
        }))
        .filter((entry) => entry.votes > 0)
        .sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, "de"));

      const maxVotes = leaderboard[0]?.votes ?? 0;

      const winners =
        maxVotes > 0
          ? leaderboard.filter((entry) => entry.votes === maxVotes)
          : [];

      results = {
        winners,
        leaderboard,
        totalVotes: leaderboard.reduce((sum, entry) => sum + entry.votes, 0),
      };

      await createMvpNotifications({
        clubId,
        sessionId,
        participants: presentPlayers,
        winners,
      });
    }

    return ok({
      sessionId,
      hasResult,
      votingOpen: reveal.votingOpen,
      revealLabel: reveal.revealLabel,
      canVote,
      userHasVoted: Boolean(myVoteData?.voted_player_id),
      userVotePlayerId: myVoteData?.voted_player_id ?? null,
      participants: presentPlayers.map((player) => ({
        id: player.id,
        name: getPlayerDisplayName(player),
      })),
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await context.params;
  const sessionId = Number(resolvedParams.id);

  if (!Number.isFinite(sessionId)) {
    return fail("Ungültige Session-ID.", 400);
  }

  const access = await requireSessionAccess(sessionId);

  if ("error" in access) {
    return fail(access.error ?? "Unbekannter Fehler.", access.status);
  }

  const { supabase, clubId, session } = access;

  try {
    const isEnabled = await ensureMvpVotingEnabled(clubId);

    if (!isEnabled) {
      return fail("MVP Voting ist für diesen Club nicht aktiviert.", 403);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return fail(authError.message, 401);
    }

    if (!user) {
      return fail("Nicht eingeloggt.", 401);
    }

    const { data: resultData, error: resultError } = await supabase
      .from("results")
      .select("id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (resultError) {
      return fail(`Ergebnis konnte nicht geladen werden: ${resultError.message}`, 500);
    }

    if (!resultData?.id) {
      return fail(
        "MVP Voting ist erst möglich, wenn ein Ergebnis gespeichert wurde.",
        400
      );
    }

    const reveal = getRevealInfo(session.date);

    if (!reveal.votingOpen) {
      return fail("Das MVP Voting ist bereits beendet.", 400);
    }

    const body = (await request.json().catch(() => null)) as
      | { votedPlayerId?: number | string | null }
      | null;

    const votedPlayerId = Number(body?.votedPlayerId);

    if (!Number.isFinite(votedPlayerId)) {
      return fail("Ungültiger MVP-Spieler.", 400);
    }

    const presentPlayers = await loadPresentPlayers(supabase, clubId, sessionId);
    const participantIds = new Set(presentPlayers.map((player) => player.id));

    if (!participantIds.has(votedPlayerId)) {
      return fail("Es können nur anwesende Spieler gewählt werden.", 400);
    }

    const currentUserPlayer = presentPlayers.find(
      (player) => player.user_id === user.id
    );

    if (!currentUserPlayer?.id) {
      return fail(
        "Nur anwesende Teilnehmer mit verknüpftem Spielerprofil dürfen abstimmen.",
        403
      );
    }

    if (!participantIds.has(currentUserPlayer.id)) {
      return fail("Nur anwesende Teilnehmer dürfen abstimmen.", 403);
    }

    const { error: upsertError } = await supabase
      .from("session_mvp_votes")
      .upsert(
        {
          club_id: clubId,
          session_id: sessionId,
          voter_user_id: user.id,
          voted_player_id: votedPlayerId,
        },
        {
          onConflict: "session_id,voter_user_id",
        }
      );

    if (upsertError) {
      return fail(
        `MVP-Stimme konnte nicht gespeichert werden: ${upsertError.message}`,
        500
      );
    }

    return ok({
      message: "Deine MVP-Stimme wurde gespeichert.",
      votedPlayerId,
      revealLabel: reveal.revealLabel,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unbekannter Fehler.";
    return fail(message, 500);
  }
}