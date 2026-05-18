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
  mvp_voting_finalized_at: string | null;
};

type PlayerRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  user_id: string | null;
  mvp_count?: number | null;
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
  cta_href?: string | null;
  cta_label?: string | null;
  secondary_cta_href?: string | null;
  secondary_cta_label?: string | null;
  payload?: Record<string, unknown> | null;
  dedupe_key: string;
};

type Participant = {
  id: number;
  name: string;
  userId: string | null;
  mvpCount: number;
};

type ResultEntry = {
  playerId: number;
  name: string;
  votes: number;
  mvpCount: number;
};

type BadgeUpgrade = {
  playerId: number;
  playerName: string;
  previousMvpCount: number;
  newMvpCount: number;
};

type MvpResults = {
  winners: ResultEntry[];
  leaderboard: ResultEntry[];
  totalVotes: number;
  badgeUpgrade: BadgeUpgrade | null;
  badgeUpgrades: BadgeUpgrade[];
};

const MVP_REVEAL_TIME = "18:00";

function normalizePlayerRelation(
  player: SessionPlayerRow["players"]
): PlayerRow | null {
  if (!player) return null;
  if (Array.isArray(player)) return player[0] ?? null;
  return player;
}

function getPlayerName(player: PlayerRow | null) {
  if (!player) return "Spieler";

  const fullName = [player.first_name, player.last_name]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || "Spieler";
}

function safeMvpCount(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildBadgeUpgrades(winners: ResultEntry[]): BadgeUpgrade[] {
  return winners.map((winner) => ({
    playerId: winner.playerId,
    playerName: winner.name,
    previousMvpCount: Math.max(safeMvpCount(winner.mvpCount) - 1, 0),
    newMvpCount: safeMvpCount(winner.mvpCount),
  }));
}

function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return dateString;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  date.setUTCDate(date.getUTCDate() + days);

  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
}

function formatRevealLabel(dateString: string) {
  const [year, month, day] = dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return `${dateString}, 18:00 Uhr`;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const weekday = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    weekday: "long",
  }).format(date);

  return `${weekday}, 18:00 Uhr`;
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
  const revealDate = addDays(sessionDate, 2);
  const revealLabel = formatRevealLabel(revealDate);

  return {
    revealDate,
    revealLabel,
  };
}

function isVotingOpen(sessionDate: string) {
  const { revealDate } = getVotingWindow(sessionDate);
  const now = getBerlinParts(new Date());

  return (
    now.dateKey < revealDate ||
    (now.dateKey === revealDate && now.timeKey < MVP_REVEAL_TIME)
  );
}

async function isPowerUser(userId: string) {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("user_roles")
    .select("is_power_user")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.is_power_user === true;
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

  let userIsPowerUser = false;

  try {
    userIsPowerUser = await isPowerUser(user.id);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Power-User-Rolle konnte nicht geprüft werden.";

    return {
      error: NextResponse.json({ error: message }, { status: 500 }),
    };
  }

  const db = userIsPowerUser ? createAdminClient() : supabase;

  const { data: sessionData, error: sessionError } = await db
    .from("sessions")
    .select("id, club_id, date, mvp_voting_finalized_at")
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

  if (!userIsPowerUser) {
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
    supabase: db,
    user,
    session: sessionData,
    isPowerUser: userIsPowerUser,
  };
}

async function loadParticipantsAndVotes(params: {
  sessionId: number;
  userId: string;
  supabase:
    | Awaited<ReturnType<typeof createClient>>
    | ReturnType<typeof createAdminClient>;
}) {
  const { sessionId, userId, supabase } = params;

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
            first_name,
            last_name,
            user_id,
            mvp_count
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
        mvpCount: safeMvpCount(player.mvp_count),
      };
    })
    .filter((value): value is Participant => value !== null);

  const voteRows = (allVotesData ?? []) as VoteRow[];
  const userVotePlayerId = userVoteData?.voted_player_id ?? null;

  const uniqueVoterIds = [
    ...new Set(
      voteRows
        .map((row) => row.voter_user_id)
        .filter(
          (value): value is string =>
            typeof value === "string" && value.length > 0
        )
    ),
  ];

  const participantByUserId = new Map(
    participants
      .filter((participant) => participant.userId)
      .map((participant) => [participant.userId as string, participant])
  );

  const votedByNames = uniqueVoterIds
    .map((userIdValue) => participantByUserId.get(userIdValue)?.name ?? null)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => a.localeCompare(b, "de"));

  const voteCount = uniqueVoterIds.length;
  const eligibleVoterCount = participants.filter(
    (participant) => participant.userId
  ).length;

  return {
    participants,
    userVotePlayerId,
    userHasVoted: userVotePlayerId !== null,
    voteRows,
    voteCount,
    eligibleVoterCount,
    votedByNames,
  };
}

