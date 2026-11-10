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

  function buildSvg() {
    const club = svgEscape(fit(clubName, 32));
    const day = svgEscape(fit(when, 34));
    const headline = svgEscape(v.headline);
    const subline = svgEscape(v.subline);
    const fontSize = v.headline.length > 18 ? 76 : 100;
    const dateParts = when.split(", ");
    const dateLarge = svgEscape(dateParts[1] || when);
    const dateSmall = svgEscape(dateParts[0] || "TRAINING");
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#020617"/><stop offset=".58" stop-color="#101c48"/><stop offset="1" stop-color="#28206b"/></linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5cf0ca"/><stop offset="1" stop-color="#40c4ee"/></linearGradient>
        <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1d3678"/><stop offset="1" stop-color="#28246e"/></linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="#020617"/>
      <rect x="24" y="24" width="1032" height="1302" rx="44" fill="url(#bg)" stroke="#ffffff" stroke-opacity=".15" stroke-width="2"/>
      <circle cx="1030" cy="430" r="410" fill="#5e5ce6" opacity=".12"/>
      <path d="M-40 1010 L1140 690 M-40 1080 L1140 760 M-40 1150 L1140 830" stroke="#ffffff" stroke-opacity=".055" stroke-width="3"/>
      <g opacity=".16" fill="none" stroke="#9bafff" stroke-width="5"><circle cx="875" cy="555" r="250"/><circle cx="875" cy="555" r="160"/><path d="M620 555H1080 M875 300V810"/></g>
      <rect x="78" y="80" width="116" height="116" rx="27" fill="#050914" stroke="#ffffff" stroke-opacity=".17" stroke-width="2"/>
      <g stroke="#ffffff" stroke-width="9" stroke-linecap="round"><path d="M110 110L105 164 M131 106L126 160 M152 105L147 157 M173 105L168 156 M99 128L182 118 M96 151L179 140"/></g>
      <text x="218" y="151" fill="#ffffff" font-size="67" font-weight="900" font-family="Arial,sans-serif" letter-spacing="-4">strikr</text>
      <text x="82" y="245" fill="#6df3d6" font-size="24" font-weight="900" font-family="Arial,sans-serif" letter-spacing="7">TEAM TRAINING. REDEFINED.</text>
      <rect x="82" y="292" width="916" height="3" fill="#ffffff" opacity=".18"/>
      <text x="82" y="375" fill="#6df3d6" font-size="28" font-weight="900" font-family="Arial,sans-serif" letter-spacing="5">${svgEscape(v.kicker)}</text>
      <text x="76" y="515" fill="#ffffff" font-size="${fontSize}" font-weight="900" font-family="Arial,sans-serif" letter-spacing="-3" textLength="${Math.min(924,v.headline.length*fontSize*.65)}" lengthAdjust="spacingAndGlyphs">${headline}</text>
      <rect x="82" y="557" width="128" height="11" rx="5" fill="url(#accent)"/>
      <text x="82" y="638" fill="#d7defa" font-size="31" font-weight="500" font-family="Arial,sans-serif">${subline}</text>
      <rect x="78" y="715" width="924" height="415" rx="35" fill="url(#panel)" stroke="#ffffff" stroke-opacity=".22" stroke-width="2"/>
      <rect x="78" y="715" width="13" height="415" rx="6" fill="url(#accent)"/>
      <text x="126" y="783" fill="#7ef4df" font-size="25" font-weight="900" font-family="Arial,sans-serif" letter-spacing="4">NÄCHSTES TRAINING</text>
      <text x="126" y="856" fill="#ffffff" font-size="43" font-weight="900" font-family="Arial,sans-serif" textLength="${Math.min(806,clubName.length*26)}" lengthAdjust="spacingAndGlyphs">${club}</text>
      <text x="126" y="924" fill="#d8e4ff" font-size="29" font-weight="800" font-family="Arial,sans-serif" letter-spacing="2">${dateSmall.toUpperCase()}</text>
      <text x="126" y="984" fill="#ffffff" font-size="45" font-weight="900" font-family="Arial,sans-serif" textLength="${Math.min(800,dateLarge.length*27)}" lengthAdjust="spacingAndGlyphs">${dateLarge}</text>
      <rect x="126" y="1021" width="330" height="70" rx="19" fill="#6df3d6"/>
      <text x="291" y="1067" text-anchor="middle" fill="#07152b" font-size="33" font-weight="900" font-family="Arial,sans-serif">${svgEscape(time)}</text>
      <text x="82" y="1215" fill="#ffffff" font-size="31" font-weight="900" font-family="Arial,sans-serif">DEINE ZUSAGE ZÄHLT.</text>
      <text x="82" y="1266" fill="#a7b6d9" font-size="24" font-weight="700" font-family="Arial,sans-serif">strikr.team</text>
      <text x="996" y="1266" text-anchor="end" fill="#a7b6d9" font-size="24" font-weight="700" font-family="Arial,sans-serif">@getstrikr</text>
    </svg>`;
  }
  async function imageFile() {
    const svg = new Blob([buildSvg()], { type: "image/svg+xml;charset=utf-8" });
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
            <button type="button" disabled={busy} onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800 disabled:opacity-50"><Download className="h-4 w-4"/> Bild speichern</button>
            <button type="button" onClick={copy} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-800">Text + Link</button>
          </div>
          {feedback ? <p role="status" className="mt-3 text-xs text-slate-600">{feedback}</p> : null}
        </div>
      </div>, document.body
    ) : null}
  </>;
}
