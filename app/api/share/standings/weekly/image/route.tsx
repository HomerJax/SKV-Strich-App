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
  const inner = size - 8;

  return (
    <div style={{
      display: "flex", width: size, height: size, flexShrink: 0,
      alignItems: "center", justifyContent: "center",
      borderRadius: size / 2, border: "4px solid " + accent,
      background: "#10224e", color: "#fff", overflow: "hidden",
      fontSize: size * 0.36, fontWeight: 850,
    }}>
      {photo ? (
        <img src={photo} alt="" width={inner} height={inner}
          style={{
            width: inner, height: inner, borderRadius: inner / 2,
            objectFit: "cover",
          }} />
      ) : initials || "?"}
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
  const nameLength = moment.headline.length;
  const headlineSize = hero
    ? nameLength > 75 ? 43 : nameLength > 55 ? 48 : nameLength > 40 ? 54 : 62
    : nameLength > 80 ? 29 : nameLength > 54 ? 32 : nameLength > 37 ? 36 : 43;
  const avatarSize = hero ? 150 : 104;
  const labelSize = hero ? 30 : 26;
  const labelIcon = moment.id === "rise" ? "↑"
    : moment.id === "fall" ? "↓"
    : moment.id === "race" ? "🏆" : moment.icon;

  return (
    <div style={{
      display: "flex", flexDirection: "column", width: "100%", height: "100%",
      minHeight: 0, boxSizing: "border-box",
      borderRadius: 35, border: "2px solid rgba(255,255,255,.22)",
      background: moment.background,
      padding: hero ? "39px 42px 38px" : "31px 28px 27px",
      overflow: "hidden",
    }}>
      <div style={{
        display: "flex", flexDirection: "row", alignItems: "center",
        gap: hero ? 17 : 11, flexShrink: 0,
      }}>
        <div style={{
          display: "flex", fontSize: hero ? 53 : 44, color: moment.accent,
          fontWeight: 850, lineHeight: 1,
        }}>{labelIcon}</div>
        <div style={{
          display: "flex", borderRadius: 18,
          padding: hero ? "12px 21px" : "11px 15px",
          background: moment.id === "rise"
            ? "linear-gradient(110deg,#ffb5eb,#f19ce2)"
            : moment.id === "fall" ? "#b9c7ff" : "#efa0dd",
          color: "#171547", fontSize: labelSize,
          fontWeight: 900, letterSpacing: .8, lineHeight: 1.08,
        }}>{moment.label}</div>
      </div>

      <div style={{
        display: "flex", flex: 1, minHeight: 0, minWidth: 0,
        flexDirection: "column",
        gap: hero ? 24 : 18,
        alignItems: "flex-start",
        justifyContent: "flex-start",
      }}>
        {moment.name ? (
          <Avatar name={moment.name} photo={moment.photo ?? null}
            size={avatarSize} accent={moment.accent} />
        ) : null}
        <div style={{
          display: "flex", minWidth: 0, width: "100%", flexGrow: 0,
          flexDirection: "column", justifyContent: "center",
          gap: hero ? 15 : 13,
        }}>
          <div style={{
            display: "flex", color: "#fff", fontSize: headlineSize,
            fontWeight: 900, letterSpacing: -.8,
            lineHeight: 1.08, overflowWrap: "break-word",
          }}>
            {moment.headline.length > 130 ? moment.headline.slice(0, 127) + "…" : moment.headline}
          </div>
          <div style={{
            display: "flex", color: "#f1f1fe",
            fontSize: hero ? 31 : moment.detail.length > 95 ? 25 : 28,
            fontWeight: 550, lineHeight: 1.2, overflowWrap: "break-word",
          }}>
            {moment.detail.length > 110 ? moment.detail.slice(0, 107) + "…" : moment.detail}
          </div>
        </div>
      </div>

      {!hero ? <div style={{
        display: "flex", height: 5, flexShrink: 0,
        borderRadius: 4, background: moment.accent,
      }} /> : null}
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

    // One shareable story: clear winner hero, loser and title race below.
    // Only display real highlights; never invent a weekly ranking change.
    const moments: StoryMoment[] = [];
    if (riser) moments.push({
      id: "rise", icon: "↑", label: "GRÖSSTER GEWINNER",
      headline: riser.name + " klettert " + riser.places
        + (riser.places === 1 ? " Platz!" : " Plätze!"),
      detail: "Von Platz " + riser.fromRank + " auf Platz " + riser.toRank + ".",
      name: riser.name, photo: upPhoto, accent: "#fbc7ed",
      background: "linear-gradient(112deg,#c53a9c,#7e277f 55%,#55216d)",
    });
    if (faller) moments.push({
      id: "fall", icon: "↓", label: "GRÖSSTER VERLIERER",
      headline: faller.name + " rutscht " + Math.abs(faller.places)
        + (Math.abs(faller.places) === 1 ? " Platz ab!" : " Plätze ab!"),
      detail: "Von Platz " + faller.fromRank + " auf Platz " + faller.toRank + ".",
      name: faller.name, photo: downPhoto, accent: "#bdcbff",
      background: "linear-gradient(125deg,#3949c2,#1d307a 75%,#1d2460)",
    });
    if (race) moments.push({
      id: "race", icon: "🏆", label: "MEISTERRENNEN",
      headline: race.headline.replace(/^(🔥|⚡|🏆)\s*/u, ""),
      detail: race.detail,
      accent: "#f5a6df",
      background: "linear-gradient(120deg,#7d35ae,#4c237d 72%,#332064)",
    });
    // Specials stay available if one of the main three stories is missing.
    if (extra && moments.length < 3) {
      const icon = extra.kind === "missed_penalty" ? "⚽"
        : extra.kind === "birthday" ? "🎂"
        : extra.kind === "wheel" ? "🎡"
        : extra.kind === "finale" ? "🏁" : "⭐";
      moments.push({
        id: "special", icon, label: extra.title.toUpperCase(),
        headline: extra.text, detail: extra.detail || "Das ist diese Woche passiert.",
        name: extra.playerName, photo: extraPhoto, accent: "#fbc7ed",
        background: "linear-gradient(112deg,#b63691,#682776 65%,#40216a)",
      });
    }
    if (!moments.length) moments.push({
      id: "quiet", icon: "•", label: "WOCHENRÜCKBLICK",
      headline: "Diese Woche war es ruhig.",
      detail: "Nach dem nächsten abgeschlossenen Training gibt es neue Highlights.",
      accent: "#fbc7ed",
      background: "linear-gradient(120deg,#5336a4,#2e2876)",
    });

    const visibleMoments = moments.slice(0, 3);
    const story = (
      <div style={{
        display: "flex", width: 1080, height: 1920, boxSizing: "border-box",
        color: "#fff", fontFamily: "sans-serif",
        background: "linear-gradient(142deg,#0c2d76 0%,#22287b 54%,#711b8c 100%)",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", width: "100%", height: "100%",
          padding: "121px 42px 255px", boxSizing: "border-box", gap: 31,
          background: "radial-gradient(circle at 88% 1%,rgba(244,62,189,.32),transparent 33%)",
        }}>
          <div style={{
            display: "flex", flexDirection: "column", gap: 12, flexShrink: 0,
          }}>
            <div style={{
              display: "flex", color: "#f594d8", fontSize: 30,
              fontWeight: 800, letterSpacing: 2.2,
            }}>BEI STRIKR</div>
            <div style={{
              display: "flex", color: "#fff", fontSize: 77,
              fontWeight: 950, letterSpacing: -2.2, lineHeight: 1.03,
            }}>WOCHENREPORT<span style={{ color: "#ef66c4" }}>.</span></div>
            <div style={{
              display: "flex", color: "#fff", fontSize: 42,
              fontWeight: 470, lineHeight: 1.18,
            }}>Was ist diese Woche passiert?</div>
          </div>

          {visibleMoments.length === 3 ? (
            <div style={{
              display: "flex", flexDirection: "column", flex: 1, minHeight: 0,
              gap: 22,
            }}>
              <div style={{ display: "flex", flex: 0.94, minHeight: 0 }}>
                <StoryMomentCard moment={visibleMoments[0]} hero />
              </div>
              <div style={{
                display: "flex", flex: 1.12, minHeight: 0, gap: 19,
              }}>
                {visibleMoments.slice(1).map((moment) => (
                  <div key={moment.id} style={{
                    display: "flex", flex: 1, minWidth: 0, minHeight: 0,
                  }}>
                    <StoryMomentCard moment={moment} hero={false}/>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{
              display: "flex", flex: 1, minHeight: 0, flexDirection: "column",
              gap: 22,
            }}>
              {visibleMoments.map((moment) => (
                <div key={moment.id} style={{ display: "flex", flex: 1, minHeight: 0 }}>
                  <StoryMomentCard moment={moment} hero={true} />
                </div>
              ))}
            </div>
          )}

          <div style={{
            display: "flex", flexShrink: 0, flexDirection: "row",
            alignItems: "center", justifyContent: "space-between",
            gap: 16, fontSize: 28, color: "#f9b1df",
          }}>
            <div style={{ display: "flex" }}>@getstrikr</div>
            <div style={{
              display: "flex", flexDirection: "row", alignItems: "center",
              gap: 13, color: "#fff",
            }}>
              {logo ? <img src={logo} alt="" width={74} height={74}
                style={{ width: 74, height: 74, objectFit: "cover", borderRadius: 17 }} /> : null}
              <div style={{ display: "flex", fontSize: 44, fontWeight: 850 }}>strikr</div>
            </div>
            <div style={{ display: "flex" }}>strikr.team</div>
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
