import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireClub } from "@/lib/auth/guards";
import { isStorySharePilotClub } from "@/components/share/result-share/StoryShareCard";
import type { WeeklyReport, WeeklyMover } from "@/lib/standings/weekly-report";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Payload = {
  weeklyReport?: WeeklyReport;
  selected?: string;
  seasons?: Array<{ id: number; name: string }>;
  error?: string;
};

async function brandLogo() {
  try {
    const bytes = await fs.readFile(path.join(process.cwd(), "public/brand/strikr-mark.png"));
    return "data:image/png;base64," + bytes.toString("base64");
  } catch {
    return null;
  }
}

async function trustedAvatarData(photoUrl?: string | null): Promise<string | null> {
  if (!photoUrl) return null;
  try {
    const url = new URL(photoUrl);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".supabase.co")
      || !url.pathname.includes("/storage/v1/object/public/player-photos/")) return null;
    const response = await fetch(url.toString(), {
      cache: "no-store", signal: AbortSignal.timeout(3000),
    });
    const contentType = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !["image/png", "image/jpeg", "image/webp"].includes(contentType)) return null;
    const size = Number(response.headers.get("content-length") || "0");
    if (size > 1_500_000) return null;
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
    .map((part) => part.slice(0, 1)).join("").toUpperCase();
  return (
    <div style={{
      display: "flex", width: 106, height: 106, flexShrink: 0,
      borderRadius: 54, overflow: "hidden",
      alignItems: "center", justifyContent: "center",
      border: "3px solid " + accent, background: "#1e2d56",
      color: "#fff", fontSize: 38, fontWeight: 900,
    }}>
      {photo
        ? <img src={photo} alt="" width={106} height={106}
            style={{ width: 106, height: 106, objectFit: "cover" }} />
        : initials || "?"}
    </div>
  );
}

function MomentCard({ label, value, detail, photo, name, accent, background }: {
  label: string; value: string; detail: string; photo?: string | null;
  name?: string; accent: string; background: string;
}) {
  return (
    <div style={{
      display: "flex", width: "100%", height: 270,
      padding: "37px 35px", flexShrink: 0, boxSizing: "border-box",
      gap: 30, alignItems: "center",
      borderRadius: 28, border: "2px solid rgba(255,255,255,.16)",
      background,
    }}>
      {name ? <Avatar name={name} photo={photo ?? null} accent={accent} /> : null}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, flex: 1, gap: 12 }}>
        <div style={{ display: "flex", color: accent, fontSize: 22, fontWeight: 900, letterSpacing: 2 }}>
          {label}
        </div>
        <div style={{
          display: "flex", color: "#fff", fontSize: value.length > 49 ? 28 : 40,
          fontWeight: 950, lineHeight: 1.12,
        }}>
          {value.length > 100 ? value.slice(0, 97) + "…" : value}
        </div>
        <div style={{ display: "flex", color: "#e2e8f0", fontSize: 24, lineHeight: 1.2, fontWeight: 750 }}>
          {detail.length > 90 ? detail.slice(0, 87) + "…" : detail}
        </div>
      </div>
    </div>
  );
}

function moverText(person: WeeklyMover | null, isRiser: boolean) {
  return person
    ? {
        value: person.name,
        detail: (isRiser ? "+" : "−") + Math.abs(person.places) +
          " Plätze: von " + person.fromRank + " auf " + person.toRank,
      }
    : { value: "Kein Platzwechsel", detail: "Keine Veränderung erfasst" };
}

function topRaceText(report: WeeklyReport, canCompare: boolean) {
  if (!canCompare) return "Noch kein aktueller Wochenvergleich";
  const first = report.topNames[0];
  const second = report.topNames[1];
  if (!first || !second || report.topGapWins === null) return "Noch keine zwei Platzierungen";
  if (report.topGapWins === 0) {
    return first + " (Platz 1) und " + second + " (Platz 2) haben gleich viele Siege.";
  }
  return first + " (Platz 1) hat " + report.topGapWins +
    (report.topGapWins === 1 ? " Sieg" : " Siege") +
    " mehr als " + second + " (Platz 2).";
}

