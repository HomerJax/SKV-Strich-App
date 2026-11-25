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
      if (extra?.kind !== "missed_penalty" || !extra.playerName) {
        return new Response("Kein verschossener Elfmeter in dieser Berichtswoche erfasst.", {
          status: 404, headers: { "Cache-Control": "private, no-store" },
        });
      }
      const playerName = extra.playerName;
      const isBeerCrate = /(?:1\\s*kischde|1\\s*kiste)/iu.test(extra.detail ?? "");
      const penaltyLine = isBeerCrate ? "Kiste Bier trotzdem fällig."
        : (extra.detail?.replace(/^Strafe eingetragen:\\s*/iu, "Strafe: ") || "Strafe eingetragen.");
      // A true 9:16 strikr Moment. Deliberately no AI-rendered player anatomy:
      // the penalty taker is a calm post-shot silhouette, viewed from behind.
      const image = (
        <div style={{
          display:"flex",width:1080,height:1920,flexDirection:"column",
          padding:"90px 80px 120px",boxSizing:"border-box",
          background:"linear-gradient(160deg,#08131e 0%,#112237 56%,#07111b 100%)",
          color:"#f8fbfd",fontFamily:"sans-serif",
        }}>
          <div style={{display:"flex",flexDirection:"column",width:"100%"}}>
            <div style={{display:"flex",alignItems:"center",gap:16}}>
              {logo ? <img src={logo} alt="" width={75} height={75} style={{width:75,height:75,borderRadius:17}}/> : null}
              <div style={{display:"flex",fontSize:66,fontWeight:900,letterSpacing:-3}}>strikr</div>
            </div>
            <div style={{display:"flex",width:168,height:8,marginTop:22,background:"#06a9ff",borderRadius:8}}/>
            <div style={{display:"flex",fontSize:39,marginTop:15,fontWeight:400}}>Moments</div>
          </div>
          <div style={{display:"flex",width:920,height:580,marginTop:70}}>
            <svg width="920" height="580" viewBox="0 0 920 580" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
                  <stop stopColor="#1c3448" stopOpacity=".04"/>
                  <stop offset="1" stopColor="#7593a9" stopOpacity=".2"/>
                </linearGradient>
              </defs>
              <path d="M0 364 H920 V580 H0 Z" fill="url(#ground)"/>
              <g fill="none" stroke="#d7e7f2" strokeWidth="3" opacity=".56" strokeLinecap="round">
                <circle cx="51" cy="266" r="13"/><path d="M35 286 L29 365 M65 286 L70 365 M34 295 L8 270 L6 232 M64 295 L87 267 L89 231 M29 365 L17 412 M70 365 L83 412"/>
                <circle cx="105" cy="276" r="12"/><path d="M91 294 L86 365 M118 294 L125 365 M90 303 L73 281 L71 248 M119 303 L143 275 L144 249 M87 365 L79 407 M124 365 L135 407"/>
                <circle cx="857" cy="266" r="13"/><path d="M841 286 L836 365 M873 286 L878 365 M843 295 L825 270 L826 231 M871 295 L894 265 L893 234 M836 365 L826 412 M878 365 L888 412"/>
                <circle cx="806" cy="276" r="12"/><path d="M793 294 L790 365 M819 294 L822 365 M791 303 L771 276 L770 248 M820 303 L844 281 L844 251 M790 365 L781 407 M822 365 L832 407"/>
              </g>
              <path d="M252 377 V190 H668 V377" stroke="#dbe8f2" strokeWidth="8" fill="none" strokeLinejoin="round"/>
              <g stroke="#b7ccdd" strokeWidth="1.6" opacity=".31">
                <path d="M279 194 V374 M313 194 V374 M347 194 V374 M381 194 V374 M415 194 V374 M449 194 V374 M483 194 V374 M517 194 V374 M551 194 V374 M585 194 V374 M619 194 V374 M653 194 V374"/>
                <path d="M257 223 H663 M257 258 H663 M257 293 H663 M257 328 H663 M257 363 H663"/>
              </g>
              <g fill="#0a1825" stroke="#bdcfdb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="459" cy="288" r="14"/>
                <path d="M445 306 L473 306 L481 344 L473 359 L445 359 L438 344 Z"/>
                <path d="M442 318 L421 343 M475 318 L498 343 M450 356 L442 376 M468 356 L477 376" fill="none" strokeWidth="10"/>
              </g>
              <path d="M0 395 H920" stroke="#7892a6" strokeWidth="2" opacity=".52"/>
              <ellipse cx="452" cy="508" rx="9" ry="3.5" fill="#e6f0f7"/>
              <g fill="#0d1a25" stroke="#e0edf6" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="451" cy="414" r="17"/>
                <path d="M433 434 Q451 425 469 434 L479 473 L466 487 L435 487 L423 473 Z"/>
                <path d="M429 443 L407 420 L425 395 L439 403 M473 443 L496 420 L478 395 L464 403" fill="none" strokeWidth="11"/>
                <path d="M441 486 L432 515 L423 537 M461 486 L469 515 L481 537" fill="none" strokeWidth="12"/>
              </g>
              <path d="M444 451 Q453 446 458 453 Q462 460 452 473 M444 451 Q444 461 454 460" stroke="#f0f6fc" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <path d="M540 409 Q674 369 759 346" stroke="#e9f3fa" strokeWidth="3" strokeDasharray="8 12" opacity=".72" fill="none"/>
              <circle cx="789" cy="337" r="17" fill="#091622" stroke="#eaf5fc" strokeWidth="3"/>
              <path d="M782 333 L790 326 L799 333 L796 344 L784 346 Z" fill="none" stroke="#eaf5fc" strokeWidth="2"/>
              <path d="M821 318 L831 308 M824 335 L843 335" stroke="#f3faff" strokeWidth="5" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{display:"flex",flexDirection:"column",width:920,marginTop:25}}>
            <div style={{display:"flex",fontSize:92,fontWeight:900,letterSpacing:-4,lineHeight:1.06}}>Verantwortung</div>
            <div style={{display:"flex",fontSize:92,fontWeight:900,letterSpacing:-4,lineHeight:1.06}}>
              übernommen<span style={{color:"#0baaff"}}>.</span>
            </div>
            <div style={{display:"flex",fontSize:39,marginTop:22,color:"#e3edf5"}}>Elfmeter versemmelt. Starker Typ.</div>
          </div>
          <div style={{display:"flex",width:920,alignItems:"center",gap:25,marginTop:55}}>
            <Avatar name={playerName} photo={extraPhoto} accent="#c3d6e5" size={116}/>
            <div style={{display:"flex",width:3,height:60,background:"rgba(255,255,255,.4)"}}/>
            <div style={{display:"flex",fontSize:playerName.length>25?38:playerName.length>18?46:53,
              fontWeight:850,overflowWrap:"anywhere"}}>{playerName}</div>
          </div>
          <div style={{display:"flex",width:170,height:7,marginTop:55,borderRadius:6,background:"#0baaff"}}/>
          <div style={{display:"flex",width:920,alignItems:"center",gap:38,marginTop:42}}>
            <svg width="172" height="160" viewBox="0 0 172 160" xmlns="http://www.w3.org/2000/svg">
              <g fill="none" stroke="#e2eef6" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round">
                <path d="M14 60 L89 32 L157 58 L82 89 Z M14 60 V124 L82 151 V89 M82 151 L157 122 V58"/>
                <path d="M36 73 L50 80 V91 L36 84 Z M47 44 V20 L56 16 V10 H64 V16 L73 20 V35 M88 33 V15 L96 11 V5 H105 V11 L114 15 V36 M126 44 V22 L134 18 V12 H143 V18 L150 22 V49"/>
              </g>
              <path d="M109 108 l10 9 l19 -27" fill="none" stroke="#0baaff" strokeWidth="6" strokeLinecap="round"/>
            </svg>
            <div style={{display:"flex",flexDirection:"column",width:710}}>
              <div style={{display:"flex",fontSize:isBeerCrate?60:48,fontWeight:900,lineHeight:1.1,overflowWrap:"anywhere"}}>{penaltyLine}</div>
            </div>
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
