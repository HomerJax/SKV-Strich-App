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
    ? (moment.headline.match(/\\d+\\s+Plätze?/)?.[0] ?? "")
    : "";
  const name = moment.name ?? "";
  const headline = metric && name ? metric : moment.headline;
  return (
    <div style={{
      display: "flex", flexDirection: "column", width: "100%", height: "100%",
      boxSizing: "border-box", overflow: "hidden", borderRadius: 28,
      padding: hero ? "40px 43px" : "29px 29px",
      border: "2px solid rgba(255,255,255,.22)",
      background: moment.background,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 13, flexShrink: 0 }}>
        <div style={{ display: "flex", color: moment.accent, fontSize: hero ? 43 : 34, fontWeight: 900 }}>{symbol}</div>
        <div style={{ display: "flex", color: "#fff", fontSize: hero ? 27 : 23, fontWeight: 850, letterSpacing: 1.1 }}>
          {moment.label}
        </div>
      </div>
      {hero ? (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 25, marginTop: 34 }}>
          {name ? <Avatar name={name} photo={moment.photo ?? null} accent={moment.accent} size={120} /> : null}
          <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
            <div style={{ display: "flex", color: "#fff", fontSize: name.length > 23 ? 42 : 49, fontWeight: 900, lineHeight: 1.1 }}>{name || moment.headline}</div>
            {metric ? <div style={{ display: "flex", color: "#fff", fontSize: 43, fontWeight: 850, marginTop: 9 }}>{symbol} {metric}</div> : null}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", marginTop: 23, gap: 14 }}>
          {name ? <Avatar name={name} photo={moment.photo ?? null} accent={moment.accent} size={86} /> : null}
          <div style={{ display: "flex", color: "#fff", fontSize: name ? 35 : 39, fontWeight: 850, lineHeight: 1.1 }}>
            {name || headline}
          </div>
          {metric ? <div style={{ display: "flex", color: "#fff", fontSize: 33, fontWeight: 850 }}>{symbol} {metric}</div> : null}
        </div>
      )}
      <div style={{
        display: "flex", marginTop: hero ? 23 : 18, color: "#f6eefd",
        fontSize: hero ? 31 : 26, lineHeight: 1.2,
      }}>{moment.detail}</div>
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
        background: "linear-gradient(145deg,#102d73,#25256f 58%,#54217b)",
        color: "#fff", fontFamily: "sans-serif",
      }}>
        <div style={{
          display: "flex", flexDirection: "column", width: "100%", height: "100%",
          boxSizing: "border-box", padding: "160px 48px 235px",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 13, flexShrink: 0 }}>
            <div style={{ display: "flex", color: "#f2a0db", fontSize: 27, fontWeight: 800, letterSpacing: 2 }}>BEI STRIKR</div>
            <div style={{ display: "flex", fontSize: 72, fontWeight: 900, letterSpacing: -2 }}>WOCHENREPORT.</div>
            <div style={{ display: "flex", fontSize: 34, color: "#dce4ff" }}>Die Highlights der Woche</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 55, flexShrink: 0 }}>
            <div style={{ display: "flex", height: 490 }}>
              <StoryMomentCard moment={visibleMoments[0]} hero />
            </div>
            {visibleMoments.length > 1 ? (
              <div style={{ display: "flex", flexDirection: "row", gap: 22, height: 520 }}>
                {visibleMoments.slice(1).map((moment) => (
                  <div key={moment.id} style={{ display: "flex", width: 480, height: 520 }}>
                    <StoryMomentCard moment={moment} hero={false} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between",
            alignItems: "center", marginTop: 53, fontSize: 27, color: "#e9d9fa" }}>
            <div style={{ display: "flex" }}>@getstrikr</div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 12 }}>
              {logo ? <img src={logo} alt="" width={58} height={58}
                style={{ width: 58, height: 58, borderRadius: 12 }} /> : null}
              <div style={{ display: "flex", color: "#fff", fontSize: 37, fontWeight: 850 }}>strikr</div>
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
