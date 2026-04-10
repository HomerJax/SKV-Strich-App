import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeatureFlagsForClub } from "@/lib/feature-flags";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SessionRow = {
  id: number;
  club_id: string;
  date: string;
};

type PlayerRow = {
  id: number;
  display_name?: string | null;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
};

type SessionPlayerRow = {
  player_id: number;
  players: PlayerRow | PlayerRow[] | null;
};

type VoteRow = {
  voted_player_id: number;
  voter_user_id: string | null;
};

type UserVoteRow = {
  voted_player_id: number;
};

type NotificationInsert = {
  user_id: string;
  club_id: string;
  type: string;
  title: string;
  body: string;
  cta_href: string | null;
  dedupe_key: string;
};

type Participant = {
  id: number;
  name: string;
  userId: string | null;
};

function normalizePlayerRelation(
  player: SessionPlayerRow["players"]
): PlayerRow | null {
  if (!player) return null;
  if (Array.isArray(player)) return player[0] ?? null;
  return player;
}

function getPlayerName(player: PlayerRow | null) {
  if (!player) return "Spieler";

  const displayName = player.display_name?.trim();
  if (displayName) return displayName;

  const fullName = [player.first_name, player.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Spieler";
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

function getBerlinParts(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    dateKey: `${map.year}-${map.month}-${map.day}`,
    timeKey: `${map.hour}:${map.minute}`,
  };
}

function getVotingWindow(sessionDate: string) {
  const revealDate = addOneDay(sessionDate);
  const revealLabel = `${revealDate}, 10:00 Uhr`;
  const revealAtIso = `${revealDate}T10:00:00+02:00`;

  return {
    revealDate,
    revealLabel,
    revealAtIso,
  };
}

function isVotingOpen(sessionDate: string) {
  const { revealDate } = getVotingWindow(sessionDate);
  const now = getBerlinParts(new Date());

  return (
    now.dateKey < revealDate ||
    (now.dateKey === revealDate && now.timeKey < "10:00")
  );
}

async function loadSessionBase(sessionId: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Nicht eingeloggt." }, { status: 401 }),
    };
  }

  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .select("id, club_id, date")
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();

  if (sessionError) {
    return {
      error: NextResponse.json({ error: sessionError.message }, { status: 500 }),
    };
  }

  if (!sessionData) {
    return {
      error: NextResponse.json(
        { error: "Session nicht gefunden." },
        { status: 404 }
      ),
    };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("club_id", sessionData.club_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return {
      error: NextResponse.json(
        { error: membershipError.message },
        { status: 500 }
      ),
    };
  }

  if (!membership) {
    return {
      error: NextResponse.json(
        { error: "Kein Zugriff auf diesen Club." },
        { status: 403 }
      ),
    };
  }

  const flags = await getFeatureFlagsForClub(sessionData.club_id);

  if (flags.session_mvp_voting !== true) {
    return {
      error: NextResponse.json(
        { error: "MVP Voting ist für diesen Club nicht aktiviert." },
        { status: 404 }
      ),
    };
  }

  return {
    supabase,
    user,
    session: sessionData,
  };
}

