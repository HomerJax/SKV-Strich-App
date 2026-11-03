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
  const isRise = moment.id === "rise";
  const isFall = moment.id === "fall";
  const symbol = isRise ? "↑" : isFall ? "↓" : moment.id === "race" ? "★" : "•";
  const metric = isRise || isFall
    ? (moment.headline.match(/[0-9]+[ ]+Plätze?/)?.[0] ?? "")
    : "";
  const name = moment.name ?? "";
  return (
    <div style={{
      display: "flex", flexDirection: "column", width: "100%", height: "100%",
      boxSizing: "border-box", overflow: "hidden",
      borderRadius: 34, padding: hero ? "44px 46px" : "35px 34px",
      border: "2px solid rgba(255,255,255,.25)",
      background: moment.background,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ display: "flex", fontSize: hero ? 49 : 39, color: moment.accent, fontWeight: 900 }}>{symbol}</div>
        <div style={{ display: "flex", fontSize: hero ? 31 : 27, color: "#fff", fontWeight: 900, letterSpacing: 1 }}>
          {moment.label}
        </div>
      </div>
      {hero ? (
        <>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 32, marginTop: 33 }}>
            {name ? <Avatar name={name} photo={moment.photo ?? null} accent={moment.accent} size={200} /> : null}
            <div style={{
              display: "flex", flexDirection: "column", minWidth: 0, flexGrow: 1,
              fontSize: name.length > 24 ? 43 : 52, fontWeight: 900,
              lineHeight: 1.12, color: "#fff",
            }}>{name || moment.headline}</div>
          </div>
          <div style={{
            display: "flex", fontSize: metric ? 96 : 62, fontWeight: 950,
            letterSpacing: -2, color: "#fff", marginTop: 30,
          }}>{metric ? symbol + " " + metric.toUpperCase() : moment.headline}</div>
          <div style={{
            display: "flex", fontSize: 34, color: "#ffe9fa", marginTop: 10,
          }}>{moment.detail}</div>
        </>
      ) : (
        <>
          {name ? (
            <div style={{ display: "flex", marginTop: 32 }}>
              <Avatar name={name} photo={moment.photo ?? null} accent={moment.accent} size={145} />
            </div>
          ) : null}
          <div style={{
            display: "flex", fontSize: name ? (name.length > 20 ? 35 : 41) : 46,
            fontWeight: 900, lineHeight: 1.1, color: "#fff",
            marginTop: name ? 20 : 49,
          }}>{name || moment.headline}</div>
          {metric ? <div style={{
            display: "flex", fontSize: 57, fontWeight: 950,
            color: "#fff", marginTop: 17,
          }}>{symbol + " " + metric.toUpperCase()}</div> : null}
          <div style={{
            display: "flex", fontSize: 30, lineHeight: 1.24,
            color: "#f4e9ff", marginTop: 17,
          }}>{moment.detail}</div>
        </>
      )}
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
        background: "linear-gradient(145deg,#102c70,#24236f 58%,#562078)",
        color: "#fff", fontFamily: "sans-serif",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", width: "100%", height: "100%",
          boxSizing: "border-box", padding: "190px 46px 190px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", flexShrink: 0, gap: 11 }}>
            <div style={{ display: "flex", color: "#f5a4dc", fontSize: 28, fontWeight: 850, letterSpacing: 2 }}>BEI STRIKR</div>
            <div style={{ display: "flex", color: "#fff", fontSize: 73, fontWeight: 950, letterSpacing: -2 }}>WOCHENREPORT.</div>
            <div style={{ display: "flex", color: "#e0e4ff", fontSize: 35 }}>Die Highlights der Woche</div>
          </div>
          <div style={{
            display: "flex", flexDirection: "column", gap: 24,
            marginTop: 45, flexShrink: 0,
          }}>
            <div style={{ display: "flex", width: 988, height: 575 }}>
              <StoryMomentCard moment={visibleMoments[0]} hero />
            </div>
            {visibleMoments.length > 1 ? (
              <div style={{ display: "flex", flexDirection: "row", gap: 24, height: 615 }}>
                {visibleMoments.slice(1).map((moment) => (
                  <div key={moment.id} style={{ display: "flex", width: 482, height: 615 }}>
                    <StoryMomentCard moment={moment} hero={false} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{
            display: "flex", flexDirection: "row", alignItems: "center",
            justifyContent: "space-between", marginTop: 37,
            color: "#f0dcf8", fontSize: 28,
          }}>
            <div style={{ display: "flex" }}>@getstrikr</div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 11 }}>
              {logo ? <img src={logo} alt="" width={61} height={61}
                style={{ width: 61, height: 61, borderRadius: 13 }} /> : null}
              <div style={{ display: "flex", fontSize: 40, fontWeight: 850, color: "#fff" }}>strikr</div>
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
