import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RankRow = {
  player_id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  nickname?: string | null;
  wins: number;
  sessions: number;
  rank: number;
  deltaRank?: number | null;
};

type StandingsPayload = {
  selected?: string;
  seasons?: Array<{ id: number; name: string }>;
  rows?: RankRow[];
  error?: string;
};

function displayName(row: RankRow) {
  const nickname = row.nickname?.trim();
  if (nickname) return nickname;
  const first = row.first_name?.trim();
  const last = row.last_name?.trim();
  if (first && last) return `${first} ${last}`;
  if (first) return first;
  if (last) return last;
  return row.name?.trim() || "Unbekannt";
}

function winRate(row: RankRow) {
  if (row.sessions <= 0) return "–";
  return `${Math.round((row.wins / row.sessions) * 100)}%`;
}

function movement(row: RankRow) {
  const delta = row.deltaRank ?? 0;
  if (delta > 0) return `↑ ${delta}`;
  if (delta < 0) return `↓ ${Math.abs(delta)}`;
  return "→ 0";
}

function seasonLabel(payload: StandingsPayload) {
  if (payload.selected === "all") return "Ewige Tabelle";
  const id = Number(payload.selected);
  return payload.seasons?.find((season) => season.id === id)?.name ?? "Aktuelle Saison";
}

export async function GET(request: NextRequest) {
  try {
    const apiUrl = new URL("/api/standings", request.url);
    const requestedSeason = request.nextUrl.searchParams.get("season");
    if (requestedSeason) apiUrl.searchParams.set("season", requestedSeason);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as StandingsPayload;
    if (!response.ok) {
      throw new Error(payload.error || `Tabelle konnte nicht geladen werden (${response.status}).`);
    }

    const rows = (payload.rows ?? []).slice(0, 10);
    if (rows.length === 0) throw new Error("Keine Tabellendaten vorhanden.");

    const leader = rows[0];
    const rest = rows.slice(1);
    const label = seasonLabel(payload);
    const today = new Date().toLocaleDateString("de-DE");

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 20,
          background: "radial-gradient(circle at 50% -8%, rgba(255,255,255,0.12), transparent 30%), #020617",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            borderRadius: 42,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "#020617",
            boxShadow: "0 40px 120px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              height: 300,
              padding: "38px 42px",
              flexDirection: "column",
              justifyContent: "space-between",
              background: "radial-gradient(circle at 84% 12%, rgba(249,115,22,0.32), transparent 26%), radial-gradient(circle at 56% 0%, rgba(139,92,246,0.30), transparent 34%), linear-gradient(135deg,#111827,#020617)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 22, fontWeight: 900, color: "rgba(255,255,255,0.62)", letterSpacing: 2 }}>strikr</div>
                <div style={{ display: "flex", marginTop: 10, fontSize: 28, fontWeight: 800, color: "rgba(255,255,255,0.72)" }}>{label}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                <div style={{ display: "flex", fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.42)", textTransform: "uppercase", letterSpacing: 2 }}>Stand</div>
                <div style={{ display: "flex", marginTop: 6, fontSize: 22, fontWeight: 900 }}>{today}</div>
              </div>
            </div>
            <div style={{ display: "flex", fontSize: 112, lineHeight: 0.9, fontWeight: 950, letterSpacing: -5 }}>TOP 10.</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "28px 38px 24px", gap: 16 }}>
            <div
              style={{
                display: "flex",
                minHeight: 210,
                padding: "28px 30px",
                borderRadius: 28,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "linear-gradient(135deg, rgba(249,115,22,0.17), rgba(139,92,246,0.12) 54%, rgba(255,255,255,0.05))",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <div style={{ display: "flex", fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "rgba(255,255,255,0.45)", textTransform: "uppercase" }}>Platz 1</div>
                <div style={{ display: "flex", marginTop: 12, fontSize: 52, lineHeight: 1, fontWeight: 950, letterSpacing: -2 }}>{displayName(leader)}</div>
                <div style={{ display: "flex", marginTop: 18, fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.62)" }}>{leader.sessions} Teilnahmen · {winRate(leader)} Siegquote · {movement(leader)}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: 24 }}>
                <div style={{ display: "flex", fontSize: 96, lineHeight: 0.9, fontWeight: 950, letterSpacing: -4, color: "#fb923c" }}>{leader.wins}</div>
                <div style={{ display: "flex", marginTop: 8, fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "rgba(255,255,255,0.48)", textTransform: "uppercase" }}>Siege</div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {rest.map((row) => (
                <div
                  key={row.player_id}
                  style={{
                    display: "flex",
                    height: 72,
                    padding: "0 20px",
                    alignItems: "center",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ display: "flex", width: 54, fontSize: 25, fontWeight: 950, color: "rgba(255,255,255,0.68)" }}>{row.rank}</div>
                  <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 25, fontWeight: 900 }}>{displayName(row)}</div>
                    <div style={{ display: "flex", marginTop: 3, fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.42)" }}>{row.wins} Siege · {row.sessions} Teiln. · {winRate(row)}</div>
                  </div>
                  <div style={{ display: "flex", fontSize: 17, fontWeight: 900, color: "rgba(255,255,255,0.52)" }}>{movement(row)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", height: 86, padding: "0 42px", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.08)", background: "#020617" }}>
            <div style={{ display: "flex", fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.34)" }}>Die komplette Tabelle findest du direkt in strikr.</div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,0.62)" }}>@getstrikr · strikr.team</div>
          </div>
        </div>
      </div>,
      {
        width: 1080,
        height: 1350,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        },
      }
    );
  } catch (error) {
    return new Response(
      error instanceof Error ? error.message : "Top-10-Sharebild konnte nicht erzeugt werden.",
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
