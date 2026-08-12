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

function movementColor(row: RankRow) {
  const delta = row.deltaRank ?? 0;
  if (delta > 0) return "#34d399";
  if (delta < 0) return "#fda4af";
  return "rgba(255,255,255,0.38)";
}

function seasonLabel(payload: StandingsPayload) {
  if (payload.selected === "all") return "Ewige Tabelle";
  const id = Number(payload.selected);
  return payload.seasons?.find((season) => season.id === id)?.name ?? "Aktuelle Saison";
}

function renderSeasonBadge(label: string) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        minWidth: 210,
        height: 112,
        padding: "16px 20px",
        borderRadius: 22,
        background: "rgba(2,6,12,0.48)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ display: "flex", fontSize: 17, fontWeight: 900, letterSpacing: 1.8, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>
        Tabelle
      </div>
      <div style={{ display: "flex", marginTop: 8, fontSize: 28, fontWeight: 950, lineHeight: 1, letterSpacing: -1, color: "#fff" }}>
        {label}
      </div>
    </div>
  );
}

function renderStrikrBadge() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        width: 212,
        height: 112,
        padding: "14px 14px 12px",
        borderRadius: 22,
        background: "rgba(2,6,12,0.48)",
        border: "1px solid rgba(255,255,255,0.10)",
      }}
    >
      <div style={{ display: "flex", fontSize: 30, fontWeight: 950, lineHeight: 1, letterSpacing: -1.2, color: "#fff" }}>
        strikr
      </div>
      <div style={{ display: "flex", fontSize: 8, fontWeight: 800, lineHeight: 1, letterSpacing: 1.05, textTransform: "uppercase", color: "rgba(255,255,255,0.70)" }}>
        TEAM TRAINING. REDEFINED.
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2, paddingTop: 7, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ display: "flex", fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.78)" }}>@getstrikr</div>
        <div style={{ display: "flex", width: 1, height: 11, background: "rgba(255,255,255,0.16)" }} />
        <div style={{ display: "flex", fontSize: 11, fontWeight: 800, color: "#34d399" }}>strikr.team</div>
      </div>
    </div>
  );
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
            width: "100%",
            height: "100%",
            position: "relative",
            overflow: "hidden",
            borderRadius: 42,
            background: "#020617",
            border: "1px solid rgba(255,255,255,0.10)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.58), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 330,
              background: "radial-gradient(circle at 82% 4%, rgba(249,115,22,0.38), transparent 26%), radial-gradient(circle at 58% -4%, rgba(139,92,246,0.34), transparent 36%), linear-gradient(135deg,#111827 0%,#0b1120 55%,#020617 100%)",
              boxShadow: "0 42px 96px rgba(249,115,22,0.12)",
              zIndex: 1,
            }}
          />

          <div style={{ display: "flex", position: "absolute", top: 34, left: 34, right: 34, justifyContent: "space-between", alignItems: "flex-start", gap: 24, zIndex: 10 }}>
            {renderSeasonBadge(label)}
            {renderStrikrBadge()}
          </div>

          <div style={{ display: "flex", position: "absolute", left: 54, right: 54, top: 148, height: 170, alignItems: "flex-end", justifyContent: "space-between", zIndex: 8, overflow: "hidden" }}>
            <div style={{ display: "flex", fontSize: 116, fontWeight: 950, lineHeight: 0.9, letterSpacing: -5, textShadow: "0 18px 46px rgba(0,0,0,0.32)", color: "#fff", textTransform: "uppercase", whiteSpace: "nowrap" }}>
              TOP 10.
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingBottom: 8 }}>
              <div style={{ display: "flex", fontSize: 14, fontWeight: 900, letterSpacing: 2, color: "rgba(255,255,255,0.38)", textTransform: "uppercase" }}>Stand</div>
              <div style={{ display: "flex", marginTop: 5, fontSize: 20, fontWeight: 900, color: "rgba(255,255,255,0.76)" }}>{today}</div>
            </div>
          </div>

          <div style={{ display: "flex", position: "absolute", left: 0, right: 0, top: 330, bottom: 100, flexDirection: "column", padding: "30px 38px 28px", background: "radial-gradient(circle at 50% 18%, rgba(30,41,59,0.86), #0f172a 72%)", zIndex: 2 }}>
            <div
              style={{
                display: "flex",
                height: 226,
                padding: "28px 30px",
                borderRadius: 30,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "radial-gradient(circle at 84% 18%, rgba(249,115,22,0.20), transparent 28%), linear-gradient(135deg,rgba(255,255,255,0.10),rgba(139,92,246,0.10) 58%,rgba(255,255,255,0.045))",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", fontSize: 18, fontWeight: 900, letterSpacing: 2.2, color: "rgba(255,255,255,0.42)", textTransform: "uppercase" }}>Platz 1</div>
                <div style={{ display: "flex", marginTop: 12, fontSize: 52, lineHeight: 0.96, fontWeight: 950, letterSpacing: -2.2 }}>{displayName(leader)}</div>
                <div style={{ display: "flex", marginTop: 20, fontSize: 20, fontWeight: 800, color: "rgba(255,255,255,0.58)" }}>
                  {leader.sessions} Teilnahmen · {winRate(leader)} Siegquote
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginLeft: 28 }}>
                <div style={{ display: "flex", fontSize: 112, lineHeight: 0.82, fontWeight: 950, letterSpacing: -5, color: "#fb923c", textShadow: "0 0 34px rgba(249,115,22,0.24)" }}>{leader.wins}</div>
                <div style={{ display: "flex", marginTop: 10, fontSize: 18, fontWeight: 900, letterSpacing: 2, color: "rgba(255,255,255,0.44)", textTransform: "uppercase" }}>Siege</div>
                <div style={{ display: "flex", marginTop: 9, fontSize: 16, fontWeight: 900, color: movementColor(leader) }}>{movement(leader)}</div>
              </div>
            </div>

            <div style={{ display: "flex", marginTop: 18, marginBottom: 10, padding: "0 18px", fontSize: 13, fontWeight: 900, letterSpacing: 1.6, color: "rgba(255,255,255,0.30)", textTransform: "uppercase" }}>
              Plätze 2–10
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {rest.map((row) => (
                <div
                  key={row.player_id}
                  style={{
                    display: "flex",
                    height: 70,
                    padding: "0 20px",
                    alignItems: "center",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.045)",
                  }}
                >
                  <div style={{ display: "flex", width: 54, fontSize: 25, fontWeight: 950, color: "rgba(255,255,255,0.66)" }}>{row.rank}</div>
                  <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: 25, fontWeight: 900, letterSpacing: -0.4 }}>{displayName(row)}</div>
                    <div style={{ display: "flex", marginTop: 3, fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.40)" }}>{row.wins} Siege · {row.sessions} Teiln. · {winRate(row)}</div>
                  </div>
                  <div style={{ display: "flex", fontSize: 17, fontWeight: 900, color: movementColor(row) }}>{movement(row)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 100, background: "linear-gradient(180deg, rgba(2,6,23,0.90) 0%, rgba(2,6,23,0.98) 32%, #020617 100%)", zIndex: 5 }} />

          <div style={{ display: "flex", position: "absolute", left: 42, right: 42, bottom: 28, justifyContent: "space-between", alignItems: "flex-end", gap: 28, zIndex: 20 }}>
            <div style={{ display: "flex", maxWidth: 560, fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.34)" }}>
              Die komplette Tabelle findest du direkt in strikr.
            </div>
            <div style={{ display: "flex", fontSize: 16, fontWeight: 900, color: "rgba(255,255,255,0.58)" }}>
              @getstrikr · strikr.team
            </div>
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
