"use client";

import { useState } from "react";
import { Download, Megaphone, Share2 } from "lucide-react";

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
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const v = variants[tone];
  const when = displayDate(date);
  const time = startTime ? startTime.slice(0, 5) + " Uhr" : "Uhrzeit siehe Training";
  const url = typeof window === "undefined" ? "https://strikr.team/sessions/" + sessionId : window.location.origin + "/sessions/" + sessionId;
  const shareText = v.text + "\n\n" + clubName + "\n" + when + " · " + time + "\n\nHier zu- oder absagen: " + url;

  function buildSvg() {
    const club = svgEscape(fit(clubName, 38));
    const day = svgEscape(fit(when, 38));
    const headline = svgEscape(v.headline);
    const subline = svgEscape(v.subline);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#061827"/><stop offset=".65" stop-color="#0c2b3c"/><stop offset="1" stop-color="#063f48"/></linearGradient><linearGradient id="line" x1="0" x2="1"><stop stop-color="#2ee6df"/><stop offset="1" stop-color="#82f6c4"/></linearGradient></defs>
      <rect width="1080" height="1350" fill="url(#bg)"/>
      <circle cx="1030" cy="180" r="380" fill="#14b8a6" opacity=".08"/><circle cx="-90" cy="1110" r="420" fill="#22d3ee" opacity=".06"/>
      <path d="M0 330 L1080 100 M0 720 L1080 490 M0 1110 L1080 880" stroke="#ffffff" opacity=".035" stroke-width="3"/>
      <rect x="70" y="70" width="940" height="1210" rx="44" fill="none" stroke="#ffffff" stroke-opacity=".19" stroke-width="3"/>
      <text x="125" y="178" fill="#ffffff" font-size="73" font-weight="900" font-family="Arial, sans-serif" letter-spacing="-4">strikr<tspan fill="#3ce3d8">.</tspan></text>
      <rect x="125" y="240" width="830" height="3" fill="url(#line)"/>
      <text x="125" y="330" fill="#63e5da" font-size="28" font-weight="800" font-family="Arial, sans-serif" letter-spacing="6">${svgEscape(v.kicker)}</text>
      <text x="125" y="455" fill="#ffffff" font-size="72" font-weight="900" font-family="Arial, sans-serif">${headline}</text>
      <text x="125" y="524" fill="#a9c9d1" font-size="31" font-weight="500" font-family="Arial, sans-serif">${subline}</text>
      <rect x="125" y="620" width="830" height="365" rx="35" fill="#ffffff" fill-opacity=".09" stroke="#ffffff" stroke-opacity=".14" stroke-width="2"/>
      <text x="170" y="698" fill="#63e5da" font-size="25" font-weight="800" font-family="Arial, sans-serif" letter-spacing="3">DEIN NÄCHSTES TRAINING</text>
      <text x="170" y="774" fill="#ffffff" font-size="38" font-weight="800" font-family="Arial, sans-serif">${club}</text>
      <text x="170" y="852" fill="#ffffff" font-size="35" font-weight="600" font-family="Arial, sans-serif">${day}</text>
      <text x="170" y="924" fill="#ffffff" font-size="35" font-weight="600" font-family="Arial, sans-serif">${svgEscape(time)}</text>
      <rect x="125" y="1040" width="830" height="104" rx="25" fill="#38dfd3"/>
      <text x="540" y="1106" text-anchor="middle" fill="#062b38" font-size="35" font-weight="900" font-family="Arial, sans-serif">JETZT ZU- ODER ABSAGEN</text>
      <text x="540" y="1205" text-anchor="middle" fill="#a9c9d1" font-size="29" font-family="Arial, sans-serif">strikr.team · Deine Mannschaft. Dein Training.</text>
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
  async function download() {
    setBusy(true); setFeedback("");
    try { const file = await imageFile(); const u = URL.createObjectURL(file); const a = document.createElement("a"); a.href = u; a.download = file.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000); setFeedback("Karte gespeichert. Den Anmeldelink kannst du zusätzlich kopieren."); }
    catch { setFeedback("Bild konnte nicht erstellt werden. Bitte erneut versuchen."); } finally { setBusy(false); }
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
    } catch (e) { if (!(e instanceof DOMException && e.name === "AbortError")) setFeedback("Teilen nicht möglich. Nutze Bild speichern oder Link kopieren."); } finally { setBusy(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(shareText); setFeedback("Text mit Trainingslink kopiert."); } catch { setFeedback("Kopieren fehlgeschlagen."); }
  }
  return <section className="mx-auto mt-4 w-full max-w-5xl px-4">
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-teal-600"/><h2 className="text-lg font-black text-slate-950">Trainingsankündigung teilen</h2></div>
      <p className="mt-1 text-sm text-slate-600">Eine strikr-Card für eure WhatsApp-Gruppe. Ohne Push oder In-App-Nachricht.</p>
      <div className="mt-4 flex flex-wrap gap-2">{(Object.keys(variants) as Tone[]).map(key => <button type="button" key={key} onClick={() => { setTone(key); setFeedback(""); }} aria-pressed={tone===key} className={`rounded-xl px-4 py-2 text-sm font-bold ${tone===key?"bg-slate-950 text-white":"border border-slate-200 bg-slate-50 text-slate-700"}`}>{variants[key].label}</button>)}</div>
      <div className="mt-4 max-w-md overflow-hidden rounded-[26px] bg-gradient-to-br from-[#061827] via-[#0c2b3c] to-[#063f48] p-5 text-white shadow-lg">
        <div className="text-3xl font-black tracking-tighter">strikr<span className="text-teal-300">.</span></div>
        <div className="mt-4 h-0.5 bg-teal-300"/>
        <div className="mt-5 text-[10px] font-black uppercase tracking-[.24em] text-teal-300">{v.kicker}</div>
        <div className="mt-2 text-2xl font-black">{v.headline}</div>
        <p className="mt-1 text-sm text-slate-300">{v.subline}</p>
        <div className="mt-5 space-y-2 rounded-2xl border border-white/15 bg-white/10 p-4"><div className="text-[10px] font-black uppercase tracking-widest text-teal-300">Dein nächstes Training</div><div className="font-bold">{clubName}</div><div className="text-sm">{when}</div><div className="text-sm">{time}</div></div>
        <div className="mt-5 rounded-xl bg-teal-300 px-3 py-3 text-center text-sm font-black text-slate-950">JETZT ZU- ODER ABSAGEN</div>
        <div className="mt-4 text-center text-[11px] text-slate-300">strikr.team · Deine Mannschaft. Dein Training.</div>
      </div>
      <p className="mt-3 text-xs text-slate-500">Der Link zur Zu-/Absage wird beim Teilen im Nachrichtentext mitgegeben; die Bildkarte selbst ist nicht anklickbar.</p>
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={share} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><Share2 className="h-4 w-4"/> Teilen</button><button disabled={busy} onClick={download} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800 disabled:opacity-50"><Download className="h-4 w-4"/> Bild speichern</button><button onClick={copy} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold text-slate-800">Text + Link kopieren</button></div>
      {feedback?<p role="status" className="mt-3 text-sm text-slate-700">{feedback}</p>:null}
    </div>
  </section>;
}