function buildResults(params: {
  participants: Participant[];
  voteRows: VoteRow[];
}): MvpResults {
  const { participants, voteRows } = params;

  if (voteRows.length === 0) {
    return {
      winners: [],
      leaderboard: [],
      totalVotes: 0,
      badgeUpgrade: null,
      badgeUpgrades: [],
    };
  }

  const participantByPlayerId = new Map(
    participants.map((participant) => [participant.id, participant])
  );

  const counts = new Map<number, number>();

  for (const row of voteRows) {
    const playerId = Number(row.voted_player_id);
    counts.set(playerId, (counts.get(playerId) ?? 0) + 1);
  }

  const leaderboard: ResultEntry[] = [...counts.entries()]
    .map(([playerId, votes]) => {
      const participant = participantByPlayerId.get(playerId);

      return {
        playerId,
        name: participant?.name ?? "Spieler",
        votes,
        mvpCount: safeMvpCount(participant?.mvpCount),
      };
    })
    .sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.name.localeCompare(b.name, "de");
    });

  const topVotes = leaderboard[0]?.votes ?? 0;
  const winners = leaderboard.filter((entry) => entry.votes === topVotes);

  const badgeUpgrades = buildBadgeUpgrades(winners);
  const badgeUpgrade = badgeUpgrades.length === 1 ? badgeUpgrades[0] : null;

  return {
    winners,
    leaderboard,
    totalVotes: voteRows.length,
    badgeUpgrade,
    badgeUpgrades,
  };
}

function buildResultsAfterFreshFinalization(results: MvpResults): MvpResults {
  if (results.winners.length === 0) {
    return results;
  }

  const winnerIds = new Set(results.winners.map((winner) => winner.playerId));

  const leaderboard = results.leaderboard.map((entry) =>
    winnerIds.has(entry.playerId)
      ? {
          ...entry,
          mvpCount: entry.mvpCount + 1,
        }
      : entry
  );

  const winners = results.winners.map((winner) => ({
    ...winner,
    mvpCount: winner.mvpCount + 1,
  }));

  const badgeUpgrades = buildBadgeUpgrades(winners);
  const badgeUpgrade = badgeUpgrades.length === 1 ? badgeUpgrades[0] : null;

  return {
    ...results,
    winners,
    leaderboard,
    badgeUpgrade,
    badgeUpgrades,
  };
}


async function getClubShareBranding(clubId: string) {
  const admin = createAdminClient();

  const { data: clubData, error: clubError } = await admin
    .from("clubs")
    .select("display_name, logo_path")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) {
    throw new Error(`Clubdaten konnten nicht geladen werden: ${clubError.message}`);
  }

  let clubLogoUrl: string | null = null;

  const logoPath =
    typeof clubData?.logo_path === "string" && clubData.logo_path.trim()
      ? clubData.logo_path.trim()
      : null;

  if (logoPath) {
    const { data: logoData } = admin.storage
      .from("club-logos")
      .getPublicUrl(logoPath);

    clubLogoUrl = logoData?.publicUrl ?? null;
  }

  return {
    clubName:
      typeof clubData?.display_name === "string" && clubData.display_name.trim()
        ? clubData.display_name.trim()
        : "strikr Team",
    clubLogoUrl,
  };
}

