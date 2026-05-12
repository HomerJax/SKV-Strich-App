import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";

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

type SessionPlayerRow = {
  player_id: number;
  players: PlayerRow | PlayerRow[] | null;
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
  return [player?.first_name, player?.last_name].filter(Boolean).join(" ") || "Spieler";
}

function getBadgeMeta(count: number) {
  if (count >= 10) return { label: "GOAT", key: "goat" };
  if (count >= 7) return { label: "Gold", key: "gold" };
  if (count >= 5) return { label: "Silber", key: "silber" };
  if (count >= 3) return { label: "Bronze", key: "bronze" };
  return { label: "Blech", key: "blech" };
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

function toAbsoluteUrl(request: Request, path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return new URL(path, request.url).toString();
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return new Response("Invalid session id", { status: 400 });
  }

  const url = new URL(request.url);
  const variant = url.searchParams.get("variant") === "winner" ? "winner" : "team";

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, club_id, date, mvp_winner_player_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (!session) {
    return new Response("Session not found", { status: 404 });
  }

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
        .select("display_name")
        .eq("id", session.club_id)
        .maybeSingle(),
    ]);

  const players = ((playerData ?? []) as SessionPlayerRow[])
    .map((row) => (Array.isArray(row.players) ? row.players[0] : row.players))
    .filter((player): player is PlayerRow => Boolean(player));

  const playerById = new Map(players.map((player) => [player.id, player]));
  const counts = new Map<number, number>();

  for (const vote of (voteData ?? []) as VoteRow[]) {
    counts.set(vote.voted_player_id, (counts.get(vote.voted_player_id) ?? 0) + 1);
  }

  const leaderboard: LeaderboardEntry[] = [...counts.entries()]
    .map(([playerId, votes]) => {
      const player = playerById.get(playerId);
      const current = player?.mvp_count ?? 0;
      const previous = Math.max(current - 1, 0);
      const badge = getBadgeMeta(current);

      return {
        playerId,
        name: getName(player),
        votes,
        previous,
        current,
        badgeLabel: badge.label,
        badgeKey: badge.key,
      };
    })
    .sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.name.localeCompare(b.name, "de");
    });

  const winner =
    leaderboard.find((entry) => entry.playerId === session.mvp_winner_player_id) ??
    leaderboard[0];

  if (!winner) {
    return new Response("No MVP result found", { status: 404 });
  }

  const clubName = clubData?.display_name?.trim() || "strikr Team";
  const badgeImageUrl = toAbsoluteUrl(request, `/badges/hero/${winner.badgeKey}.webp`);
  const strikrLogoUrl = toAbsoluteUrl(request, "/brand/strikr-mark.png");

  const [badgeDataUrl, strikrLogoDataUrl] = await Promise.all([
    fetchAsDataUrl(badgeImageUrl),
    fetchAsDataUrl(strikrLogoUrl),
  ]);

  const isWinnerCard = variant === "winner";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1080px",
          height: "1920px",
          flexDirection: "column",
          background: isWinnerCard
            ? "radial-gradient(circle at 50% 14%, rgba(250,204,21,0.26), transparent 34%), linear-gradient(180deg,#020617 0%,#0f172a 52%,#020617 100%)"
            : "radial-gradient(circle at 82% 12%, rgba(15,23,42,0.055), transparent 28%), linear-gradient(180deg,#f8fafc 0%,#ffffff 55%,#f8fafc 100%)",
          color: isWinnerCard ? "#ffffff" : "#020617",
          padding: 70,
          fontFamily: "Arial",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 34,
            borderRadius: 66,
            border: isWinnerCard
              ? "1px solid rgba(255,255,255,0.14)"
              : "1px solid rgba(15,23,42,0.08)",
            background: isWinnerCard ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.62)",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "relative",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={strikrLogoDataUrl}
              width={74}
              height={74}
              style={{ borderRadius: 22 }}
              alt=""
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", fontSize: 34, fontWeight: 900 }}>
                strikr
              </div>
              <div
                style={{
                  display: "flex",
                  marginTop: 4,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: 2.4,
                  color: isWinnerCard ? "rgba(255,255,255,0.58)" : "rgba(15,23,42,0.42)",
                }}
              >
                MVP MOMENT
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              padding: "15px 22px",
              borderRadius: 999,
              fontSize: 22,
              fontWeight: 900,
              background: isWinnerCard ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)",
              color: isWinnerCard ? "rgba(255,255,255,0.78)" : "rgba(15,23,42,0.55)",
            }}
          >
            {clubName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "relative",
            flexDirection: "column",
            alignItems: isWinnerCard ? "center" : "flex-start",
            marginTop: isWinnerCard ? 170 : 220,
            textAlign: isWinnerCard ? "center" : "left",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 27,
              fontWeight: 900,
              letterSpacing: 5,
              textTransform: "uppercase",
              color: isWinnerCard ? "rgba(255,255,255,0.48)" : "rgba(15,23,42,0.36)",
            }}
          >
            {isWinnerCard ? "Ich wurde zum" : "Glückwunsch"}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: isWinnerCard ? 210 : 96,
              fontWeight: 900,
              letterSpacing: isWinnerCard ? -12 : -5,
              lineHeight: 0.88,
              color: isWinnerCard ? "#ffffff" : "#020617",
            }}
          >
            {isWinnerCard ? "MVP" : winner.name}
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 28,
              maxWidth: 850,
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.25,
              color: isWinnerCard ? "rgba(255,255,255,0.68)" : "rgba(15,23,42,0.56)",
            }}
          >
            {isWinnerCard
              ? `${winner.name} · ${clubName}`
              : "wurde von seinem Team zum MVP des Trainings gewählt."}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "relative",
            marginTop: isWinnerCard ? 82 : 74,
            padding: isWinnerCard ? 46 : 40,
            borderRadius: 54,
            background: isWinnerCard ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.82)",
            border: isWinnerCard
              ? "1px solid rgba(255,255,255,0.14)"
              : "1px solid rgba(15,23,42,0.08)",
            alignItems: "center",
            gap: 42,
          }}
        >
          <div
            style={{
              display: "flex",
              width: isWinnerCard ? 380 : 250,
              height: isWinnerCard ? 380 : 250,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={badgeDataUrl}
              width={isWinnerCard ? 380 : 250}
              height={isWinnerCard ? 380 : 250}
              style={{ objectFit: "contain" }}
              alt=""
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div
                style={{
                  display: "flex",
                  padding: "13px 18px",
                  borderRadius: 999,
                  background: isWinnerCard ? "#ffffff" : "#020617",
                  color: isWinnerCard ? "#020617" : "#ffffff",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {winner.current}x MVP
              </div>

              <div
                style={{
                  display: "flex",
                  padding: "13px 18px",
                  borderRadius: 999,
                  background: isWinnerCard ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)",
                  color: isWinnerCard ? "rgba(255,255,255,0.76)" : "rgba(15,23,42,0.58)",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {winner.badgeLabel}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 26,
                fontSize: 42,
                lineHeight: 1.08,
                fontWeight: 900,
                color: isWinnerCard ? "#ffffff" : "#020617",
              }}
            >
              {winner.previous} → {winner.current}
            </div>

            <div
              style={{
                display: "flex",
                marginTop: 10,
                fontSize: 25,
                fontWeight: 800,
                color: isWinnerCard ? "rgba(255,255,255,0.58)" : "rgba(15,23,42,0.50)",
              }}
            >
              {winner.badgeLabel} strikr badge
            </div>
          </div>
        </div>

        {!isWinnerCard && leaderboard.length > 1 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              marginTop: 38,
              padding: 34,
              borderRadius: 42,
              background: "rgba(255,255,255,0.84)",
              border: "1px solid rgba(15,23,42,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 900,
                letterSpacing: 3,
                textTransform: "uppercase",
                color: "rgba(15,23,42,0.34)",
              }}
            >
              Voting-Ergebnis
            </div>

            {leaderboard.slice(0, 3).map((entry, index) => (
              <div
                key={entry.playerId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 24,
                  paddingBottom: index < Math.min(leaderboard.length, 3) - 1 ? 20 : 0,
                  borderBottom:
                    index < Math.min(leaderboard.length, 3) - 1
                      ? "1px solid rgba(15,23,42,0.08)"
                      : "none",
                  fontSize: 31,
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
        ) : null}

        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            position: "relative",
            borderRadius: 38,
            background: isWinnerCard ? "#ffffff" : "#020617",
            color: isWinnerCard ? "#020617" : "#ffffff",
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
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
