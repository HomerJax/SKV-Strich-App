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

/** Original strikr flat-line doodle: the missed ball has already left the stadium. */
function PenaltyMissDoodle() {
  return (
    <svg width="246" height="116" viewBox="0 0 246 116" xmlns="http://www.w3.org/2000/svg">
      <path d="M83 61 L166 61 L166 103 L83 103 Z" stroke="#d9d1ff" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M97 65 V101 M111 65 V101 M125 65 V101 M139 65 V101 M153 65 V101 M84 75 H165 M84 88 H165"
        stroke="#9485d5" strokeWidth="1.8" opacity=".67"/>
      <path d="M35 109 Q99 3 216 19" stroke="#ffcd75" strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="7 8"/>
      <circle cx="219" cy="18" r="15" fill="#fff9ec" stroke="#1c224f" strokeWidth="3"/>
      <path d="M219 9 L227 15 L224 24 L215 25 L210 16 Z" fill="#223163"/>
      <path d="M206 6 L202 2 M232 7 L239 2 M233 31 L242 34"
        stroke="#ffcd75" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="43" cy="58" r="12" fill="#ffe0bd" stroke="#27315e" strokeWidth="3"/>
      <path d="M33 49 Q43 37 53 49" fill="none" stroke="#27315e" strokeWidth="6" strokeLinecap="round"/>
      <path d="M30 77 Q42 67 56 77 L62 96 L25 96 Z" fill="#e9e5ff" stroke="#27315e" strokeWidth="3" strokeLinejoin="round"/>
      <path d="M32 77 L18 55 L11 57 M53 77 L68 56 L76 59"
        stroke="#ffe0bd" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18 55 L21 45 M68 56 L65 47" stroke="#ffe0bd" strokeWidth="7" strokeLinecap="round"/>
      <path d="M32 97 L29 110 M52 97 L56 110" stroke="#d9d1ff" strokeWidth="8" strokeLinecap="round"/>
      <path d="M24 112 L36 112 M52 112 L63 112" stroke="#ffcd75" strokeWidth="5" strokeLinecap="round"/>
      <path d="M38 57 L41 59 M47 57 L49 59 M43 65 Q47 61 51 65" stroke="#27315e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M10 30 L17 23 M24 27 V16" stroke="#ffcd75" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

function StoryMomentCard({ moment, compact, height }: { moment: StoryMoment; compact: boolean; height?: number }) {
  const isRise = moment.id === "rise";
  const isFall = moment.id === "fall";
  const mover = isRise || isFall;
  const isElfer = moment.id === "elfer";
  const match = mover ? moment.headline.match(/[0-9]+[ ]+Plätze?/) : null;
  const metric = match ? match[0].replace(/ Plätze?/, "") : "";
  const color = isRise ? "#55e58d" : isFall ? "#ff666e"
    : isElfer ? "#ffbc67" : moment.id === "special" ? "#c58aff" : "#c58aff";
  return (
    <div style={{
      display: "flex", width: 988, height: height ?? (mover ? (compact ? 320 : 405) : (compact ? 220 : 265)),
      flexDirection: "row", boxSizing: "border-box", overflow: "hidden",
      borderRadius: 32, border: "2px solid rgba(255,255,255,.24)",
      background: "linear-gradient(115deg,#142c69,#252267 75%,#30206c)",
    }}>
      <div style={{ display: "flex", width: 14, height: "100%", background: color, flexShrink: 0 }} />
      {mover ? (
        <>
          <div style={{
            display: "flex", width: compact ? 215 : 275, height: "100%", flexShrink: 0,
            justifyContent: "center", alignItems: "center",
            background: "rgba(0,0,0,.12)",
          }}>
            <Avatar name={moment.name || ""} photo={moment.photo ?? null} accent={color} size={compact ? 174 : 230} />
          </div>
          <div style={{
            display: "flex", flexDirection: "column", width: compact ? 720 : 660,
            padding: compact ? "20px 18px 16px 26px" : "32px 22px 26px 28px", boxSizing: "border-box",
          }}>
            <div style={{ display: "flex", fontSize: compact ? 25 : 29, fontWeight: 850, color: "#fff" }}>{moment.label}</div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", marginTop: compact ? 4 : 12 }}>
              <div style={{ display: "flex", fontSize: compact ? 78 : 112, fontWeight: 900, color, width: compact ? 68 : 90 }}>{isRise ? "↑" : "↓"}</div>
              <div style={{ display: "flex", fontSize: compact ? 82 : 116, fontWeight: 900, color: "#fff" }}>{isRise ? "+" : "−"}{metric}</div>
              <div style={{ display: "flex", fontSize: compact ? 23 : 26, color: "#d9dcf7", marginLeft: compact ? 14 : 20 }}>PLÄTZE</div>
            </div>
            <div style={{ display: "flex", fontSize: compact ? ((moment.name || "").length > 23 ? 29 : 35) : ((moment.name || "").length > 23 ? 35 : 42), fontWeight: 900, color: "#fff", marginTop: compact ? 0 : 4 }}>
              {moment.name}
            </div>
            <div style={{ display: "flex", fontSize: compact ? 23 : 29, color: "#d9dcf7", marginTop: compact ? 7 : 12 }}>{moment.detail}</div>
          </div>
        </>
      ) : isElfer ? (
        <div style={{ display: "flex", width: 970, height: "100%", flexDirection: "row", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", width: 275, height: "100%", flexShrink: 0,
            justifyContent: "center", alignItems: "center", background: "rgba(0,0,0,.12)" }}>
            <Avatar name={moment.name || ""} photo={moment.photo ?? null} accent="#ffbc67" size={compact ? 125 : 156} />
            <div style={{ display: "flex", marginTop: 5, justifyContent: "center", alignItems: "center" }}>
              <PenaltyMissDoodle />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: 660,
            padding: "16px 22px 16px 28px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", fontSize: compact ? 22 : 24, fontWeight: 900, color: "#ffd69c" }}>
              KABINENMOMENT · 11 METER
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: compact ? 37 : 43,
              fontWeight: 900, color: "#fff" }}>ELFER VERSEMMELT!</div>
            <div style={{ display: "flex", marginTop: 6, fontSize: (moment.name || "").length > 23 ? 30 : 36,
              fontWeight: 900, color: "#fff" }}>{moment.name}</div>
            <div style={{ display: "flex", marginTop: compact ? 3 : 8, fontSize: 25,
              color: "#e9e5fc" }}>{moment.detail}</div>
          </div>
        </div>
      ) : (
        <div style={{
          display: "flex", flexDirection: "row", alignItems: "center",
          padding: compact ? "18px 30px" : "35px 40px", boxSizing: "border-box", width: 970,
        }}>
          <div style={{ display: "flex", fontSize: compact ? 52 : 76, width: compact ? 125 : 155,
            fontWeight: 900, color, justifyContent: "center" }}>
            {moment.id === "special" && moment.icon === "⚽" ? "11m" : moment.id === "race" ? "1." : "!"}
          </div>
          <div style={{ display: "flex", flexDirection: "column", width: compact ? 810 : 730 }}>
            <div style={{ display: "flex", fontSize: compact ? 23 : 29, fontWeight: 850, color: "#e9d5ff" }}>{moment.label}</div>
            <div style={{ display: "flex", fontSize: compact ? (moment.headline.length > 43 ? 29 : 34) : 43,
              fontWeight: 900, color: "#fff", marginTop: compact ? 7 : 12 }}>{moment.headline}</div>
            <div style={{ display: "flex", fontSize: compact ? 22 : 28, lineHeight: 1.25, color: "#e9e5fc", marginTop: compact ? 7 : 12 }}>{moment.detail}</div>
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
    // Standalone 1080x1920 story. This is a separate image, never a fourth
    // tile in the regular weekly report. Only a genuinely recorded missed
    // penalty from the current rolling week can trigger it.
    if (request.nextUrl.searchParams.get("card") === "elfer") {
      if (process.env.NEXT_PUBLIC_ELFER_MOMENTS_ENABLED !== "true") {
        return new Response("Elfer-Moments sind vorübergehend deaktiviert.", { status: 404, headers: { "Cache-Control": "private, no-store" } });
      }
      if (extra?.kind !== "missed_penalty" || !extra.playerName) {
        return new Response("Kein verschossener Elfmeter in dieser Berichtswoche erfasst.", {
          status: 404, headers: { "Cache-Control": "private, no-store" },
        });
      }
      const playerName = extra.playerName;
      const isBeerCrate = /(?:1\\s*kischde|1\\s*kiste)/iu.test(extra.detail ?? "");
      const penaltyLine = isBeerCrate ? "Kiste Bier trotzdem fällig."
        : (extra.detail?.replace(/^Strafe eingetragen:\\s*/iu, "Strafe: ") || "Strafe eingetragen.");
      // Editorial, deliberately illustration-free 9:16 design.
      // Keep text out of SVG: Satori's SVG engine does not support <text>.
      const image = (
        <div style={{
          display:"flex",width:1080,height:1920,flexDirection:"column",
          padding:"108px 84px 145px",boxSizing:"border-box",
          background:"linear-gradient(157deg,#08131e 0%,#102037 64%,#08121e 100%)",
          color:"#f6fbff",fontFamily:"sans-serif",
        }}>
          <div style={{display:"flex",flexDirection:"column"}}>
            <div style={{display:"flex",alignItems:"center",gap:20}}>
              {logo ? <img src={logo} alt="" width={76} height={76} style={{width:76,height:76,borderRadius:17}}/> : null}
              <div style={{display:"flex",fontSize:69,fontWeight:900,letterSpacing:-3}}>strikr</div>
            </div>
            <div style={{display:"flex",width:188,height:8,background:"#0aa8f7",borderRadius:6,marginTop:24}}/>
            <div style={{display:"flex",fontSize:40,marginTop:15,letterSpacing:1}}>Moments</div>
          </div>

          <div style={{display:"flex",flexDirection:"column",marginTop:160}}>
            <div style={{display:"flex",fontSize:34,letterSpacing:5,fontWeight:700,color:"#6dbce9"}}>KABINENMOMENT · ELFMETER</div>
            <div style={{display:"flex",marginTop:34,fontSize:106,fontWeight:900,lineHeight:1.03,letterSpacing:-5}}>Verantwortung</div>
            <div style={{display:"flex",fontSize:106,fontWeight:900,lineHeight:1.03,letterSpacing:-5}}>übernommen<span style={{color:"#0aa8f7"}}>.</span></div>
            <div style={{display:"flex",fontSize:45,marginTop:34,color:"#e8f0f7"}}>Elfmeter versemmelt. Starker Typ.</div>
          </div>

          <div style={{display:"flex",height:300,marginTop:85,position:"relative",alignItems:"center",justifyContent:"center",
            background:"linear-gradient(90deg,rgba(28,54,77,.32),rgba(15,31,48,.08))",borderRadius:32,
            border:"2px solid rgba(181,214,237,.12)"}}>
            <svg width="820" height="225" viewBox="0 0 820 225" xmlns="http://www.w3.org/2000/svg">
              <path d="M238 183 V35 H550 V183" fill="none" stroke="#aec2d2" strokeWidth="5" strokeLinecap="round"/>
              <path d="M241 182 H548" fill="none" stroke="#aec2d2" strokeWidth="2" opacity=".55"/>
              <path d="M292 184 V38 M345 184 V38 M398 184 V38 M451 184 V38 M504 184 V38 M240 74 H548 M240 110 H548 M240 146 H548" stroke="#9fb8c9" strokeWidth="1.5" opacity=".18" fill="none"/>
              <path d="M126 197 Q402 12 692 109" stroke="#e3eef8" strokeWidth="3.5" strokeDasharray="8 13" opacity=".8" fill="none" strokeLinecap="round"/>
              <circle cx="714" cy="111" r="16" fill="#08131e" stroke="#e7f3fb" strokeWidth="3"/>
              <path d="M707 106 L715 101 L723 107 L720 117 L710 120 L702 113 Z" fill="none" stroke="#e7f3fb" strokeWidth="2"/>
              <path d="M744 89 L756 77 M749 113 L765 113" stroke="#0aa8f7" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </div>

          <div style={{display:"flex",width:912,marginTop:80,alignItems:"center",gap:29}}>
            <Avatar name={playerName} photo={extraPhoto} accent="#9ccfe9" size={132}/>
            <div style={{display:"flex",height:75,width:3,background:"rgba(255,255,255,.4)"}}/>
            <div style={{display:"flex",fontSize:playerName.length>24?43:playerName.length>17?54:62,fontWeight:850,
              overflowWrap:"anywhere"}}>{playerName}</div>
          </div>

          <div style={{display:"flex",height:7,width:158,background:"#0aa8f7",borderRadius:5,marginTop:72}}/>
          <div style={{display:"flex",marginTop:47,width:912,alignItems:"center",gap:30}}>
            <div style={{display:"flex",width:106,height:106,justifyContent:"center",alignItems:"center",
              border:"3px solid #a0d9fb",borderRadius:20,color:"#a0d9fb",fontSize:57,fontWeight:900}}>1</div>
            <div style={{display:"flex",flexDirection:"column"}}>
              <div style={{display:"flex",fontSize:isBeerCrate?61:47,lineHeight:1.12,fontWeight:900,overflowWrap:"anywhere"}}>
                {penaltyLine}
              </div>
            </div>
          </div>
          <div style={{display:"flex",marginTop:"auto",width:912,justifyContent:"space-between",color:"#8ba3b5",fontSize:28}}>
            <div style={{display:"flex"}}>@getstrikr</div>
            <div style={{display:"flex"}}>strikr.team</div>
          </div>
        </div>
      );
      return new ImageResponse(image, {
        width: 1080, height: 1920,
        headers: { "Cache-Control": "private, no-store, max-age=0" },
      });
    }

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
    // Only a documented missed penalty gets an exclusive standalone Elfer story.
    // Other specials can still occupy a free slot in the regular report.
    const hasMissedElfer = extra?.kind === "missed_penalty";
    if (extra && (moments.length < 3 || hasMissedElfer)) {
      const icon = extra.kind === "missed_penalty" ? "⚽"
        : extra.kind === "birthday" ? "🎂"
        : extra.kind === "wheel" ? "🎡"
        : extra.kind === "finale" ? "🏁" : "⭐";
      moments.push({
        id: hasMissedElfer ? "elfer" : "special", icon, label: extra.title.toUpperCase(),
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

    // The weekly report remains a single three-card story. The missed-penalty
    // highlight is exclusively shared via ?card=elfer as its own story.
    const mainMoments = moments.filter((moment) => moment.id !== "elfer").slice(0, 3);
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
            {mainMoments.map((moment) => (
              <StoryMomentCard key={moment.id} moment={moment} compact={false}
                height={moment.id === "rise" || moment.id === "fall" ? 405 : 265} />
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