async function loadParticipantsAndVotes(params: {
  sessionId: number;
  userId: string;
}) {
  const { sessionId, userId } = params;
  const supabase = await createClient();

  const [
    { data: sessionPlayerData, error: sessionPlayerError },
    { data: userVoteData, error: userVoteError },
    { data: allVotesData, error: allVotesError },
  ] = await Promise.all([
    supabase
      .from("session_players")
      .select(
        `
          player_id,
          players (
            id,
            display_name,
            first_name,
            last_name,
            user_id
          )
        `
      )
      .eq("session_id", sessionId),
    supabase
      .from("session_mvp_votes")
      .select("voted_player_id")
      .eq("session_id", sessionId)
      .eq("voter_user_id", userId)
      .maybeSingle<UserVoteRow>(),
    supabase
      .from("session_mvp_votes")
      .select("voted_player_id, voter_user_id")
      .eq("session_id", sessionId),
  ]);

  if (sessionPlayerError) {
    throw new Error(sessionPlayerError.message);
  }

  if (userVoteError) {
    throw new Error(userVoteError.message);
  }

  if (allVotesError) {
    throw new Error(allVotesError.message);
  }

  const sessionPlayerRows = (sessionPlayerData ?? []) as SessionPlayerRow[];

  const participants: Participant[] = sessionPlayerRows
    .map((row) => {
      const player = normalizePlayerRelation(row.players);

      if (!row.player_id || !player) {
        return null;
      }

      return {
        id: row.player_id,
        name: getPlayerName(player),
        userId: player.user_id ?? null,
      };
    })
    .filter((value): value is Participant => value !== null);

  const voteRows = (allVotesData ?? []) as VoteRow[];
  const userVotePlayerId = userVoteData?.voted_player_id ?? null;
  const voteCount = voteRows.length;
  const eligibleVoterCount = participants.length;

  const votedUserIds = new Set(
    voteRows
      .map((row) => row.voter_user_id)
      .filter((value): value is string => Boolean(value))
  );

  const voters = participants
    .filter((participant) => participant.userId && votedUserIds.has(participant.userId))
    .map((participant) => ({
      userId: participant.userId as string,
      name: participant.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));

  return {
    participants,
    userVotePlayerId,
    userHasVoted: userVotePlayerId !== null,
    voteRows,
    voteCount,
    eligibleVoterCount,
    voters,
  };
}

function buildResults(params: {
  participants: Participant[];
  voteRows: VoteRow[];
}) {
  const { participants, voteRows } = params;

  if (voteRows.length === 0) {
    return {
      winners: [],
      leaderboard: [],
      totalVotes: 0,
    };
  }

  const nameByPlayerId = new Map(
    participants.map((participant) => [participant.id, participant.name])
  );

  const counts = new Map<number, number>();

  for (const row of voteRows) {
    const playerId = Number(row.voted_player_id);
    counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
  }

  const leaderboard = [...counts.entries()]
    .map(([playerId, votes]) => ({
      playerId,
      name: nameByPlayerId.get(playerId) ?? "Spieler",
      votes,
    }))
    .sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.name.localeCompare(b.name, "de");
    });

  const topVotes = leaderboard[0]?.votes ?? 0;
  const winners = leaderboard.filter((entry) => entry.votes === topVotes);

  return {
    winners,
    leaderboard,
    totalVotes: voteRows.length,
  };
}

