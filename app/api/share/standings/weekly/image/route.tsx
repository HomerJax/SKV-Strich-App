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

function StoryMomentCard({ moment }: { moment: StoryMoment }) {
  const isRise = moment.id === "rise";
  const isFall = moment.id === "fall";
  const mover = isRise || isFall;
  const match = mover ? moment.headline.match(/[0-9]+[ ]+Plätze?/) : null;
  const metric = match ? match[0].replace(/ Plätze?/, "") : "";
  const color = isRise ? "#55e58d" : isFall ? "#ff666e" : "#c58aff";
  return (
    <div style={{
      display: "flex", width: 988, height: mover ? 405 : 265,
      flexDirection: "row", boxSizing: "border-box", overflow: "hidden",
      borderRadius: 32, border: "2px solid rgba(255,255,255,.24)",
      background: "linear-gradient(115deg,#142c69,#252267 75%,#30206c)",
    }}>
      <div style={{ display: "flex", width: 14, height: "100%", background: color, flexShrink: 0 }} />
      {mover ? (
        <>
          <div style={{
            display: "flex", width: 275, height: "100%", flexShrink: 0,
            justifyContent: "center", alignItems: "center",
            background: "rgba(0,0,0,.12)",
          }}>
            <Avatar name={moment.name || ""} photo={moment.photo ?? null} accent={color} size={230} />
          </div>
          <div style={{
            display: "flex", flexDirection: "column", width: 660,
            padding: "32px 22px 26px 28px", boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", fontSize: 29, fontWeight: 850, color: "#fff" }}>{moment.label}</div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <div style={{ display: "flex", fontSize: 112, fontWeight: 900, color, width: 90 }}>{isRise ? "↑" : "↓"}</div>
              <div style={{ display: "flex", fontSize: 116, fontWeight: 900, color: "#fff" }}>{isRise ? "+" : "−"}{metric}</div>
              <div style={{ display: "flex", fontSize: 26, color: "#d9dcf7", marginLeft: 20 }}>PLÄTZE</div>
            </div>
            <div style={{ display: "flex", fontSize: (moment.name || "").length > 23 ? 35 : 42, fontWeight: 900, color: "#fff", marginTop: 4 }}>
              {moment.name}
            </div>
            <div style={{ display: "flex", fontSize: 29, color: "#d9dcf7", marginTop: 12 }}>{moment.detail}</div>
          </div>
        </>
      ) : (
        <div style={{
          display: "flex", flexDirection: "row", alignItems: "center",
          padding: "35px 40px", boxSizing: "border-box", width: 970,
        }}>
          <div style={{ display: "flex", fontSize: 96, width: 155, color, justifyContent: "center" }}>★</div>
          <div style={{ display: "flex", flexDirection: "column", width: 730 }}>
            <div style={{ display: "flex", fontSize: 29, fontWeight: 850, color: "#e9d5ff" }}>{moment.label}</div>
            <div style={{ display: "flex", fontSize: 43, fontWeight: 900, color: "#fff", marginTop: 12 }}>{moment.headline}</div>
            <div style={{ display: "flex", fontSize: 28, lineHeight: 1.25, color: "#e9e5fc", marginTop: 12 }}>{moment.detail}</div>
          </div>
        </div>
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
          display: "flex", flexDirection: "column", width: 1080, height: 1920,
          boxSizing: "border-box", padding: "205px 46px 180px",
        }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 17 }}>
            {logo ? <img src={logo} alt="" width={65} height={65}
              style={{ width: 65, height: 65, borderRadius: 15 }} /> : null}
            <div style={{ display: "flex", fontSize: 46, fontWeight: 900 }}>strikr</div>
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 900, marginTop: 22, letterSpacing: -1 }}>WOCHENREPORT.</div>
          <div style={{ display: "flex", fontSize: 35, color: "#d9dcf7", marginTop: 8 }}>Die Highlights der Woche</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 26, marginTop: 58 }}>
            {visibleMoments.map((moment) => (
              <StoryMomentCard key={moment.id} moment={moment} />
            ))}
          </div>
          <div style={{
            display: "flex", flexDirection: "row", justifyContent: "space-between",
            marginTop: 60, fontSize: 29, color: "#e4d9f4",
          }}>
            <div style={{ display: "flex" }}>@getstrikr</div>
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
