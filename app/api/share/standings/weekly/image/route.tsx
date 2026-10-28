import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { requireClub } from "@/lib/auth/guards";
import { isWeeklyReportPilotClub } from "@/lib/standings/weekly-report-pilots";
import type { WeeklyReport, WeeklyMover } from "@/lib/standings/weekly-report";
import { weeklyRaceStory } from "@/lib/standings/weekly-race-story";

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

function Avatar({ name, photo, accent, size }: {
  name: string; photo: string | null; accent: string; size: number;
}) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2)
    .map((part) => part.slice(0, 1)).join("").toUpperCase();
  return (
    <div style={{
      display: "flex", width: size, height: size, flexShrink: 0,
      borderRadius: size / 2, overflow: "hidden",
      alignItems: "center", justifyContent: "center",
      border: "3px solid " + accent, background: "#1e2d56",
      color: "#fff", fontSize: size * 0.36, fontWeight: 900,
    }}>
      {photo
        ? <img src={photo} alt="" width={size} height={size}
            style={{ width: size, height: size, objectFit: "cover" }} />
        : initials || "?"}
    </div>
  );
}

type StoryMoment = {
  id: string;
  label: string;
  headline: string;
  detail: string;
  name?: string;
  photo?: string | null;
  accent: string;
  background: string;
  icon: string;
};

function StoryMomentCard({ moment, hero }: { moment: StoryMoment; hero: boolean }) {
  const avatarSize = hero ? 240 : 154;
  const mainSize = hero
    ? (moment.headline.length > 75 ? 50 : moment.headline.length > 42 ? 61 : 75)
    : (moment.headline.length > 72 ? 34 : moment.headline.length > 43 ? 42 : 53);
  return (
    <div style={{
      display: "flex", flexDirection: hero ? "row" : "column",
      width: "100%", height: "100%", boxSizing: "border-box",
      borderRadius: 32, border: "2px solid rgba(255,255,255,.18)",
      background: moment.background,
      padding: hero ? "43px 45px" : "37px 34px",
      gap: hero ? 42 : 22,
      alignItems: hero ? "center" : "stretch",
      justifyContent: "center",
      overflow: "hidden",
    }}>
      {hero ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {moment.name
            ? <Avatar name={moment.name} photo={moment.photo ?? null}
                accent={moment.accent} size={avatarSize}/>
            : <div style={{ display: "flex", fontSize: 150 }}>{moment.icon}</div>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 24 }}>
          {moment.name
            ? <Avatar name={moment.name} photo={moment.photo ?? null}
                accent={moment.accent} size={avatarSize}/>
            : <div style={{ display: "flex", width: 154, height: 154,
                justifyContent: "center", alignItems: "center", fontSize: 106 }}>{moment.icon}</div>}
          <div style={{ display: "flex", flex: 1, color: moment.accent,
            fontSize: 27, fontWeight: 900, letterSpacing: 1.2, lineHeight: 1.12 }}>
            {moment.label}
          </div>
        </div>
      )}
      <div style={{
        display: "flex", flexDirection: "column", flex: 1,
        justifyContent: "center", gap: hero ? 25 : 22, minWidth: 0,
      }}>
        {hero ? (
          <div style={{ display: "flex", color: moment.accent,
            fontSize: 31, fontWeight: 900, letterSpacing: 1.5 }}>
            {moment.label}
          </div>
        ) : null}
        <div style={{
          display: "flex", color: "#fff", fontSize: mainSize,
          fontWeight: 950, lineHeight: 1.12,
        }}>
          {moment.headline.length > 145 ? moment.headline.slice(0, 142) + "…" : moment.headline}
        </div>
        <div style={{
          display: "flex", color: "#f1f5f9",
          fontSize: hero ? 46 : 38, lineHeight: 1.22, fontWeight: 750,
        }}>
          {moment.detail.length > 135 ? moment.detail.slice(0, 132) + "…" : moment.detail}
        </div>
      </div>
      {!hero ? (
        <div style={{ display: "flex", height: 5, flexShrink: 0,
          borderRadius: 4, background: moment.accent, opacity: .82 }} />
      ) : null}
    </div>
  );
}

