import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import sharp from "sharp";

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
  return [player?.first_name, player?.last_name].filter(Boolean).join(" ") || "Spieler";
}

function getBadgeMeta(count: number) {
  if (count >= 10) return { label: "GOAT", key: "goat" };
  if (count >= 7) return { label: "Gold", key: "gold" };
  if (count >= 5) return { label: "Silber", key: "silber" };
  if (count >= 3) return { label: "Bronze", key: "bronze" };
  return { label: "Blech", key: "blech" };
}

function getNextBadgeProgress(count: number) {
  if (count >= 10) {
    return {
      target: null as number | null,
      label: null as string | null,
      progressPercent: 100,
      text: "Höchstes Badge erreicht",
    };
  }

  if (count >= 7) {
    return {
      target: 10,
      label: "GOAT",
      progressPercent: Math.min(100, Math.max(8, (count / 10) * 100)),
      text: `${count} / 10 MVPs bis GOAT`,
    };
  }

  if (count >= 5) {
    return {
      target: 7,
      label: "Gold",
      progressPercent: Math.min(100, Math.max(8, (count / 7) * 100)),
      text: `${count} / 7 MVPs bis Gold`,
    };
  }

  if (count >= 3) {
    return {
      target: 5,
      label: "Silber",
      progressPercent: Math.min(100, Math.max(8, (count / 5) * 100)),
      text: `${count} / 5 MVPs bis Silber`,
    };
  }

  return {
    target: 3,
    label: "Bronze",
    progressPercent: Math.min(100, Math.max(8, (count / 3) * 100)),
    text: `${count} / 3 MVPs bis Bronze`,
  };
}

async function fetchAsDataUrl(url: string) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`Asset konnte nicht geladen werden: ${url}`);
  }

  const inputBuffer = Buffer.from(await response.arrayBuffer());
  const pngBuffer = await sharp(inputBuffer).png().toBuffer();

  return `data:image/png;base64,${pngBuffer.toString("base64")}`;
}

