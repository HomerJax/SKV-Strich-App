"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Megaphone, Share2, X } from "lucide-react";

type Tone = "motivation" | "reminder" | "casual";
const variants: Record<Tone, { label: string; kicker: string; headline: string; subline: string; text: string }> = {
  motivation: { label: "Motivierend", kicker: "GEMEINSAM AUF DEN PLATZ", headline: "TRAINING STEHT AN!", subline: "Ein Team. Ein Platz. Deine Zusage zählt.", text: "Auf geht's! Wer ist beim nächsten Training dabei?" },
  reminder: { label: "Erinnerung", kicker: "NICHT VERGESSEN", headline: "BIST DU DABEI?", subline: "Bitte rechtzeitig zu- oder absagen.", text: "Kurze Erinnerung: Bitte gib deine Rückmeldung zum Training ab." },
  casual: { label: "Locker", kicker: "KABINENTALK", headline: "KICKEN STATT COUCH!", subline: "Schuhe schnüren, Leute treffen, Spaß haben.", text: "Na, wer ist dabei? Die Truppe wartet auf dich!" },
};
function displayDate(date: string) {
  const d = new Date(date + "T12:00:00");
  return Number.isNaN(d.getTime()) ? date : new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "2-digit", month: "long", year: "numeric" }).format(d);
}
function svgEscape(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;"); }
function fit(value: string, max: number) { return value.length > max ? value.slice(0, max - 1) + "…" : value; }

export default function TrainingAnnouncementCard({ clubName, date, startTime, sessionId }: { clubName: string; date: string; startTime: string | null; sessionId: number }) {
  const [tone, setTone] = useState<Tone>("motivation");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const v = variants[tone];
  const when = displayDate(date);
  const time = startTime ? startTime.slice(0, 5) + " Uhr" : "Uhrzeit siehe Training";
  const url = typeof window === "undefined" ? "https://strikr.team/sessions/" + sessionId : window.location.origin + "/sessions/" + sessionId;
  const shareText = v.text + "\n\n" + clubName + "\n" + when + " · " + time + "\n\nHier zu- oder absagen: " + url;

  function buildSvg(logoData: string) {
    const club = svgEscape(fit(clubName, 32));
    const day = svgEscape(fit(when, 38));
    const accent = "#5eead4";
    const title = tone === "motivation" ? "TRAINING." : tone === "reminder" ? "REMINDER." : "GAME ON.";
    const message = tone === "motivation" ? ["ALLE AUF", "DEN PLATZ."] : tone === "reminder" ? ["BIST DU", "DABEI?"] : ["KICKEN.", "STATT COUCH."];
    const logo = logoData ? `<image href="${logoData}" x="790" y="66" width="76" height="76" preserveAspectRatio="xMidYMid meet"/>` : "";
    const titleSize = title.length > 9 ? 100 : 122;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b3475"/><stop offset="1" stop-color="#1b4db0"/></linearGradient>
        <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1e293b"/><stop offset=".7" stop-color="#0f172a"/><stop offset="1" stop-color="#020617"/></linearGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#020617" stop-opacity="0"/><stop offset="1" stop-color="#020617"/></linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="#020617"/>
      <rect x="20" y="20" width="1040" height="1310" rx="42" fill="#020617" stroke="#ffffff" stroke-opacity=".1" stroke-width="2"/>
      <path d="M20 62 Q20 20 62 20 H1018 Q1060 20 1060 62 V350 H20Z" fill="url(#top)"/>
      <rect x="20" y="350" width="1040" height="980" fill="url(#body)"/>
      <rect x="54" y="54" width="500" height="126" rx="24" fill="#020617" fill-opacity=".56" stroke="#ffffff" stroke-opacity=".15"/>
      <text x="80" y="104" fill="#ffffff" font-size="30" font-weight="900" font-family="Arial,sans-serif">${club}</text>
      <text x="80" y="145" fill="#b5c7e6" font-size="20" font-weight="800" font-family="Arial,sans-serif" letter-spacing="2">TRAININGSANKÜNDIGUNG</text>
      <rect x="744" y="54" width="282" height="142" rx="24" fill="#020617" fill-opacity=".56" stroke="#ffffff" stroke-opacity=".15"/>
      ${logo}
      <text x="884" y="104" fill="#ffffff" font-size="33" font-weight="900" font-family="Arial,sans-serif">strikr</text>
      <text x="884" y="137" fill="#d1d8e6" font-size="17" font-weight="700" font-family="Arial,sans-serif">@getstrikr</text>
      <text x="884" y="166" fill="#5eead4" font-size="17" font-weight="800" font-family="Arial,sans-serif">strikr.team</text>
      <text x="54" y="304" fill="#ffffff" font-size="${titleSize}" font-weight="900" font-family="Arial,sans-serif" letter-spacing="-4">${svgEscape(title)}</text>
      <text x="80" y="468" fill="#9cb0ce" font-size="26" font-weight="900" font-family="Arial,sans-serif" letter-spacing="6">DEIN NÄCHSTES TRAINING</text>
      <text x="76" y="665" fill="#ffffff" font-size="108" font-weight="900" font-family="Arial,sans-serif" letter-spacing="-4">${svgEscape(message[0])}</text>
      <text x="76" y="787" fill="#ffffff" font-size="100" font-weight="900" font-family="Arial,sans-serif" letter-spacing="-4" textLength="${Math.min(910,message[1].length*66)}" lengthAdjust="spacingAndGlyphs">${svgEscape(message[1])}</text>
      <rect x="80" y="849" width="920" height="2" fill="#ffffff" opacity=".16"/>
      <text x="80" y="927" fill="#ffffff" font-size="43" font-weight="900" font-family="Arial,sans-serif" textLength="${Math.min(900,clubName.length*27)}" lengthAdjust="spacingAndGlyphs">${club}</text>
      <text x="80" y="1000" fill="#d6e0ef" font-size="38" font-weight="700" font-family="Arial,sans-serif" textLength="${Math.min(900,when.length*23)}" lengthAdjust="spacingAndGlyphs">${day}</text>
      <text x="80" y="1079" fill="${accent}" font-size="68" font-weight="900" font-family="Arial,sans-serif">${svgEscape(time)}</text>
      <rect x="20" y="1100" width="1040" height="230" fill="url(#fade)"/>
      <text x="80" y="1210" fill="${accent}" font-size="48" font-weight="900" font-family="Arial,sans-serif">DEINE ZUSAGE ZÄHLT.</text>
      <text x="80" y="1275" fill="#c0cbe0" font-size="25" font-weight="700" font-family="Arial,sans-serif">Jetzt in strikr zu- oder absagen.</text>
    </svg>`;
  }
  async function loadBrandLogo() {
    try {
      const response = await fetch("/brand/strikr-mark.png");
      if (!response.ok) return "";
      const blob = await response.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch { return ""; }
  }
  async function imageFile() {
    const logoData = await loadBrandLogo();
    const svg = new Blob([buildSvg(logoData)], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(svg);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("Bild konnte nicht erstellt werden")); img.src = objectUrl; });
      const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
      const context = canvas.getContext("2d"); if (!context) throw new Error("Canvas nicht verfügbar");
      context.drawImage(img, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("Export fehlgeschlagen")), "image/png"));
      return new File([blob], `strikr-training-${date}.png`, { type: "image/png" });
    } finally { URL.revokeObjectURL(objectUrl); }
  }
  async function share() {
    setBusy(true); setFeedback("");
    try {
      const file = await imageFile();
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: clubName + " · Training", text: shareText });
      } else if (navigator.share) {
        await navigator.share({ title: clubName + " · Training", text: shareText });
      } else {
        await navigator.clipboard.writeText(shareText);
        setFeedback("Ankündigung mit Trainingslink kopiert.");
      }
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setFeedback("Teilen nicht möglich. Nutze Text + Link kopieren."); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(shareText); setFeedback("Text mit Trainingslink kopiert."); } catch { setFeedback("Kopieren fehlgeschlagen."); }
  }
  return <>
    <button type="button" onClick={() => setExpanded(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-teal-300/40 bg-teal-300/15 px-4 py-3 text-sm font-bold text-teal-100 hover:bg-teal-300/25">
      <Megaphone className="h-4 w-4 text-teal-300"/> Ankündigung teilen
    </button>
    {expanded && typeof document !== "undefined" ? createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setExpanded(false); }}>
        <div role="dialog" aria-modal="true" aria-label="Trainingsankündigung teilen" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-extrabold text-slate-950"><Megaphone className="h-5 w-5 text-teal-600"/> Ankündigung teilen</h2>
            <button type="button" onClick={() => setExpanded(false)} aria-label="Schließen" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5"/></button>
          </div>
          <p className="mt-2 text-sm text-slate-600">Welche Variante möchtest du teilen?</p>
          <div className="mt-4 grid grid-cols-3 gap-2">{(Object.keys(variants) as Tone[]).map(key => <button type="button" key={key} onClick={() => { setTone(key); setFeedback(""); }} aria-pressed={tone === key} className={`rounded-xl px-2 py-3 text-xs font-bold ${tone === key ? "bg-slate-950 text-white" : "border border-slate-200 bg-slate-50 text-slate-700"}`}>{variants[key].label}</button>)}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={share} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"><Share2 className="h-4 w-4"/> Teilen</button>
            <button type="button" onClick={copy} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">Text + Link</button>
          </div>
          {feedback ? <p role="status" className="mt-3 text-xs text-slate-600">{feedback}</p> : null}
        </div>
      </div>, document.body
    ) : null}
  </>;
}
