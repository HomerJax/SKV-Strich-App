import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import MvpShareImage from "@/components/share/mvp-share/MvpShareImage";
import type {
  LeaderboardEntry,
  ShareMode,
} from "@/components/share/mvp-share/mvp-share.types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type VoteRow = {
  voted_player_id: number;
};

type PlayerRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  mvp_count: number | null;
};

type SessionRow = {
  id: number;
  club_id: string;
  date: string | null;
  mvp_winner_player_id: number | null;
};

type SessionPlayerRow = {
  player_id: number;
  players: PlayerRow | PlayerRow[] | null;
};

type ClubRow = {
  display_name: string | null;
  logo_path: string | null;
};

function getName(player?: PlayerRow | null) {
  return (
    [player?.first_name, player?.last_name].filter(Boolean).join(" ").trim() ||
    "Spieler"
  );
}

function getBadgeMeta(count: number) {
  if (count >= 10) return { label: "GOAT", key: "goat" };
  if (count >= 7) return { label: "Gold", key: "gold" };
  if (count >= 5) return { label: "Silber", key: "silber" };
  if (count >= 3) return { label: "Bronze", key: "bronze" };
  return { label: "Blech", key: "blech" };
}

function toAbsoluteUrl(request: Request, pathOrUrl: string) {
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("data:")
  ) {
    return pathOrUrl;
  }

  return new URL(pathOrUrl, request.url).toString();
}

async function fetchAsDataUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Asset konnte nicht geladen werden: ${url}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function optionalFetchAsDataUrl(url: string | null) {
  if (!url) return null;

  try {
    return await fetchAsDataUrl(url);
  } catch (error) {
    console.warn("Optional MVP share asset could not be loaded:", error);
    return null;
  }
}

function formatSessionDateLabel(date: string | null) {
  if (!date) return "MVP Ergebnis";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "MVP Ergebnis";
  }

  return parsed.toLocaleDateString("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

function buildLeaderboardEntry(params: {
  playerId: number;
  player: PlayerRow | undefined;
  votes: number;
}): LeaderboardEntry {
  const current = Math.max(params.player?.mvp_count ?? 0, 1);
  const previous = Math.max(current - 1, 0);
  const badge = getBadgeMeta(current);

  return {
    playerId: params.playerId,
    name: getName(params.player),
    votes: params.votes,
    previous,
    current,
    badgeLabel: badge.label,
    earnedBadgeText: `${badge.label} strikr badge`,
  };
}

function errorResponse(message: string, status = 500) {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    },
  });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const sessionId = Number(id);

    if (!Number.isFinite(sessionId) || sessionId <= 0) {
      return errorResponse("Invalid session id", 400);
    }

    const url = new URL(request.url);
    const mode: ShareMode =
      url.searchParams.get("variant") === "winner" ? "winner" : "team";

    const admin = createAdminClient();

    const { data: sessionData, error: sessionError } = await admin
      .from("sessions")
      .select("id, club_id, date, mvp_winner_player_id")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !sessionData) {
      return errorResponse("Session not found", 404);
    }

    const session = sessionData as SessionRow;

    const [{ data: voteData }, { data: playerData }, { data: clubData }] =
      await Promise.all([
        admin
          .from("session_mvp_votes")
          .select("voted_player_id")
          .eq("session_id", sessionId),
        admin
          .from("session_players")
          .select(
            `
            player_id,
            players (
              id,
              first_name,
              last_name,
              mvp_count
            )
          `
          )
          .eq("session_id", sessionId),
        admin
          .from("clubs")
          .select("display_name, logo_path")
          .eq("id", session.club_id)
          .maybeSingle(),
      ]);

    const players = ((playerData ?? []) as SessionPlayerRow[])
      .map((row) => (Array.isArray(row.players) ? row.players[0] : row.players))
      .filter((player): player is PlayerRow => Boolean(player));

    const playerById = new Map(players.map((player) => [player.id, player]));
    const counts = new Map<number, number>();

    for (const vote of (voteData ?? []) as VoteRow[]) {
      counts.set(
        vote.voted_player_id,
        (counts.get(vote.voted_player_id) ?? 0) + 1
      );
    }

    const leaderboard = [...counts.entries()]
      .map(([playerId, votes]) =>
        buildLeaderboardEntry({
          playerId,
          player: playerById.get(playerId),
          votes,
        })
      )
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return a.name.localeCompare(b.name, "de");
      });

    const winner =
      leaderboard.find(
        (entry) => entry.playerId === session.mvp_winner_player_id
      ) ?? leaderboard[0];

    if (!winner) {
      return errorResponse("No MVP result found", 404);
    }

    const club = (clubData ?? null) as ClubRow | null;
    const clubName = club?.display_name?.trim() || "strikr Team";

    let clubLogoUrl: string | null = null;

    if (club?.logo_path) {
      const { data: logoData } = admin.storage
        .from("club-logos")
        .getPublicUrl(club.logo_path);

      clubLogoUrl = logoData?.publicUrl ?? null;
    }

    const badgeKey = getBadgeMeta(winner.current).key;
    const badgeAssetUrl = toAbsoluteUrl(
      request,
      `/badges/hero/${badgeKey}.webp`
    );
    const strikrLogoAssetUrl = toAbsoluteUrl(request, "/brand/strikr-mark.png");

    const [badgeImageUrl, strikrLogoUrl, clubLogoDataUrl] = await Promise.all([
      fetchAsDataUrl(badgeAssetUrl),
      fetchAsDataUrl(strikrLogoAssetUrl),
      optionalFetchAsDataUrl(clubLogoUrl),
    ]);

    return new ImageResponse(
      (
        <MvpShareImage
          mode={mode}
          strikrLogoUrl={strikrLogoUrl}
          clubLogoUrl={clubLogoDataUrl ?? strikrLogoUrl}
          badgeImageUrl={badgeImageUrl}
          clubName={clubName}
          sessionDateLabel={formatSessionDateLabel(session.date)}
          winner={winner}
          leaderboard={leaderboard}
        />
      ),
      {
        width: 1080,
        height: 1920,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "MVP Share-Bild konnte nicht erzeugt werden.";

    return errorResponse(message, 500);
  }
}
