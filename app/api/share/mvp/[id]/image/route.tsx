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

function getName(player?: PlayerRow | null) {
  return [player?.first_name, player?.last_name].filter(Boolean).join(" ") || "Spieler";
}

function getBadgeLabel(count: number) {
  if (count >= 10) return "GOAT";
  if (count >= 7) return "Gold";
  if (count >= 5) return "Silber";
  if (count >= 3) return "Bronze";
  if (count >= 1) return "Blech";
  return "Kein Badge";
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const sessionId = Number(id);

  if (!Number.isFinite(sessionId)) {
    return new Response("Invalid session id", { status: 400 });
  }

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("sessions")
    .select("id, club_id")
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

  const players = ((playerData ?? []) as Array<{
    player_id: number;
    players: PlayerRow | PlayerRow[] | null;
  }>)
    .map((row) => (Array.isArray(row.players) ? row.players[0] : row.players))
    .filter((player): player is PlayerRow => Boolean(player));

  const playerById = new Map(players.map((player) => [player.id, player]));

  const counts = new Map<number, number>();

  for (const vote of (voteData ?? []) as VoteRow[]) {
    counts.set(vote.voted_player_id, (counts.get(vote.voted_player_id) ?? 0) + 1);
  }

  const leaderboard = [...counts.entries()]
    .map(([playerId, votes]) => {
      const player = playerById.get(playerId);
      const currentMvpCount = player?.mvp_count ?? 0;
      const previousMvpCount = Math.max(currentMvpCount - 1, 0);

      return {
        playerId,
        name: getName(player),
        votes,
        previousMvpCount,
        currentMvpCount,
        badgeLabel: getBadgeLabel(currentMvpCount),
      };
    })
    .sort((a, b) => {
      if (b.votes !== a.votes) return b.votes - a.votes;
      return a.name.localeCompare(b.name, "de");
    });

  const topVotes = leaderboard[0]?.votes ?? 0;
  const winners = leaderboard.filter((entry) => entry.votes === topVotes);
  const clubName = clubData?.display_name ?? "strikr Team";

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1920px",
          display: "flex",
          flexDirection: "column",
          background:
            "linear-gradient(180deg, #050816 0%, #0f172a 48%, #020617 100%)",
          color: "white",
          padding: "70px",
          fontFamily: "Arial",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 900 }}>
            strikr
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#facc15", fontWeight: 800 }}>
            MVP VOTING
          </div>
        </div>

        <div style={{ display: "flex", marginTop: 90, fontSize: 76, fontWeight: 900 }}>
          MVP Ergebnis
        </div>

        <div style={{ display: "flex", marginTop: 16, fontSize: 34, color: "#cbd5e1" }}>
          {clubName}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 70,
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: 44,
            padding: 44,
          }}
        >
          <div style={{ display: "flex", color: "#b45309", fontSize: 32, fontWeight: 900 }}>
            🏆 {winners.length > 1 ? "MVP-Gleichstand" : "MVP"}
          </div>

          <div style={{ display: "flex", marginTop: 22, fontSize: 56, fontWeight: 900, lineHeight: 1.08 }}>
            {winners.map((winner) => winner.name).join(", ")}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28, marginTop: 44 }}>
          {winners.slice(0, 2).map((winner) => (
            <div
              key={winner.playerId}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "#111827",
                border: "3px solid #facc15",
                borderRadius: 36,
                padding: 34,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 40, fontWeight: 900 }}>
                  {winner.name}
                </div>
                <div style={{ display: "flex", marginTop: 12, fontSize: 30, color: "#fde68a", fontWeight: 800 }}>
                  {winner.previousMvpCount} → {winner.currentMvpCount} MVPs
                </div>
                <div style={{ display: "flex", marginTop: 8, fontSize: 26, color: "#cbd5e1" }}>
                  Neues Badge: {winner.badgeLabel}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  width: 150,
                  height: 150,
                  borderRadius: 36,
                  background: "linear-gradient(135deg, #78716c, #292524)",
                  border: "5px solid #a8a29e",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f5f5f4",
                  fontSize: 30,
                  fontWeight: 900,
                }}
              >
                {winner.badgeLabel}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 52,
            background: "#f8fafc",
            color: "#0f172a",
            borderRadius: 38,
            padding: 36,
          }}
        >
          <div style={{ display: "flex", fontSize: 32, fontWeight: 900 }}>
            Ergebnis
          </div>

          {leaderboard.slice(0, 3).map((entry, index) => (
            <div
              key={entry.playerId}
              style={{
                display: "flex",
                marginTop: 26,
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              <div style={{ display: "flex" }}>
                {index + 1}. {entry.name}
              </div>
              <div style={{ display: "flex", color: "#b45309" }}>
                {entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flex: 1 }} />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 38,
            background: "#facc15",
            color: "#111827",
            padding: 36,
            fontSize: 38,
            fontWeight: 900,
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex" }}>Markiere dein Team + @getstrikr</div>
          <div style={{ display: "flex", marginTop: 10 }}>#strikr</div>
        </div>
      </div>
    ),
    { width: 1080, height: 1920 }
  );
}