export async function GET(request: NextRequest) {
  try {
    const { clubId } = await requireClub();
    if (!isStorySharePilotClub(clubId)) {
      return new Response("Wochenreport nur für den Pilotverein verfügbar.", { status: 403 });
    }

    // One data request and ONE image rendering. The previous endpoint rendered
    // the entire Top-10 picture first and embedded it in a second picture.
    const url = new URL("/api/standings", request.url);
    const selected = request.nextUrl.searchParams.get("season");
    if (selected) url.searchParams.set("season", selected);
    const [response, logo] = await Promise.all([
      fetch(url, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
        cache: "no-store",
      }),
      brandLogo(),
    ]);
    const payload = (await response.json()) as Payload;
    if (!response.ok || !payload.weeklyReport) {
      throw new Error(payload.error || "Wochenreport konnte nicht geladen werden.");
    }

    const report = payload.weeklyReport;
    const canCompare = report.hasBaseline && report.completedTrainings > 0;
    const riser = canCompare ? report.biggestRiser : null;
    const faller = canCompare ? report.biggestFaller : null;
    const extra = report.extraHighlight;
    const [upPhoto, downPhoto, extraPhoto] = await Promise.all([
      trustedAvatarData(riser?.photoUrl),
      trustedAvatarData(faller?.photoUrl),
      trustedAvatarData(extra?.photoUrl),
    ]);
    const up = moverText(riser, true);
    const down = moverText(faller, false);
    const dateLabel = report.cutoffDate.split("-").reverse().join(".");
    const seasonName = payload.seasons?.find((season) => String(season.id) === payload.selected)?.name
      ?? (payload.selected === "all" ? "Karriere" : "Saison");

    // Same pink/violet/indigo design language, logo badge, podium-style panels
    // and footer as the existing table card, but the SUBJECT is weekly events.
    const story = (
      <div style={{
        display: "flex", width: 1080, height: 1920, padding: 18, boxSizing: "border-box",
        background: "linear-gradient(145deg,#172554,#312e81 44%,#831843)",
        color: "#fff", fontFamily: "sans-serif",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", width: "100%", height: "100%",
          borderRadius: 42, overflow: "hidden", position: "relative",
          background: "linear-gradient(180deg,#1e3a8a,#172554 32%,#0f2554 70%,#0b1b3f)",
          border: "2px solid rgba(249,168,212,.86)",
        }}>
          <div style={{
            display: "flex", position: "absolute", inset: 0,
            background: "radial-gradient(circle at 86% 0%,rgba(244,114,182,.70),transparent 30%),radial-gradient(circle at 46% 0%,rgba(129,140,248,.5),transparent 34%)",
          }} />
          <div style={{
            display: "flex", flexDirection: "column", flex: 1,
            padding: "80px 42px 100px", zIndex: 1,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
                <div style={{
                  display: "flex", border: "2px solid #f472b6", borderRadius: 24,
                  padding: "13px 22px", fontSize: 19, fontWeight: 900,
                  letterSpacing: 2, color: "#f9a8d4", alignSelf: "flex-start",
                }}>WOCHENREPORT</div>
                <div style={{ display: "flex", fontSize: 95, fontWeight: 950, lineHeight: 1 }}>
                  DIE WOCHE<span style={{ color: "#f472b6" }}>.</span>
                </div>
                <div style={{ display: "flex", fontSize: 27, color: "#cbd5e1" }}>
                  {seasonName + " · seit " + dateLabel}
                </div>
              </div>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 9,
                width: 190, padding: "17px 14px", borderRadius: 24,
                background: "rgba(255,255,255,.10)", border: "1px solid rgba(255,255,255,.18)",
              }}>
                {logo ? <img src={logo} alt="" width={65} height={65}
                  style={{ width: 65, height: 65, borderRadius: 14, objectFit: "cover" }} /> : null}
                <div style={{ display: "flex", fontSize: 31, fontWeight: 950 }}>strikr</div>
                <div style={{ display: "flex", fontSize: 13, letterSpacing: 1, fontWeight: 800, color: "#f9a8d4" }}>
                  strikr.team
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 45 }}>
              <MomentCard label="↑ GRÖSSTER AUFSTEIGER" value={up.value} detail={up.detail}
                name={riser?.name} photo={upPhoto} accent="#f9a8d4"
                background="linear-gradient(100deg,rgba(236,72,153,.74),rgba(120,35,93,.55))" />
              <MomentCard label="↓ GRÖSSTER ABSTEIGER" value={down.value} detail={down.detail}
                name={faller?.name} photo={downPhoto} accent="#c4b5fd"
                background="linear-gradient(100deg,rgba(79,70,229,.65),rgba(49,46,129,.55))" />
              <MomentCard label="🏆 RENNEN AN DER SPITZE"
                value={topRaceText(report, canCompare)}
                detail="So eng ist die Tabelle nach Siegen."
                accent="#f9a8d4"
                background="linear-gradient(100deg,rgba(168,85,247,.46),rgba(49,46,129,.48))" />
              {extra ? (
                <MomentCard label={"★ " + extra.title.toUpperCase()} value={extra.text}
                  detail={extra.kind === "wheel"
                    ? "Das Rad-Ergebnis ändert die ursprüngliche Strafe nicht automatisch."
                    : "Ein weiterer Höhepunkt aus der Saison."}
                  name={extra.playerName} photo={extraPhoto} accent="#f9a8d4"
                  background="linear-gradient(100deg,rgba(131,24,67,.50),rgba(67,56,202,.42))" />
              ) : null}
            </div>

            <div style={{
              display: "flex", marginTop: "auto", alignItems: "center",
              justifyContent: "space-between", padding: "20px 6px 0",
              fontSize: 19, color: "#e2e8f0",
            }}>
              <div style={{ display: "flex" }}>Vergleich nach Trainingsdatum</div>
              <div style={{ display: "flex", fontWeight: 800, color: "#f9a8d4" }}>
                @getstrikr · strikr.team
              </div>
            </div>
          </div>
          <div style={{
            display: "flex", position: "absolute", bottom: 0, left: 0, right: 0,
            height: 58, alignItems: "center", justifyContent: "center",
            background: "rgba(7,20,49,.73)", zIndex: 2,
            fontSize: 17, fontWeight: 900,
          }}>
            WENIGER ORGA. MEHR FUSSBALL.
          </div>
        </div>
      </div>
    );
    return new ImageResponse(story, {
      width: 1080, height: 1920,
      headers: { "Cache-Control": "private, no-store, max-age=0" },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Wochenreport fehlgeschlagen.", {
      status: 500, headers: { "Cache-Control": "private, no-store" },
    });
  }
}
