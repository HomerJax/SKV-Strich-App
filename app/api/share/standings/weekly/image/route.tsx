import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { isStorySharePilotClub } from "@/components/share/result-share/StoryShareCard";
import type { WeeklyReport, WeeklyRankRow } from "@/lib/standings/weekly-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  rows?: Array<WeeklyRankRow & { deltaRank?: number | null }>;
  weeklyReport?: WeeklyReport;
  selected?: string;
  seasons?: Array<{ id: number; name: string }>;
  error?: string;
};

function name(row: WeeklyRankRow) {
  return [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(" ")
    || row.nickname?.trim() || row.name?.trim() || "Spieler";
}

function movement(delta: number | null | undefined) {
  return delta == null ? "–" : delta > 0 ? `↑ +${delta}` : delta < 0 ? `↓ ${Math.abs(delta)}` : "→";
}

function MovementCard({ title, person, tone }: {
  title: string;
  person: WeeklyReport["biggestRiser"];
  tone: "rise" | "fall";
}) {
  const good = tone === "rise";
  return (
    <div style={{
      display: "flex", flexDirection: "column", flex: 1, height: 205,
      background: good ? "rgba(13,148,136,.18)" : "rgba(244,63,94,.14)",
      border: good ? "2px solid rgba(94,234,212,.45)" : "2px solid rgba(253,164,175,.4)",
      borderRadius: 28, padding: "22px 24px",
    }}>
      <div style={{ display: "flex", fontSize: 21, fontWeight: 800, color: good ? "#5eead4" : "#fda4af" }}>{title}</div>
      <div style={{ display: "flex", marginTop: 16, fontSize: 32, fontWeight: 900, color: "#ffffff" }}>
        {person?.name ?? "Keine Veränderung"}
      </div>
      <div style={{ display: "flex", marginTop: 7, fontSize: 28, fontWeight: 900, color: good ? "#5eead4" : "#fda4af" }}>
        {person ? `${good ? "+" : "−"}${Math.abs(person.places)} Plätze` : "–"}
      </div>
      {person ? <div style={{ display: "flex", fontSize: 18, color: "#cbd5e1", marginTop: 5 }}>
        Platz {person.fromRank} → {person.toRank}
      </div> : null}
    </div>
  );
}

export async function GET(request: NextRequest) {
  try {
    const { clubId } = await requireClub();
    if (!isStorySharePilotClub(clubId)) {
      return new Response("Wochen-Story nur für das Pilotteam verfügbar.", { status: 403 });
    }
    const url = new URL("/api/standings", request.url);
    const selected = request.nextUrl.searchParams.get("season");
    if (selected) url.searchParams.set("season", selected);
    const response = await fetch(url, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    const payload = (await response.json()) as Payload;
    if (!response.ok || !payload.weeklyReport) {
      throw new Error(payload.error || "Wochenreport ist nicht verfügbar.");
    }
    const report = payload.weeklyReport;
    const rows = (payload.rows ?? []).slice(0, 5);
    if (!rows.length) throw new Error("Noch keine Tabelle vorhanden.");
    const season = payload.seasons?.find((entry) => String(entry.id) === payload.selected)?.name
      ?? (payload.selected === "all" ? "Karriere" : "Aktuelle Saison");
    const referenceDate = report.cutoffDate.split("-").reverse().join(".");
    const topCaption = report.topGapWins === null
      ? "Die Tabelle nimmt Gestalt an."
      : report.topGapWins === 0
        ? "Die Spitze ist nach Siegen gleichauf!"
        : report.topGapWins <= 2
          ? `Nur ${report.topGapWins} ${report.topGapWins === 1 ? "Sieg" : "Siege"} trennen die ersten beiden Plätze!`
          : `${report.topGapWins} Siege Vorsprung an der Spitze.`;
    const extra = report.headlines.find((line) => line.startsWith("Saisonfinale:"))
      ?? (report.leaderChanged ? report.headlines.find((line) => line.startsWith("Führungswechsel:")) : null);
    const noWeekData = !report.hasBaseline || report.completedTrainings === 0;

    const card = (
      <div style={{
        display: "flex", flexDirection: "column", width: 1080, height: 1920,
        padding: "165px 62px 150px", boxSizing: "border-box",
        background: "radial-gradient(circle at 90% 8%,#164e63 0%,transparent 34%),linear-gradient(145deg,#020617 8%,#101c36 62%,#082f35 100%)",
        color: "#ffffff", fontFamily: "sans-serif",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 55, fontWeight: 900, letterSpacing: -3 }}>strikr<span style={{ color: "#5eead4" }}>.</span></div>
          <div style={{ display: "flex", padding: "15px 22px", border: "2px solid rgba(94,234,212,.55)", borderRadius: 40, fontSize: 21, fontWeight: 800, letterSpacing: 3, color: "#5eead4" }}>WOCHENREPORT</div>
        </div>
        <div style={{ display: "flex", fontSize: 22, marginTop: 45, color: "#94a3b8", fontWeight: 700 }}>{season} · 7-Tage-Vergleich ab {referenceDate}</div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 86, fontWeight: 950, lineHeight: 1.02, letterSpacing: -4, marginTop: 20 }}>
          <div>Was ging</div>
          <div style={{ color: "#5eead4" }}>diese Woche?</div>
        </div>
        <div style={{ display: "flex", marginTop: 50, gap: 18 }}>
          <MovementCard title="↑ GRÖSSTER AUFSTEIGER" person={noWeekData ? null : report.biggestRiser} tone="rise" />
          <MovementCard title="↓ GRÖSSTER ABSTEIGER" person={noWeekData ? null : report.biggestFaller} tone="fall" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: 27, borderRadius: 28, padding: "29px 32px", border: "1px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.07)" }}>
          <div style={{ display: "flex", fontSize: 19, fontWeight: 800, letterSpacing: 2, color: "#5eead4" }}>🏆  RENNEN AN DER SPITZE</div>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 900, lineHeight: 1.2, marginTop: 16 }}>
            {noWeekData ? (report.hasBaseline ? "Noch kein abgeschlossenes Training diese Woche." : "Noch keine Vergleichswoche verfügbar.") : topCaption}
          </div>
          {extra ? <div style={{ display: "flex", marginTop: 15, fontSize: 23, fontWeight: 700, color: "#e2e8f0" }}>{extra}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 40, marginBottom: 13 }}>
          <div style={{ display: "flex", fontSize: 31, fontWeight: 900 }}>AKTUELLE TOP 5</div>
          <div style={{ display: "flex", fontSize: 20, color: "#94a3b8" }}>Siege · Δ Platz</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row) => (
            <div key={row.player_id} style={{
              display: "flex", width: "100%", alignItems: "center", height: 84, boxSizing: "border-box",
              borderRadius: 17, padding: "0 20px",
              background: row.rank === 1 ? "rgba(94,234,212,.14)" : "rgba(255,255,255,.055)",
              border: row.rank === 1 ? "1px solid rgba(94,234,212,.42)" : "1px solid rgba(255,255,255,.08)",
            }}>
              <div style={{ display: "flex", width: 62, fontSize: 29, fontWeight: 900, color: row.rank === 1 ? "#5eead4" : "#cbd5e1" }}>{row.rank}.</div>
              <div style={{ display: "flex", flex: 1, fontSize: 29, fontWeight: 800 }}>{name(row)}</div>
              <div style={{ display: "flex", width: 76, justifyContent: "flex-end", fontSize: 29, fontWeight: 900 }}>{row.wins}</div>
              <div style={{ display: "flex", width: 120, justifyContent: "flex-end", fontSize: 22, fontWeight: 800,
                color: row.deltaRank == null ? "#94a3b8" : row.deltaRank > 0 ? "#5eead4" : row.deltaRank < 0 ? "#fda4af" : "#94a3b8" }}>
                {movement(row.deltaRank)}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", gap: 9, alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 24, fontWeight: 900, color: "#5eead4" }}>WENIGER ORGA. MEHR FUSSBALL.</div>
          <div style={{ display: "flex", fontSize: 24, color: "#cbd5e1" }}>strikr.team · @getstrikr</div>
          <div style={{ display: "flex", fontSize: 14, color: "#94a3b8", marginTop: 7 }}>Tabellenvergleich nach Trainingsdatum · Datenstand heute</div>
        </div>
      </div>
    );
    return new ImageResponse(card, {
      width: 1080,
      height: 1920,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Wochen-Story fehlgeschlagen.", {
      status: 500, headers: { "Cache-Control": "no-store" },
    });
  }
}