export async function GET(request: NextRequest) {
  try {
    const { clubId } = await requireClub();
    if (!isWeeklyReportPilotClub(clubId)) {
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
    const race = weeklyRaceStory(report);
    const dateLabel = report.cutoffDate.split("-").reverse().join(".");
    const seasonName = payload.seasons?.find((season) => String(season.id) === payload.selected)?.name
      ?? (payload.selected === "all" ? "Karriere" : "Saison");

    const moments: StoryMoment[] = [];
    // Give real Kabinenmomente precedence as the lead story.
    if (extra) {
      const icon = extra.kind === "missed_penalty" ? "⚽"
        : extra.kind === "birthday" ? "🎂"
        : extra.kind === "wheel" ? "🎡"
        : extra.kind === "finale" ? "🏁" : "⭐";
      moments.push({
        id: "special", icon, label: extra.title.toUpperCase(),
        headline: extra.text, detail: extra.detail || "Das ist diese Woche passiert.",
        name: extra.playerName, photo: extraPhoto, accent: "#f9a8d4",
        background: "linear-gradient(110deg,rgba(236,72,153,.72),rgba(120,35,93,.5) 58%,rgba(49,46,129,.5))",
      });
    }
    if (riser) moments.push({
      id: "rise", icon: "📈", label: "↑ GRÖSSTER AUFSTEIGER",
      headline: riser.name + " klettert " + riser.places + (riser.places === 1 ? " Platz!" : " Plätze!"),
      detail: "Von Platz " + riser.fromRank + " auf Platz " + riser.toRank + ".",
      name: riser.name, photo: upPhoto, accent: "#f9a8d4",
      background: "linear-gradient(110deg,rgba(236,72,153,.69),rgba(120,35,93,.5))",
    });
    if (faller) moments.push({
      id: "fall", icon: "📉", label: "↓ GRÖSSTER ABSTEIGER",
      headline: faller.name + " rutscht " + Math.abs(faller.places)
        + (Math.abs(faller.places) === 1 ? " Platz ab!" : " Plätze ab!"),
      detail: "Von Platz " + faller.fromRank + " auf Platz " + faller.toRank + ".",
      name: faller.name, photo: downPhoto, accent: "#ddd6fe",
      background: "linear-gradient(110deg,rgba(79,70,229,.68),rgba(49,46,129,.57))",
    });
    if (race) moments.push({
      id: "race", icon: "🏆", label: "🏆 MEISTERRENNEN",
      headline: race.headline, detail: race.detail,
      accent: "#f9a8d4",
      background: "linear-gradient(110deg,rgba(168,85,247,.5),rgba(49,46,129,.5))",
    });
    if (!moments.length) moments.push({
      id: "quiet", icon: "⚽", label: "KABINENREPORT",
      headline: "Diese Woche war's ruhig.",
      detail: "Sobald wieder etwas passiert, gibt's hier echte Geschichten.",
      accent: "#ddd6fe",
      background: "linear-gradient(110deg,rgba(79,70,229,.55),rgba(49,46,129,.5))",
    });
    // At most four meaningful highlights. One hero + two beneath (3),
    // or a balanced 2×2 editorial grid (4). Do not stretch empty subcards.
    const visibleMoments = moments.slice(0, 4);
    const count = visibleMoments.length;
    // Exact 1080×1920 story proportions, same indigo/pink artwork as the
    // standings share card. Preserve safe zones for Instagram story overlays.
    const story = (
      <div style={{
        display: "flex", width: 1080, height: 1920, padding: 18,
        boxSizing: "border-box", color: "#fff", fontFamily: "sans-serif",
        background: "linear-gradient(145deg,#172554,#312e81 44%,#831843)",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", width: "100%", height: "100%",
          overflow: "hidden", borderRadius: 42,
          border: "2px solid rgba(249,168,212,.86)",
          background: "linear-gradient(180deg,#1e3a8a,#172554 32%,#0f2554 70%,#0b1b3f)",
        }}>
          <div style={{
            display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
            padding: "104px 40px 150px", gap: 28,
            background: "radial-gradient(circle at 89% 2%,rgba(244,114,182,.5),transparent 28%),radial-gradient(circle at 46% 1%,rgba(129,140,248,.35),transparent 30%)",
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 22 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                <div style={{ display: "flex", color: "#f9a8d4",
                  fontSize: 30, fontWeight: 900, letterSpacing: 3 }}>
                  DER STRIKR
                </div>
                <div style={{ display: "flex", color: "#fff",
                  fontSize: 71, fontWeight: 950, lineHeight: 1.05, letterSpacing: -3 }}>
                  WOCHENREPORT<span style={{ color: "#f472b6" }}>.</span>
                </div>
                <div style={{ display: "flex", color: "#f1f5f9",
                  fontSize: 40, fontWeight: 850, marginTop: 8 }}>
                  Was ist diese Woche passiert?
                </div>
              </div>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                width: 156, flexShrink: 0, padding: "15px 12px",
                borderRadius: 22, background: "rgba(255,255,255,.12)",
                border: "1px solid rgba(255,255,255,.22)",
              }}>
                {logo ? <img src={logo} alt="" width={69} height={69}
                  style={{ width: 69, height: 69, borderRadius: 13, objectFit: "cover" }} /> : null}
                <div style={{ display: "flex", fontSize: 29, fontWeight: 950 }}>strikr</div>
              </div>
            </div>
            <div style={{
              display: "flex", fontSize: 27, color: "#cbd5e1", fontWeight: 750, marginTop: 4,
            }}>{seasonName + " · 7 Tage seit " + dateLabel}</div>

            {count === 3 ? (
              <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 22 }}>
                <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
                  <StoryMomentCard moment={visibleMoments[0]} hero />
                </div>
                <div style={{ display: "flex", flex: 1.15, minHeight: 0, flexDirection: "row", gap: 22 }}>
                  {visibleMoments.slice(1).map((moment) => (
                    <div key={moment.id} style={{ display: "flex", flex: 1, minWidth: 0 }}>
                      <StoryMomentCard moment={moment} hero={false} />
                    </div>
                  ))}
                </div>
              </div>
            ) : count === 4 ? (
              <div style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "column", gap: 20 }}>
                {[0, 2].map((start) => (
                  <div key={start} style={{ display: "flex", flex: 1, minHeight: 0, flexDirection: "row", gap: 20 }}>
                    {visibleMoments.slice(start, start + 2).map((moment) => (
                      <div key={moment.id} style={{ display: "flex", flex: 1, minWidth: 0 }}>
                        <StoryMomentCard moment={moment} hero={false} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", flex: 1, minHeight: 0,
                flexDirection: "column", gap: 20 }}>
                {visibleMoments.map((moment) => (
                  <div key={moment.id} style={{ display: "flex", flex: 1, minHeight: 0 }}>
                    <StoryMomentCard moment={moment} hero />
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center",
              justifyContent: "space-between", marginTop: 2,
              fontSize: 29, fontWeight: 850, color: "#f9a8d4" }}>
              <div style={{ display: "flex" }}>@getstrikr</div>
              <div style={{ display: "flex" }}>strikr.team</div>
            </div>
          </div>
          <div style={{
            display: "flex", height: 64, flexShrink: 0,
            alignItems: "center", justifyContent: "center",
            fontSize: 23, fontWeight: 900,
            background: "rgba(7,20,49,.85)",
          }}>WENIGER ORGA. MEHR FUSSBALL.</div>
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
