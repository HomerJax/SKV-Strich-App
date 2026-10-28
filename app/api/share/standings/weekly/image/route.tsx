import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { requireClub } from "@/lib/auth/guards";
import { isStorySharePilotClub } from "@/components/share/result-share/StoryShareCard";
import type { WeeklyReport, WeeklyMover } from "@/lib/standings/weekly-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The exact, existing 1080×1350 table card is embedded pixel-for-pixel,
// not reimplemented or restyled. Weekly highlights live in the free
// 285px above and below it on the 1080×1920 Story canvas.
type Payload = {
  weeklyReport?: WeeklyReport;
  selected?: string;
  error?: string;
};

async function trustedAvatarData(photoUrl?: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  try {
    const url = new URL(photoUrl);
    // Never let arbitrary URLs in a player record trigger server-side fetching.
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")
      || !url.pathname.includes("/storage/v1/object/public/player-photos/")) return null;
    const response = await fetch(url.toString(), {
      cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !["image/png", "image/jpeg", "image/webp"].includes(contentType)) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 1_500_000) return null;
    return "data:" + contentType + ";base64," + bytes.toString("base64");
  } catch {
    return null;
  }
}

function Avatar({ name, photo, accent }: {
  name: string; photo: string | null; accent: string;
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((segment) => segment.slice(0, 1)).join("").toUpperCase();
  return (
    <div style={{
      display: "flex", width: 70, height: 70, flexShrink: 0,
      borderRadius: 35, overflow: "hidden",
      alignItems: "center", justifyContent: "center",
      border: "3px solid " + accent, background: "#1e2d56",
      color: "#fff", fontSize: 26, fontWeight: 900,
    }}>
      {photo
        ? <img src={photo} alt="" width={70} height={70}
            style={{ width: 70, height: 70, objectFit: "cover" }} />
        : initials || "?"}
    </div>
  );
}

function Highlight({ label, value, detail, photo, accent, name }: {
  label: string; value: string; detail: string;
  photo?: string | null; accent: string; name?: string;
}) {
  return (
    <div style={{
      display: "flex", flexDirection: "row", alignItems: "center",
      flex: 1, height: 130, minWidth: 0,
      padding: "13px 16px", gap: 16, overflow: "hidden",
      border: "2px solid " + accent, borderRadius: 22,
      background: "#172554",
    }}>
      {name ? <Avatar name={name} photo={photo ?? null} accent={accent} /> : null}
      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, gap: 4 }}>
        <div style={{ display: "flex", color: accent, fontSize: 16, fontWeight: 900 }}>
          {label}
        </div>
        <div style={{ display: "flex", color: "#fff", fontSize: 25, fontWeight: 900 }}>
          {value.length > 28 ? value.slice(0, 27) + "…" : value}
        </div>
        <div style={{ display: "flex", color: "#cbd5e1", fontSize: 19, fontWeight: 700 }}>
          {detail.length > 37 ? detail.slice(0, 36) + "…" : detail}
        </div>
      </div>
    </div>
  );
}

