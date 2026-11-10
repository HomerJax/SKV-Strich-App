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
    const day = svgEscape(fit(when, 34));
    const headline = svgEscape(v.headline);
    const subline = svgEscape(v.subline);
    const title = tone === "motivation" ? "TRAINING." : tone === "reminder" ? "BIST DU DABEI?" : "GAME ON.";
    const mainSize = title.length > 13 ? 87 : 121;
    const logo = logoData ? `<image href="${logoData}" x="798" y="77" width="84" height="84" preserveAspectRatio="xMidYMid meet"/>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs>
        <linearGradient id="top" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0e1c38"/><stop offset="1" stop-color="#172b58"/></linearGradient>
        <linearGradient id="middle" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#1e293b"/><stop offset=".65" stop-color="#0f172a"/><stop offset="1" stop-color="#020617"/></linearGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#020617" stop-opacity="0"/><stop offset="1" stop-color="#020617"/></linearGradient>
      </defs>
      <rect width="1080" height="1350" fill="#020617"/>
      <rect x="20" y="20" width="1040" height="1310" rx="42" fill="#020617" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/>
      <path d="M20 62Q20 20 62 20H1018Q1060 20 1060 62V350H20Z" fill="url(#top)"/>
      <rect x="20" y="350" width="1040" height="980" fill="url(#middle)"/>
      <rect x="56" y="54" width="470" height="118" rx="24" fill="#020617" fill-opacity=".65" stroke="#ffffff" stroke-opacity=".13"/>
      <text x="86" y="102" fill="#ffffff" font-size="24" font-weight="900" font-family="Arial,sans-serif" letter-spacing="2">TRAINING · ${svgEscape(fit(clubName.toUpperCase(),24))}</text>
      <text x="86" y="143" fill="#aabbd6" font-size="21" font-weight="700" font-family="Arial,sans-serif">TRAININGSANKÜNDIGUNG</text>
      <rect x="758" y="54" width="266" height="146" rx="24" fill="#020617" fill-opacity=".65" stroke="#ffffff" stroke-opacity=".13"/>
      ${logo}
      <text x="902" y="117" fill="#ffffff" font-size="34" font-weight="900" font-family="Arial,sans-serif">strikr</text>
      <text x="902" y="146" fill="#b7c6dc" font-size="15" font-weight="700" font-family="Arial,sans-serif">@getstrikr</text>
      <text x="902" y="172" fill="#5de4ba" font-size="16" font-weight="800" font-family="Arial,sans-serif">strikr.team</text>
      <text x="56" y="304" fill="#ffffff" font-size="${mainSize}" font-weight="900" font-family="Arial,sans-serif" letter-spacing="-4" textLength="${Math.min(955,title.length*mainSize*.67)}" lengthAdjust="spacingAndGlyphs">${svgEscape(title)}</text>
      <rect x="20" y="350" width="1040" height="700" fill="url(#middle)"/>
      <text x="540" y="536" text-anchor="middle" fill="#b3c5df" font-size="27" font-weight="900" font-family="Arial,sans-serif" letter-spacing="5">${svgEscape(v.kicker)}</text>
      <text x="540" y="655" text-anchor="middle" fill="#ffffff" font-size="69" font-weight="900" font-family="Arial,sans-serif" textLength="${Math.min(925,v.headline.length*43)}" lengthAdjust="spacingAndGlyphs">${headline}</text>
      <text x="540" y="721" text-anchor="middle" fill="#b8c8df" font-size="29" font-weight="500" font-family="Arial,sans-serif">${subline}</text>
      <rect x="95" y="790" width="890" height="2" fill="#ffffff" opacity=".18"/>
      <text x="540" y="870" text-anchor="middle" fill="#ffffff" font-size="43" font-weight="900" font-family="Arial,sans-serif" textLength="${Math.min(850,clubName.length*27)}" lengthAdjust="spacingAndGlyphs">${club}</text>
      <text x="540" y="940" text-anchor="middle" fill="#e5ebf6" font-size="36" font-weight="700" font-family="Arial,sans-serif" textLength="${Math.min(870,when.length*22)}" lengthAdjust="spacingAndGlyphs">${day}</text>
      <text x="540" y="1015" text-anchor="middle" fill="#5de4ba" font-size="52" font-weight="900" font-family="Arial,sans-serif">${svgEscape(time)}</text>
      <rect x="20" y="1080" width="1040" height="250" fill="url(#fade)"/>
      <text x="74" y="1222" fill="#5de4ba" font-size="61" font-weight="900" font-family="Arial,sans-serif" letter-spacing="-1">DEINE ZUSAGE ZÄHLT.</text>
      <text x="76" y="1285" fill="#b5c3d9" font-size="25" font-weight="700" font-family="Arial,sans-serif">Jetzt in strikr zu- oder absagen.</text>
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