async function ensureResultNotifications(params: {
  clubId: string;
  sessionId: number;
  winners: Array<{ playerId: number; name: string; votes: number }>;
  participants: Participant[];
  results: MvpResults;
}) {
  const { clubId, sessionId, winners, participants, results } = params;

  const admin = createAdminClient();
  const clubBranding = await getClubShareBranding(clubId);

  const hasSingleWinner = winners.length === 1;
  const winnerNames = winners.map((entry) => entry.name).join(", ") || "Der MVP";
  const winnerById = new Map(winners.map((winner) => [winner.playerId, winner]));
  const badgeUpgradeByPlayerId = new Map(
    results.badgeUpgrades.map((upgrade) => [upgrade.playerId, upgrade])
  );

  const inserts: NotificationInsert[] = participants
    .filter((participant) => participant.userId)
    .map((participant) => {
      const userId = participant.userId as string;
      const participantWinner = winnerById.get(participant.id) ?? null;
      const isWinner = Boolean(participantWinner);
      const winnerName =
        participantWinner?.name ?? (hasSingleWinner ? winners[0]?.name ?? "Der MVP" : winnerNames);
      const shareVariant = isWinner ? "winner" : "team";

      return {
        user_id: userId,
        club_id: clubId,
        type: isWinner ? "mvp_winner" : "mvp_result",
        title: isWinner
          ? "Du wurdest zum MVP gewählt."
          : hasSingleWinner
            ? `${winnerName} wurde MVP.`
            : "MVP Voting beendet",
        body: isWinner
          ? "Starker Auftritt. Teile deine MVP Card."
          : hasSingleWinner
            ? "Das MVP Voting ist beendet. Schau dir das Ergebnis an."
            : "Das MVP Voting ist beendet. Es gibt mehrere Gewinner.",
        cta_href: isWinner
          ? `/sessions/${sessionId}?share=mvp`
          : `/sessions/${sessionId}?mvp=result`,
        cta_label: isWinner ? "Teilen" : "Ergebnis ansehen",
        payload: {
          sessionId,
          clubId,
          clubName: clubBranding.clubName,
          clubLogoUrl: clubBranding.clubLogoUrl,
          viewerPlayerId: participant.id,
          winnerPlayerId:
            participantWinner?.playerId ?? (hasSingleWinner ? winners[0]?.playerId ?? null : null),
          winnerName,
          winnerNames,
          isWinner,
          shareVariant,
          shareImageUrl: `/api/share/mvp/${sessionId}/image?variant=${shareVariant}`,
          sessionHref: `/sessions/${sessionId}`,
          leaderboard: results.leaderboard,
          winners: results.winners,
          badgeUpgrade: isWinner
            ? badgeUpgradeByPlayerId.get(participant.id) ?? null
            : results.badgeUpgrade,
          badgeUpgrades: results.badgeUpgrades,
          totalVotes: results.totalVotes,
        },
        dedupe_key: `${
          isWinner ? "mvp_winner" : "mvp_result"
        }:${clubId}:${sessionId}:${userId}`,
      };
    });

  if (inserts.length === 0) {
    return;
  }

  const { data, error } = await admin
    .from("user_notifications")
    .upsert(inserts, {
      onConflict: "dedupe_key",
    })
    .select("id");

  if (error) {
    console.error("MVP notifications failed:", error.message);
    throw new Error(`MVP notifications failed: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("MVP notifications failed: no notification rows returned.");
  }
}

async function finalizeMvpIfNeeded(params: {
  session: SessionRow;
  results: MvpResults;
  participants: Participant[];
}) {
  const { session, results, participants } = params;

  if (session.mvp_voting_finalized_at) {
    return results;
  }

  const admin = createAdminClient();
  const finalizedAt = new Date().toISOString();

  const singleWinner =
    results.winners.length === 1 ? results.winners[0] : null;

  const { data: finalizedRows, error: finalizeError } = await admin
    .from("sessions")
    .update({
      mvp_voting_finalized_at: finalizedAt,
      mvp_winner_player_id: singleWinner?.playerId ?? null,
    })
    .eq("id", session.id)
    .is("mvp_voting_finalized_at", null)
    .select("id");

  if (finalizeError) {
    throw new Error(finalizeError.message);
  }

  const didFinalizeNow = (finalizedRows ?? []).length > 0;

  if (!didFinalizeNow) {
    return results;
  }

  if (results.winners.length === 0) {
    return results;
  }

  const participantById = new Map(
    participants.map((participant) => [participant.id, participant])
  );

  await Promise.all(
    results.winners.map(async (winner) => {
      const participant = participantById.get(winner.playerId);
      const nextMvpCount = safeMvpCount(participant?.mvpCount) + 1;

      const { error } = await admin
        .from("players")
        .update({ mvp_count: nextMvpCount })
        .eq("id", winner.playerId)
        .eq("club_id", session.club_id);

      if (error) {
        throw new Error(error.message);
      }
    })
  );

  const finalizedResults = buildResultsAfterFreshFinalization(results);

  await ensureResultNotifications({
    clubId: session.club_id,
    sessionId: session.id,
    winners: finalizedResults.winners,
    participants,
    results: finalizedResults,
  });

  return finalizedResults;
}

export async function GET(request: NextRequest, context: RouteContext) {
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

  const { supabase, user, session, isPowerUser } = base;
  const clubBranding = await getClubShareBranding(session.club_id);
  const forceFinalize =
    request.nextUrl.searchParams.get("forceFinalize") === "1";

  const forceFinalizeEnabled =
    process.env.ENABLE_MVP_FORCE_FINALIZE === "true" ||
    process.env.VERCEL_ENV !== "production";

  if (forceFinalize && !forceFinalizeEnabled) {
    return NextResponse.json(
      {
        error:
          "Manuelles MVP-Finalisieren ist in dieser Umgebung nicht aktiviert.",
      },
      { status: 403 }
    );
  }

  if (forceFinalize && !isPowerUser) {
    return NextResponse.json(
      { error: "Nur Power User dürfen MVP Voting manuell finalisieren." },
      { status: 403 }
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

  const hasResult = Boolean(resultData);

  if (!hasResult) {
    return NextResponse.json({
      sessionId,
      clubName: clubBranding.clubName,
      clubLogoUrl: clubBranding.clubLogoUrl,
      hasResult: false,
      votingOpen: false,
      revealLabel: null,
      canVote: false,
      currentUserPlayerId: null,
      userHasVoted: false,
      userVotePlayerId: null,
      participants: [],
      voteCount: 0,
      eligibleVoterCount: 0,
      votedByNames: [],
      results: null,
    });
  }

  try {
    const votingOpen = session.mvp_voting_finalized_at
      ? false
      : isVotingOpen(session.date);
    const shouldRevealResults = !votingOpen || forceFinalize;
    const { revealLabel } = getVotingWindow(session.date);

    const {
      participants,
      userVotePlayerId,
      userHasVoted,
      voteRows,
      voteCount,
      eligibleVoterCount,
      votedByNames,
    } = await loadParticipantsAndVotes({
      sessionId,
      userId: user.id,
      supabase,
    });

    const currentUserParticipant =
      participants.find((participant) => participant.userId === user.id) ?? null;

    const canVote = Boolean(currentUserParticipant);
    const currentUserPlayerId = currentUserParticipant?.id ?? null;

    let results = shouldRevealResults
      ? buildResults({
          participants,
          voteRows,
        })
      : null;

    if (shouldRevealResults && results) {
      results = await finalizeMvpIfNeeded({
        session,
        results,
        participants,
      });
    }

    return NextResponse.json({
      sessionId,
      clubName: clubBranding.clubName,
      clubLogoUrl: clubBranding.clubLogoUrl,
      hasResult: true,
      votingOpen: forceFinalize ? false : votingOpen,
      revealLabel,
      canVote,
      currentUserPlayerId,
      userHasVoted,
      userVotePlayerId,
      participants: participants.map(({ id: playerId, name, mvpCount }) => ({
        id: playerId,
        name,
        mvpCount,
      })),
      voteCount,
      eligibleVoterCount,
      votedByNames,
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

  if (session.mvp_voting_finalized_at || !isVotingOpen(session.date)) {
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
      supabase,
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