function movementValue(person: WeeklyMover | null, positive: boolean) {
  if (!person) return { value: "Kein Wechsel", detail: "Keine Rangveränderung" };
  const sign = positive ? "+" : "−";
  return {
    value: person.name,
    detail: sign + Math.abs(person.places) + " Plätze · " + person.fromRank + " → " + person.toRank,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { clubId } = await requireClub();
    if (!isStorySharePilotClub(clubId)) {
      return new Response("Wochenreport nur für den Pilotverein verfügbar.", { status: 403 });
    }
    const season = request.nextUrl.searchParams.get("season");
    const lang = request.nextUrl.searchParams.get("lang") ?? "de";
    const headers = { cookie: request.headers.get("cookie") ?? "" };

    // The report and the original table are generated from the same live data.
    const dataUrl = new URL("/api/standings", request.url);
    if (season) dataUrl.searchParams.set("season", season);

    const tableUrl = new URL("/api/share/standings/image", request.url);
    if (season) tableUrl.searchParams.set("season", season);
    tableUrl.searchParams.set("lang", lang);
    // Important: no format=story here — we need the original 1080×1350 image.
    const [dataResponse, tableResponse] = await Promise.all([
      fetch(dataUrl, { headers, cache: "no-store" }),
      fetch(tableUrl, { headers, cache: "no-store" }),
    ]);
    const payload = (await dataResponse.json()) as Payload;
    if (!dataResponse.ok || !payload.weeklyReport) {
      throw new Error(payload.error || "Wochenrückblick konnte nicht geladen werden.");
    }
    if (!tableResponse.ok || !tableResponse.headers.get("content-type")?.includes("image/png")) {
      throw new Error("Die Original-Tabellenkarte konnte nicht geladen werden.");
    }
    const tableBytes = Buffer.from(await tableResponse.arrayBuffer());
    if (!tableBytes.length || tableBytes.length > 12_000_000) {
      throw new Error("Ungültige Größe der Tabellenkarte.");
    }
    const originalTable = "data:image/png;base64," + tableBytes.toString("base64");

    const report = payload.weeklyReport;
    const canCompare = report.hasBaseline && report.completedTrainings > 0;
    const riser = canCompare ? report.biggestRiser : null;
    const faller = canCompare ? report.biggestFaller : null;
    const [riserPhoto, fallerPhoto, extraPhoto] = await Promise.all([
      trustedAvatarData(riser?.photoUrl),
      trustedAvatarData(faller?.photoUrl),
      trustedAvatarData(report.extraHighlight?.photoUrl),
    ]);
    const up = movementValue(riser, true);
    const down = movementValue(faller, false);
    const gap = report.topGapWins;
    const race = !canCompare
      ? "Kein Wochenvergleich"
      : gap == null ? "Noch kein Duell" : gap === 0
        ? "Gleichauf nach Siegen!" : gap === 1
          ? "Nur 1 Sieg Abstand" : gap === 2
            ? "Nur 2 Siege Abstand" : gap + " Siege Vorsprung";
    const topDetail = canCompare
      ? report.topNames.slice(0, 2).join(" & ") || "Aktuelle Tabelle"
      : "Noch keine abgeschlossene Vergleichswoche";
    const extra = report.extraHighlight;
    const dateLabel = report.cutoffDate.split("-").reverse().join(".");

    const story = (
      <div style={{
        display: "flex", flexDirection: "column", width: 1080, height: 1920,
        background: "linear-gradient(145deg,#172554,#312e81 44%,#831843)",
        color: "#fff", fontFamily: "sans-serif", overflow: "hidden",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", height: 285, flexShrink: 0,
          padding: "51px 30px 14px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", fontSize: 31, fontWeight: 950, color: "#f9a8d4" }}>
              WOCHENRÜCKBLICK
            </div>
            <div style={{ display: "flex", fontSize: 17, color: "#e2e8f0", fontWeight: 800 }}>
              Seit {dateLabel}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <Highlight label="↑ GRÖSSTER AUFSTIEG" value={up.value}
              detail={up.detail} name={riser?.name} photo={riserPhoto} accent="#4ade80" />
            <Highlight label="↓ GRÖSSTER ABSTIEG" value={down.value}
              detail={down.detail} name={faller?.name} photo={fallerPhoto} accent="#fda4af" />
          </div>
        </div>

        <div style={{ display: "flex", width: 1080, height: 1350, flexShrink: 0 }}>
          <img src={originalTable} alt="Unveränderte originale strikr Tabellen-Card"
            width={1080} height={1350} style={{ width: 1080, height: 1350, objectFit: "contain" }} />
        </div>

        <div style={{
          display: "flex", flexDirection: "column", height: 285, flexShrink: 0,
          padding: "14px 30px 55px",
        }}>
          <div style={{ display: "flex", gap: 12, width: "100%" }}>
            <Highlight label="🏆 RENNEN AN DER SPITZE" value={race}
              detail={topDetail} accent="#c4b5fd" />
            <Highlight label={extra ? "★ " + extra.title.toUpperCase() : "★ WOCHENREPORT"}
              value={extra?.text ?? "Keine weiteren Ereignisse"}
              detail={extra?.kind === "training" ? "Erfasste Ergebnisse" : "Aus der aktuellen Saison"}
              name={extra?.photoUrl ? extra.text : undefined}
              photo={extraPhoto} accent="#f9a8d4" />
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 13,
            padding: "0 4px", fontSize: 16, color: "#e2e8f0", fontWeight: 700 }}>
            <div style={{ display: "flex" }}>Vergleich nach Trainingsdatum</div>
            <div style={{ display: "flex" }}>made with strikr · @getstrikr</div>
          </div>
        </div>
      </div>
    );
    return new ImageResponse(story, {
      width: 1080, height: 1920,
      headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Wochenreport fehlgeschlagen.", {
      status: 500, headers: { "Cache-Control": "no-store" },
    });
  }
}