async function ensureResultNotifications(params: {
  clubId: string;
  sessionId: number;
  winners: Array<{ playerId: number; name: string; votes: number }>;
  participants: Participant[];
}) {
  const { clubId, sessionId, winners, participants } = params;

  const admin = createAdminClient();

  const winnerIds = new Set(winners.map((winner) => winner.playerId));
  const winnerUserIds = participants
    .filter((participant) => winnerIds.has(participant.id) && participant.userId)
    .map((participant) => participant.userId as string);

  const participantUserIds = participants
    .map((participant) => participant.userId)
    .filter(Boolean) as string[];

  const uniqueParticipantUserIds = [...new Set(participantUserIds)];
  const uniqueWinnerUserIds = [...new Set(winnerUserIds)];

  const resultNotifications: NotificationInsert[] = uniqueParticipantUserIds.map(
    (userId) => ({
      user_id: userId,
      club_id: clubId,
      type: "mvp_result",
      title: "MVP Voting beendet",
      body:
        winners.length === 0
          ? "Das MVP Voting ist beendet."
          : winners.length === 1
          ? `${winners[0].name} ist MVP dieser Session.`
          : "Das MVP Voting ist beendet. Es gibt mehrere Gewinner.",
      cta_href: `/sessions/${sessionId}`,
      dedupe_key: `mvp_result:${sessionId}:${userId}`,
    })
  );

  const winnerNotifications: NotificationInsert[] = uniqueWinnerUserIds.map(
    (userId) => ({
      user_id: userId,
      club_id: clubId,
      type: "mvp_winner",
      title: "Du bist MVP",
      body: "Glückwunsch, du wurdest zum MVP dieser Session gewählt.",
      cta_href: `/sessions/${sessionId}`,
      dedupe_key: `mvp_winner:${sessionId}:${userId}`,
    })
  );

  const inserts = [...resultNotifications, ...winnerNotifications];

  if (inserts.length === 0) {
    return;
  }

  const { error } = await admin
    .from("user_notifications")
    .upsert(inserts, { onConflict: "dedupe_key" });

  if (error) {
    console.error("MVP notifications failed:", error.message);
  }
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return NextResponse.json(
      { error: "Ungültige Session-ID." },
      { status: 400 }
    );
  }

  const base = await loadSessionBase(sessionId);

  if ("error" in base) {
    return base.error;
  }

  const { supabase, user, session } = base;

  const { data: resultData, error: resultError } = await supabase
    .from("results")
    .select("session_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (resultError) {
    return NextResponse.json({ error: resultError.message }, { status: 500 });
  }

  const hasResult = Boolean(resultData);

  if (!hasResult) {
    return NextResponse.json({
      sessionId,
      hasResult: false,
      votingOpen: false,
      revealLabel: null,
      revealAtIso: null,
      canVote: false,
      userHasVoted: false,
      userVotePlayerId: null,
      participants: [],
      voteCount: 0,
      eligibleVoterCount: 0,
      voters: [],
      results: null,
    });
  }

  try {
    const votingOpen = isVotingOpen(session.date);
    const { revealLabel, revealAtIso } = getVotingWindow(session.date);

    const {
      participants,
      userVotePlayerId,
      userHasVoted,
      voteRows,
      voteCount,
      eligibleVoterCount,
      voters,
    } = await loadParticipantsAndVotes({
      sessionId,
      userId: user.id,
    });

    const canVote = participants.some(
      (participant) => participant.userId === user.id
    );

    const results = votingOpen
      ? null
      : buildResults({
          participants,
          voteRows,
        });

    if (!votingOpen && results) {
      await ensureResultNotifications({
        clubId: session.club_id,
        sessionId,
        winners: results.winners,
        participants,
      });
    }

    return NextResponse.json({
      sessionId,
      hasResult: true,
      votingOpen,
      revealLabel,
      revealAtIso,
      canVote,
      userHasVoted,
      userVotePlayerId,
      participants: participants.map(({ id: playerId, name }) => ({
        id: playerId,
        name,
      })),
      voteCount,
      eligibleVoterCount,
      voters,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "MVP-Daten konnten nicht geladen werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return NextResponse.json(
      { error: "Ungültige Session-ID." },
      { status: 400 }
    );
  }

  const base = await loadSessionBase(sessionId);

  if ("error" in base) {
    return base.error;
  }

  const { supabase, user, session } = base;

  const body = await request.json().catch(() => null);
  const votedPlayerId = Number(body?.votedPlayerId);

  if (!Number.isFinite(votedPlayerId)) {
    return NextResponse.json(
      { error: "Ungültiger Spieler für die Abstimmung." },
      { status: 400 }
    );
  }

  const { data: resultData, error: resultError } = await supabase
    .from("results")
    .select("session_id")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (resultError) {
    return NextResponse.json({ error: resultError.message }, { status: 500 });
  }

  if (!resultData) {
    return NextResponse.json(
      { error: "MVP Voting startet erst, sobald ein Ergebnis gespeichert wurde." },
      { status: 400 }
    );
  }

  if (!isVotingOpen(session.date)) {
    return NextResponse.json(
      { error: "Das MVP Voting ist bereits beendet." },
      { status: 400 }
    );
  }

  try {
    const { revealLabel } = getVotingWindow(session.date);

    const { participants } = await loadParticipantsAndVotes({
      sessionId,
      userId: user.id,
    });

    const currentUserParticipant = participants.find(
      (participant) => participant.userId === user.id
    );

    if (!currentUserParticipant) {
      return NextResponse.json(
        {
          error:
            "Abstimmen können nur anwesende Teilnehmer mit verknüpftem Spielerprofil.",
        },
        { status: 403 }
      );
    }

    const votedParticipant = participants.find(
      (participant) => participant.id === votedPlayerId
    );

    if (!votedParticipant) {
      return NextResponse.json(
        { error: "Für diesen Spieler kann nicht abgestimmt werden." },
        { status: 400 }
      );
    }

    const { error: upsertError } = await supabase
      .from("session_mvp_votes")
      .upsert(
        {
          session_id: sessionId,
          club_id: session.club_id,
          voter_user_id: user.id,
          voted_player_id: votedPlayerId,
        },
        {
          onConflict: "session_id,voter_user_id",
        }
      );

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    const { count: refreshedVoteCount, error: countError } = await supabase
      .from("session_mvp_votes")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      revealLabel,
      voteCount: refreshedVoteCount ?? 0,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "MVP-Stimme konnte nicht gespeichert werden.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}