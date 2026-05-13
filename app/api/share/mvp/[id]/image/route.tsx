import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ShareMode = "winner" | "team";

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

type LeaderboardEntry = {
  playerId: number;
  name: string;
  votes: number;
  previous: number;
  current: number;
  badgeLabel: string;
  badgeKey: string;
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

function getTierColors(label: string) {
  const lower = label.toLowerCase();

  if (lower.includes("goat")) {
    return {
      top: "linear-gradient(135deg,#312e81 0%,#db2777 42%,#facc15 72%,#22d3ee 100%)",
      dark: "#1e1b4b",
      accent: "#f0abfc",
      glow: "rgba(217,70,239,0.42)",
    };
  }

  if (lower.includes("gold")) {
    return {
      top: "linear-gradient(135deg,#78350f 0%,#f59e0b 46%,#fde68a 100%)",
      dark: "#78350f",
      accent: "#fde68a",
      glow: "rgba(245,158,11,0.38)",
    };
  }

  if (lower.includes("silber")) {
    return {
      top: "linear-gradient(135deg,#0f172a 0%,#94a3b8 52%,#f8fafc 100%)",
      dark: "#334155",
      accent: "#f1f5f9",
      glow: "rgba(203,213,225,0.34)",
    };
  }

  if (lower.includes("bronze")) {
    return {
      top: "linear-gradient(135deg,#7c2d12 0%,#ea580c 46%,#fed7aa 100%)",
      dark: "#7c2d12",
      accent: "#fed7aa",
      glow: "rgba(249,115,22,0.32)",
    };
  }

  return {
    top: "linear-gradient(135deg,#d4d4d8 0%,#52525b 48%,#020617 100%)",
    dark: "#27272a",
    accent: "#d4d4d8",
    glow: "rgba(161,161,170,0.30)",
  };
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
  } catch {
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
    badgeKey: badge.key,
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

function BrandTopBar({
  clubName,
  clubLogoUrl,
  strikrLogoUrl,
  dark,
}: {
  clubName: string;
  clubLogoUrl: string | null;
  strikrLogoUrl: string;
  dark: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            display: "flex",
            width: 82,
            height: 82,
            borderRadius: 24,
            background: dark ? "rgba(255,255,255,0.10)" : "#ffffff",
            border: dark
              ? "1px solid rgba(255,255,255,0.16)"
              : "1px solid rgba(15,23,42,0.10)",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <img
            src={clubLogoUrl ?? strikrLogoUrl}
            width={82}
            height={82}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: 10,
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 900,
              color: dark ? "#ffffff" : "#020617",
              maxWidth: 520,
            }}
          >
            {clubName}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 5,
              fontSize: 14,
              fontWeight: 900,
              letterSpacing: 3,
              color: dark ? "rgba(255,255,255,0.50)" : "rgba(15,23,42,0.42)",
              textTransform: "uppercase",
            }}
          >
            strikr MVP Moment
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 18px",
          borderRadius: 999,
          background: dark ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)",
          border: dark
            ? "1px solid rgba(255,255,255,0.13)"
            : "1px solid rgba(15,23,42,0.08)",
        }}
      >
        <img
          src={strikrLogoUrl}
          width={34}
          height={34}
          alt=""
          style={{ borderRadius: 10 }}
        />
        <div
          style={{
            display: "flex",
            marginLeft: 10,
            fontSize: 23,
            fontWeight: 900,
            color: dark ? "#ffffff" : "#020617",
          }}
        >
          strikr
        </div>
      </div>
    </div>
  );
}

