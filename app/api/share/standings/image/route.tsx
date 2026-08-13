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
  if (delta > 0) return "#4ade80";
  if (delta < 0) return "#fb7185";
  return "rgba(255,255,255,0.55)";
}

function seasonLabel(payload: StandingsPayload) {
  if (payload.selected === "all") return "Ewige Tabelle";
  const id = Number(payload.selected);
  return payload.seasons?.find((season) => season.id === id)?.name ?? "Aktuelle Saison";
}

function podiumAccent(index: number) {
  if (index === 0) return "#f472b6";
  if (index === 1) return "#a78bfa";
  return "#e879f9";
}

function podiumBackground(index: number) {
  if (index === 0) {
    return "linear-gradient(100deg, rgba(236,72,153,0.82) 0%, rgba(190,24,93,0.74) 48%, rgba(120,35,93,0.56) 100%)";
  }
  if (index === 1) {
    return "linear-gradient(100deg, rgba(79,70,229,0.52) 0%, rgba(67,56,202,0.34) 50%, rgba(30,64,175,0.28) 100%)";
  }
  return "linear-gradient(100deg, rgba(168,85,247,0.46) 0%, rgba(126,34,206,0.30) 50%, rgba(49,46,129,0.28) 100%)";
}

function renderStrikrBadge() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 238,
        height: 132,
        padding: "18px 22px",
        borderRadius: 26,
        background: "rgba(15,23,42,0.72)",
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "0 20px 50px rgba(15,23,42,0.20)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "flex",
            width: 50,
            height: 50,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 14,
            background: "#020617",
            color: "#fff",
            fontSize: 28,
            fontWeight: 950,
          }}
        >
          /////
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 29, fontWeight: 950, lineHeight: 1, letterSpacing: -1.2, color: "#fff" }}>strikr</div>
          <div style={{ display: "flex", marginTop: 5, fontSize: 8, fontWeight: 800, letterSpacing: 1.05, color: "rgba(255,255,255,0.62)", textTransform: "uppercase" }}>
            TEAM TRAINING. REDEFINED.
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 11, marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.10)" }}>
        <div style={{ display: "flex", fontSize: 10, fontWeight: 800, color: "#f9a8d4" }}>@getstrikr</div>
        <div style={{ display: "flex", width: 1, height: 12, background: "rgba(255,255,255,0.18)" }} />
        <div style={{ display: "flex", fontSize: 11, fontWeight: 900, color: "#f9a8d4" }}>strikr.team</div>
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

    const podium = rows.slice(0, 3);
    const rest = rows.slice(3);
    const label = seasonLabel(payload);
    const today = new Date().toLocaleDateString("de-DE");

    return new ImageResponse(
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          padding: 18,
          background: "linear-gradient(145deg,#172554 0%,#312e81 44%,#831843 100%)",
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
            background: "linear-gradient(180deg,#1e3a8a 0%,#172554 32%,#0f2554 70%,#0b1b3f 100%)",
            border: "2px solid rgba(249,168,212,0.86)",
            boxShadow: "0 34px 90px rgba(15,23,42,0.38), inset 0 1px 0 rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              position: "absolute",
              inset: 0,
              background: "radial-gradient(circle at 86% 0%, rgba(244,114,182,0.78), transparent 28%), radial-gradient(circle at 46% 0%, rgba(129,140,248,0.52), transparent 34%), radial-gradient(circle at 12% 18%, rgba(59,130,246,0.34), transparent 32%)",
            }}
          />

          <div style={{ display: "flex", position: "absolute", top: 36, left: 44, right: 44, justifyContent: "space-between", alignItems: "flex-start", zIndex: 5 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                <div
                  style={{
                    display: "flex",
                    height: 48,
                    padding: "0 20px",
                    alignItems: "center",
                    borderRadius: 24,
                    border: "2px solid #f472b6",
                    fontSize: 18,
                    fontWeight: 950,
                    letterSpacing: 2.2,
                    color: "#f9a8d4",
                    textTransform: "uppercase",
                  }}
                >
                  Tabelle
                </div>
                <div style={{ display: "flex", fontSize: 29, fontWeight: 950, color: "#f9a8d4" }}>{label}</div>
              </div>
              <div style={{ display: "flex", marginTop: 24, fontSize: 112, fontWeight: 950, lineHeight: 0.88, letterSpacing: -5.5, color: "#fff", textShadow: "0 16px 42px rgba(15,23,42,0.18)" }}>
                TOP 10<span style={{ color: "#f472b6" }}>.</span>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 15 }}>
              {renderStrikrBadge()}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", paddingRight: 4 }}>
                <div style={{ display: "flex", fontSize: 14, fontWeight: 900, letterSpacing: 2.1, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>Stand</div>
                <div style={{ display: "flex", marginTop: 4, fontSize: 22, fontWeight: 900, color: "#fff" }}>{today}</div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", position: "absolute", left: 28, right: 28, top: 310, bottom: 74, flexDirection: "column", zIndex: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {podium.map((row, index) => {
                const heights = [174, 132, 122];
                const nameSizes = [45, 37, 34];
                const winSizes = [66, 52, 48];
                const rankSizes = [45, 38, 35];
                const accent = podiumAccent(index);

                return (
                  <div
                    key={row.player_id}
                    style={{
                      display: "flex",
                      height: heights[index],
                      padding: index === 0 ? "22px 28px" : "18px 24px",
                      alignItems: "center",
                      borderRadius: 28,
                      background: podiumBackground(index),
                      border: `1px solid ${index === 0 ? "rgba(251,207,232,0.64)" : "rgba(255,255,255,0.12)"}`,
                      boxShadow: index === 0 ? "0 18px 48px rgba(190,24,93,0.20)" : "0 12px 28px rgba(15,23,42,0.12)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: index === 0 ? 92 : 76,
                        height: index === 0 ? 92 : 76,
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        borderRadius: 22,
                        background: "rgba(255,255,255,0.10)",
                        border: `1px solid ${accent}`,
                        color: "#fff",
                        fontSize: rankSizes[index],
                        fontWeight: 950,
                      }}
                    >
                      {row.rank}
                    </div>

                    <div style={{ display: "flex", flex: 1, minWidth: 0, flexDirection: "column", marginLeft: 28 }}>
                      <div style={{ display: "flex", fontSize: nameSizes[index], fontWeight: 950, letterSpacing: -1.5, lineHeight: 1, color: "#fff" }}>
                        {displayName(row)}
                      </div>
                      <div style={{ display: "flex", marginTop: index === 0 ? 18 : 12, alignItems: "center", gap: index === 0 ? 16 : 12, color: "rgba(255,255,255,0.86)" }}>
                        <div style={{ display: "flex", fontSize: index === 0 ? 22 : 18, fontWeight: 950, color: accent }}>{row.wins}</div>
                        <div style={{ display: "flex", fontSize: index === 0 ? 17 : 15, fontWeight: 800 }}>Siege</div>
                        <div style={{ display: "flex", width: 1, height: 22, background: "rgba(255,255,255,0.22)" }} />
                        <div style={{ display: "flex", fontSize: index === 0 ? 22 : 18, fontWeight: 950 }}>{row.sessions}</div>
                        <div style={{ display: "flex", fontSize: index === 0 ? 17 : 15, fontWeight: 800 }}>Teilnahmen</div>
                        <div style={{ display: "flex", width: 1, height: 22, background: "rgba(255,255,255,0.22)" }} />
                        <div style={{ display: "flex", fontSize: index === 0 ? 22 : 18, fontWeight: 950, color: accent }}>{winRate(row)}</div>
                        <div style={{ display: "flex", fontSize: index === 0 ? 17 : 15, fontWeight: 800 }}>Siegquote</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", minWidth: index === 0 ? 170 : 145, flexDirection: "column", alignItems: "flex-end", marginLeft: 20 }}>
                      <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                          <div style={{ display: "flex", fontSize: winSizes[index], fontWeight: 950, lineHeight: 0.9, letterSpacing: -2.5, color: accent }}>{row.wins}</div>
                          <div style={{ display: "flex", marginTop: 8, fontSize: 13, fontWeight: 900, letterSpacing: 1.8, color: "rgba(255,255,255,0.72)", textTransform: "uppercase" }}>Siege</div>
                        </div>
                        <div style={{ display: "flex", paddingBottom: 14, fontSize: 17, fontWeight: 950, color: movementColor(row) }}>{movement(row)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 16 }}>
              {rest.map((row) => (
                <div
                  key={row.player_id}
                  style={{
                    display: "flex",
                    height: 66,
                    padding: "0 20px",
                    alignItems: "center",
                    borderRadius: 18,
                    background: "rgba(15,39,84,0.78)",
                    border: "1px solid rgba(255,255,255,0.09)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: 52,
                      height: 44,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 13,
                      background: "rgba(96,165,250,0.18)",
                      color: "#fff",
                      fontSize: 22,
                      fontWeight: 950,
                    }}
                  >
                    {row.rank}
                  </div>
                  <div style={{ display: "flex", flex: 1, minWidth: 0, marginLeft: 20, fontSize: 23, fontWeight: 900, color: "#fff" }}>{displayName(row)}</div>
                  <div style={{ display: "flex", width: 118, alignItems: "baseline", gap: 7 }}>
                    <div style={{ display: "flex", fontSize: 25, fontWeight: 950, color: "#c4b5fd" }}>{row.wins}</div>
                    <div style={{ display: "flex", fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.66)" }}>Siege</div>
                  </div>
                  <div style={{ display: "flex", width: 148, alignItems: "baseline", gap: 7 }}>
                    <div style={{ display: "flex", fontSize: 19, fontWeight: 900, color: "rgba(255,255,255,0.86)" }}>{row.sessions}</div>
                    <div style={{ display: "flex", fontSize: 13, fontWeight: 800, color: "rgba(255,255,255,0.58)" }}>Teiln.</div>
                  </div>
                  <div style={{ display: "flex", width: 88, fontSize: 22, fontWeight: 950, color: "#c4b5fd" }}>{winRate(row)}</div>
                  <div style={{ display: "flex", width: 66, justifyContent: "flex-end", fontSize: 16, fontWeight: 950, color: movementColor(row) }}>{movement(row)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 64, alignItems: "center", justifyContent: "center", gap: 16, background: "rgba(7,20,49,0.72)", zIndex: 6 }}>
            <div style={{ display: "flex", fontSize: 15, fontWeight: 800, color: "rgba(255,255,255,0.70)" }}>@getstrikr</div>
            <div style={{ display: "flex", color: "#f472b6", fontSize: 15 }}>·</div>
            <div style={{ display: "flex", fontSize: 15, fontWeight: 900, color: "#f9a8d4" }}>strikr.team</div>
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