async function maybeFetchAsDataUrl(url: string | null) {
  if (!url) return null;

  try {
    return await fetchAsDataUrl(url);
  } catch {
    return null;
  }
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
  const sharePerspective = url.searchParams.get("perspective") === "team" ? "team" : "self";
  const requestedWinnerPlayerIdRaw = url.searchParams.get("playerId");
  const requestedWinnerPlayerId =
    requestedWinnerPlayerIdRaw !== null ? Number(requestedWinnerPlayerIdRaw) : null;

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
        .select("display_name, logo_path")
        .eq("id", session.club_id)
        .maybeSingle(),
    ]);

  const club = clubData as ClubRow | null;

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

  const highestVoteCount = leaderboard[0]?.votes ?? 0;
  const tiedWinners = leaderboard.filter((entry) => entry.votes === highestVoteCount);

  const requestedWinner =
    requestedWinnerPlayerId !== null && Number.isFinite(requestedWinnerPlayerId)
      ? tiedWinners.find((entry) => entry.playerId === requestedWinnerPlayerId)
      : null;

  if (variant === "winner" && requestedWinnerPlayerId !== null && !requestedWinner) {
    return new Response("Requested player is not an MVP winner for this session", {
      status: 404,
    });
  }

  const winner =
    requestedWinner ??
    tiedWinners.find((entry) => entry.playerId === session.mvp_winner_player_id) ??
    tiedWinners[0] ??
    leaderboard[0];

  if (!winner) {
    return new Response("No MVP result found", { status: 404 });
  }

  const clubName = club?.display_name?.trim() || "strikr Team";
  const isWinnerCard = variant === "winner";
  const isTeamPerspective = isWinnerCard && sharePerspective === "team";
  const progress = getNextBadgeProgress(winner.current);

  const badgeImageUrl = toAbsoluteUrl(request, `/badges/hero/${winner.badgeKey}.webp`);
  const strikrLogoUrl = toAbsoluteUrl(request, "/brand/strikr-mark.png");

  let clubLogoUrl: string | null = null;

  if (club?.logo_path?.trim()) {
    const { data: logoData } = admin.storage
      .from("club-logos")
      .getPublicUrl(club.logo_path.trim());

    clubLogoUrl = logoData?.publicUrl ?? null;
  }

  const [badgeDataUrl, strikrLogoDataUrl, clubLogoDataUrl] = await Promise.all([
    fetchAsDataUrl(badgeImageUrl),
    fetchAsDataUrl(strikrLogoUrl),
    maybeFetchAsDataUrl(clubLogoUrl),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1080px",
          height: "1920px",
          flexDirection: "column",
          background: isWinnerCard ? "#020617" : "#f8fafc",
          color: isWinnerCard ? "#ffffff" : "#020617",
          padding: 60,
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            flexDirection: "column",
            borderRadius: 56,
            border: isWinnerCard
              ? "1px solid rgba(255,255,255,0.16)"
              : "1px solid rgba(15,23,42,0.10)",
            background: isWinnerCard ? "#07111f" : "#ffffff",
            padding: 48,
          }}
        >
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <img
                src={strikrLogoDataUrl}
                width={72}
                height={72}
                style={{ borderRadius: 20 }}
                alt=""
              />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginLeft: 18,
                }}
              >
                <div style={{ display: "flex", fontSize: 38, fontWeight: 900 }}>
                  strikr
                </div>
                <div
                  style={{
                    display: "flex",
                    marginTop: 4,
                    fontSize: 15,
                    fontWeight: 900,
                    letterSpacing: 3,
                    color: isWinnerCard ? "rgba(255,255,255,0.50)" : "rgba(15,23,42,0.42)",
                    textTransform: "uppercase",
                  }}
                >
                  MVP Moment
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center" }}>
              {clubLogoDataUrl ? (
                <img
                  src={clubLogoDataUrl}
                  width={76}
                  height={76}
                  style={{ borderRadius: 22 }}
                  alt=""
                />
              ) : null}

              <div
                style={{
                  display: "flex",
                  marginLeft: clubLogoDataUrl ? 16 : 0,
                  padding: "15px 22px",
                  borderRadius: 999,
                  background: isWinnerCard ? "rgba(255,255,255,0.10)" : "rgba(15,23,42,0.06)",
                  color: isWinnerCard ? "rgba(255,255,255,0.76)" : "rgba(15,23,42,0.60)",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {clubName}
              </div>
            </div>
          </div>

          {isWinnerCard ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                marginTop: 132,
              }}
            >
              <div
                style={{
                  display: "flex",
                  maxWidth: 900,
                  fontSize: isTeamPerspective ? 76 : 68,
                  fontWeight: 900,
                  letterSpacing: -4,
                  lineHeight: 0.98,
                  color: isWinnerCard ? "#ffffff" : "#020617",
                }}
              >
                {isTeamPerspective ? winner.name : "Ich wurde zum"}
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 24,
                  fontSize: 210,
                  fontWeight: 900,
                  letterSpacing: -13,
                  lineHeight: 0.82,
                  color: "#ffffff",
                }}
              >
                MVP
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 34,
                  maxWidth: 850,
                  fontSize: 33,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: "rgba(255,255,255,0.66)",
                }}
              >
                {isTeamPerspective
                  ? `wurde zum MVP gewählt · ${clubName}`
                  : `${winner.name} · ${clubName}`}
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 70,
                  width: 560,
                  height: 560,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={badgeDataUrl}
                  width={560}
                  height={560}
                  style={{ objectFit: "contain" }}
                  alt=""
                />
              </div>

              <div
                style={{
                  display: "flex",
                  width: "100%",
                  flexDirection: "column",
                  marginTop: 52,
                  padding: "32px 36px",
                  borderRadius: 34,
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.13)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: 23,
                      fontWeight: 900,
                      letterSpacing: 3,
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.50)",
                    }}
                  >
                    Badge-Fortschritt
                  </div>

                  <div
                    style={{
                      display: "flex",
                      fontSize: 28,
                      fontWeight: 900,
                      color: "rgba(255,255,255,0.88)",
                    }}
                  >
                    {progress.text}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    height: 18,
                    marginTop: 24,
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.15)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: `${progress.progressPercent}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: "#e5e7eb",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    marginTop: 18,
                    fontSize: 24,
                    fontWeight: 900,
                    color: "rgba(255,255,255,0.56)",
                  }}
                >
                  Aktuelles Badge: {winner.badgeLabel} · {winner.current}x MVP
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 142,
              }}
            >
              <div
                style={{
                  display: "flex",
                  fontSize: 74,
                  fontWeight: 900,
                  letterSpacing: -4,
                  lineHeight: 0.9,
                  color: "rgba(15,23,42,0.54)",
                }}
              >
                strikr MVP
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 24,
                  fontSize: tiedWinners.length > 1 ? 128 : 116,
                  fontWeight: 900,
                  letterSpacing: -8,
                  lineHeight: 0.84,
                  color: "#020617",
                }}
              >
                {tiedWinners.length > 1 ? `${tiedWinners.length} Gewinner` : winner.name}
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: 86,
                }}
              >
                {tiedWinners.slice(0, 5).map((entry, index) => (
                  <div
                    key={entry.playerId}
                    style={{
                      display: "flex",
                      width: "100%",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginTop: index === 0 ? 0 : 22,
                      padding: "28px 32px",
                      borderRadius: 30,
                      background: "#f1f5f9",
                      border: "1px solid rgba(15,23,42,0.08)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        fontSize: 48,
                        fontWeight: 900,
                        letterSpacing: -2,
                        color: "#020617",
                      }}
                    >
                      {entry.name}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        fontSize: 30,
                        fontWeight: 900,
                        color: "rgba(15,23,42,0.52)",
                      }}
                    >
                      {entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  marginTop: 54,
                  fontSize: 34,
                  fontWeight: 900,
                  lineHeight: 1.22,
                  color: "rgba(15,23,42,0.58)",
                }}
              >
                {tiedWinners.length > 1
                  ? "wurden gemeinsam zum MVP gewählt."
                  : "wurde von seinem Team zum MVP gewählt."}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flex: 1 }} />

          <div
            style={{
              display: "flex",
              width: "100%",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "26px 30px",
              borderRadius: 28,
              background: isWinnerCard ? "rgba(255,255,255,0.08)" : "#020617",
              border: isWinnerCard ? "1px solid rgba(255,255,255,0.10)" : "1px solid #020617",
              color: isWinnerCard ? "rgba(255,255,255,0.70)" : "#ffffff",
              fontSize: 21,
              fontWeight: 900,
            }}
          >
            <div style={{ display: "flex" }}>created with strikr</div>
            <div style={{ display: "flex" }}>@getstrikr · strikr.team</div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1920,
    }
  );
}