function renderWinnerCard(params: {
  winner: LeaderboardEntry;
  clubName: string;
  clubLogoUrl: string | null;
  strikrLogoUrl: string;
  badgeImageUrl: string;
  sessionDateLabel: string;
}) {
  const tier = getTierColors(params.winner.badgeLabel);

  return (
    <div
      style={{
        display: "flex",
        width: "1080px",
        height: "1920px",
        flexDirection: "column",
        background:
          "radial-gradient(circle at 50% 16%, rgba(250,204,21,0.24), transparent 34%), linear-gradient(180deg,#020617 0%,#0f172a 52%,#020617 100%)",
        color: "#ffffff",
        padding: 70,
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 34,
          right: 34,
          top: 34,
          bottom: 34,
          borderRadius: 66,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(255,255,255,0.04)",
        }}
      />

      <BrandTopBar
        clubName={params.clubName}
        clubLogoUrl={params.clubLogoUrl}
        strikrLogoUrl={params.strikrLogoUrl}
        dark
      />

      <div
        style={{
          display: "flex",
          position: "relative",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 140,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 900,
            letterSpacing: 5,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.50)",
          }}
        >
          Ich wurde zum
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 218,
            fontWeight: 900,
            letterSpacing: -13,
            lineHeight: 0.86,
            color: "#ffffff",
          }}
        >
          MVP
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 22,
            fontSize: 38,
            fontWeight: 900,
            color: "rgba(255,255,255,0.72)",
          }}
        >
          {params.winner.name}
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 12,
            fontSize: 24,
            fontWeight: 800,
            color: "rgba(255,255,255,0.46)",
          }}
        >
          {params.sessionDateLabel}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "relative",
          marginTop: 78,
          padding: 48,
          borderRadius: 58,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 390,
            height: 390,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img
            src={params.badgeImageUrl}
            width={390}
            height={390}
            alt=""
            style={{ objectFit: "contain" }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 44,
            flex: 1,
          }}
        >
          <div style={{ display: "flex" }}>
            <div
              style={{
                display: "flex",
                padding: "14px 20px",
                borderRadius: 999,
                background: "#ffffff",
                color: "#020617",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {params.winner.current}x MVP
            </div>

            <div
              style={{
                display: "flex",
                marginLeft: 12,
                padding: "14px 20px",
                borderRadius: 999,
                background: tier.top,
                color: tier.accent,
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              {params.winner.badgeLabel}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 34,
              fontSize: 46,
              lineHeight: 1.04,
              fontWeight: 900,
              color: "#ffffff",
            }}
          >
            {params.winner.previous} → {params.winner.current}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontSize: 27,
              fontWeight: 800,
              color: "rgba(255,255,255,0.58)",
            }}
          >
            {params.winner.badgeLabel} strikr badge
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div
        style={{
          display: "flex",
          position: "relative",
          borderRadius: 38,
          background: "#ffffff",
          color: "#020617",
          padding: 36,
          fontSize: 34,
          fontWeight: 900,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Markiere dein Team + @getstrikr · www.strikr.team
      </div>
    </div>
  );
}

function renderTeamCard(params: {
  winner: LeaderboardEntry;
  leaderboard: LeaderboardEntry[];
  clubName: string;
  clubLogoUrl: string | null;
  strikrLogoUrl: string;
  badgeImageUrl: string;
  sessionDateLabel: string;
}) {
  const tier = getTierColors(params.winner.badgeLabel);

  return (
    <div
      style={{
        display: "flex",
        width: "1080px",
        height: "1920px",
        flexDirection: "column",
        background:
          "radial-gradient(circle at 82% 12%, rgba(15,23,42,0.055), transparent 28%), linear-gradient(180deg,#f8fafc 0%,#ffffff 55%,#f8fafc 100%)",
        color: "#020617",
        padding: 70,
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 34,
          right: 34,
          top: 34,
          bottom: 34,
          borderRadius: 66,
          border: "1px solid rgba(15,23,42,0.08)",
          background: "rgba(255,255,255,0.62)",
        }}
      />

      <BrandTopBar
        clubName={params.clubName}
        clubLogoUrl={params.clubLogoUrl}
        strikrLogoUrl={params.strikrLogoUrl}
        dark={false}
      />

      <div
        style={{
          display: "flex",
          position: "relative",
          marginTop: 72,
          borderRadius: 48,
          background: tier.top,
          padding: 44,
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 23,
            fontWeight: 900,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.72)",
          }}
        >
          strikr MVP Badge
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 10,
            fontSize: 82,
            fontWeight: 900,
            letterSpacing: -4,
            lineHeight: 0.95,
            color: "#ffffff",
          }}
        >
          {params.winner.badgeLabel}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "relative",
          marginTop: 48,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 330,
            height: 330,
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <img
            src={params.badgeImageUrl}
            width={330}
            height={330}
            alt=""
            style={{ objectFit: "contain" }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginLeft: 48,
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 29,
              fontWeight: 900,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "rgba(15,23,42,0.42)",
            }}
          >
            Glückwunsch
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 18,
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: -5,
              lineHeight: 0.94,
              color: "#020617",
            }}
          >
            {params.winner.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 22,
              fontSize: 31,
              fontWeight: 800,
              lineHeight: 1.18,
              color: "rgba(15,23,42,0.56)",
            }}
          >
            wurde von seinem Team zum MVP des Trainings gewählt.
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          position: "relative",
          marginTop: 58,
          padding: 38,
          borderRadius: 44,
          background: "#ffffff",
          border: "1px solid rgba(15,23,42,0.08)",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 21,
            fontWeight: 900,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: "rgba(15,23,42,0.36)",
          }}
        >
          Voting Top 3
        </div>

        {params.leaderboard.slice(0, 3).map((entry, index) => (
          <div
            key={entry.playerId}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 26,
              paddingBottom: index < Math.min(params.leaderboard.length, 3) - 1 ? 22 : 0,
              borderBottom:
                index < Math.min(params.leaderboard.length, 3) - 1
                  ? "1px solid rgba(15,23,42,0.08)"
                  : "none",
              fontSize: 32,
              fontWeight: 900,
              color: "#020617",
            }}
          >
            <div style={{ display: "flex" }}>
              {index + 1}. {entry.name}
            </div>
            <div style={{ display: "flex", color: "rgba(15,23,42,0.48)" }}>
              {entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flex: 1 }} />

      <div
        style={{
          display: "flex",
          position: "relative",
          borderRadius: 38,
          background: "#020617",
          color: "#ffffff",
          padding: 36,
          fontSize: 34,
          fontWeight: 900,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Markiere dein Team + @getstrikr · www.strikr.team
      </div>
    </div>
  );
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

    if (counts.size === 0 && session.mvp_winner_player_id) {
      counts.set(session.mvp_winner_player_id, 1);
    }

    if (
      session.mvp_winner_player_id &&
      !playerById.has(session.mvp_winner_player_id)
    ) {
      const { data: winnerPlayerData } = await admin
        .from("players")
        .select("id, first_name, last_name, mvp_count")
        .eq("id", session.mvp_winner_player_id)
        .maybeSingle();

      if (winnerPlayerData) {
        const winnerPlayer = winnerPlayerData as PlayerRow;
        playerById.set(winnerPlayer.id, winnerPlayer);
      }
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

    const badgeAssetUrl = toAbsoluteUrl(
      request,
      `/badges/hero/${winner.badgeKey}.webp`
    );
    const strikrLogoAssetUrl = toAbsoluteUrl(request, "/brand/strikr-mark.png");

    const [badgeImageUrl, strikrLogoUrl, clubLogoDataUrl] = await Promise.all([
      fetchAsDataUrl(badgeAssetUrl),
      fetchAsDataUrl(strikrLogoAssetUrl),
      optionalFetchAsDataUrl(clubLogoUrl),
    ]);

    const card =
      mode === "winner"
        ? renderWinnerCard({
            winner,
            clubName,
            clubLogoUrl: clubLogoDataUrl,
            strikrLogoUrl,
            badgeImageUrl,
            sessionDateLabel: formatSessionDateLabel(session.date),
          })
        : renderTeamCard({
            winner,
            leaderboard,
            clubName,
            clubLogoUrl: clubLogoDataUrl,
            strikrLogoUrl,
            badgeImageUrl,
            sessionDateLabel: formatSessionDateLabel(session.date),
          });

    return new ImageResponse(card, {
      width: 1080,
      height: 1920,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "MVP Share-Bild konnte nicht erzeugt werden.";

    return errorResponse(message, 500);
  }
}
