"use client";

import { useState } from "react";
import ClubSetupClubStep from "@/components/club-setup/ClubSetupClubStep";
import { ArrowRight, CalendarDays, Check, Clock3, Crown, Goal, Layers3, ShieldCheck, Sparkles, Trophy, Users, WandSparkles } from "lucide-react";

type StepId = "club" | "season" | "training" | "rsvp" | "teams" | "categories" | "games" | "pro";
type Props = { stepId: string; completed: boolean; onComplete: () => void; finalStep: boolean };

const fieldClass = "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base font-semibold text-slate-950 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100";
const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function Note({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-cyan-100 bg-cyan-50/70 px-4 py-3 text-sm leading-6 text-slate-700">{children}</p>;
}
function Heading({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div className="mb-5"><p className="text-[10px] font-black uppercase tracking-[.19em] text-cyan-700">{eyebrow}</p><h3 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{children}</p></div>;
}
function Option({ selected, onClick, title, description }: { selected: boolean; onClick: () => void; title: string; description: string }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={"flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition " + (selected ? "border-cyan-400 bg-cyan-50 shadow-[0_8px_24px_rgba(6,182,212,.10)]" : "border-slate-200 bg-white hover:border-slate-300")}>
    <span className={"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border " + (selected ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300")} >{selected ? <Check className="h-3.5 w-3.5"/> : null}</span>
    <span><span className="block text-sm font-black text-slate-950">{title}</span><span className="mt-1 block text-xs leading-5 text-slate-600">{description}</span></span>
  </button>;
}

export default function SetupWizardPreview({ stepId, completed, onComplete, finalStep }: Props) {
  const [seasonName, setSeasonName] = useState("strikr Standardsaison");
  const [customSeason, setCustomSeason] = useState(false);
  const [selectedDays, setSelectedDays] = useState([3]);
  const [startTime, setStartTime] = useState("19:00");
  const [rsvp, setRsvp] = useState("30");
  const [balance, setBalance] = useState(true);
  const [categories, setCategories] = useState(true);
  const [mode, setMode] = useState<"match"|"tournament">("match");
  const [timer, setTimer] = useState(false);
  const [duration, setDuration] = useState(60);
  const step = stepId as StepId;
  return <div className="space-y-5">
    {step === "club" ? <>
      <Heading eyebrow="01 · Euer Verein" title="Gebt eurem Verein ein Gesicht">Hier trägst du den echten Vereinsnamen ein, wählst die Sportart und die Vereinsfarbe und kannst direkt euer Logo auswählen. Die Vorschau reagiert sofort auf deine Eingaben.</Heading>
      <ClubSetupClubStep
        variant="onboarding"
        initialDisplayName=""
        initialPrimaryColor="black"
        initialSportType="football"
        initialLogoUrl={null}
        useNicknames={false}
        redirectTo="/power-user/onboarding-simulator/wizard"
        submitLabel="Speichern und weiter →"
        qaPreview={{ onComplete: () => onComplete() }}
      />
      <p className="rounded-xl bg-cyan-50 px-4 py-3 text-xs leading-5 text-cyan-900">Simulationsmodus: Du kannst auch eine Bilddatei als Logo auswählen und sofort ansehen. Sie wird nicht hochgeladen oder gespeichert. Genau dieselbe Formular-Komponente wird im echten Vereinsstart verwendet.</p>
    </> : null}
    {step === "season" ? <>
      <Heading eyebrow="02 · Die Grundlage für eure Tabelle" title="Erst die Saison – dann eure Trainings">Trainings, Ergebnisse, Statistiken und Auszeichnungen gehören immer zu einer Saison. strikr legt deshalb automatisch eine Jahressaison an.</Heading>
      <div className="relative overflow-hidden rounded-[24px] bg-[#071522] p-5 text-white"><div className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-violet-500/25 blur-3xl"/><div className="relative flex items-center gap-3"><span className="rounded-2xl bg-white/10 p-3"><Trophy className="h-7 w-7 text-cyan-300"/></span><div><div className="text-xs font-bold uppercase tracking-widest text-cyan-300">Automatisch bereit</div><div className="text-xl font-black">{customSeason?seasonName:"strikr Standardsaison"}</div><div className="text-xs text-white/60">Ein Jahr · Alle Ergebnisse an einem Ort</div></div></div></div>
      <Option selected={!customSeason} onClick={()=>setCustomSeason(false)} title="strikr Standardsaison" description="Ein Jahr Laufzeit, kein Aufwand. Auch im Free-Plan verfügbar."/>
      <Option selected={customSeason} onClick={()=>setCustomSeason(true)} title="Eigene Saison anlegen · PRO" description="Name und Zeitraum während der PRO-Testphase selbst festlegen."/>
      {customSeason?<label className="block text-sm font-black text-slate-800">Saisonname<input value={seasonName} onChange={e=>setSeasonName(e.target.value)} className={fieldClass}/></label>:null}
      <Note>Nach Ablauf von PRO bleibt eure Historie erhalten. Die geplante automatische Umstellung individueller Saison-Einstellungen auf den Free-Standard ist noch in Entwicklung.</Note>
    </> : null}
    {step === "training" ? <>
      <Heading eyebrow="03 · Euer Rhythmus" title="Wann kommt ihr zusammen?">Lege fest, an welchen Tagen ihr euch trefft und wann das Training beginnt. Die Termine gehören zur eben festgelegten Saison.</Heading>
      <div className="rounded-[24px] border border-slate-200 bg-white p-5"><div className="flex items-center gap-2 text-sm font-black text-slate-950"><CalendarDays className="h-5 w-5 text-cyan-700"/> Eure Trainingstage</div><div className="mt-4 grid grid-cols-7 gap-1.5">{days.map((d,i)=><button key={d} type="button" aria-pressed={selectedDays.includes(i)} onClick={()=>setSelectedDays(old=>old.includes(i)?old.filter(x=>x!==i):[...old,i].sort())} className={"flex h-11 items-center justify-center rounded-xl border text-xs font-black "+(selectedDays.includes(i)?"border-cyan-400 bg-cyan-500 text-slate-950":"border-slate-200 bg-slate-50 text-slate-600")}>{d}</button>)}</div><label className="mt-5 block text-sm font-black text-slate-800">Beginn<Clock3 className="ml-2 inline h-4 w-4 text-cyan-600"/><input type="time" value={startTime} onChange={e=>setStartTime(e.target.value)} className={fieldClass}/></label></div>
      <div className="rounded-2xl bg-[#071522] p-4 text-white"><div className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">Euer Wochenplan</div><p className="mt-2 text-lg font-black">{selectedDays.length?selectedDays.map(i=>days[i]).join(" · "):"Noch kein Tag gewählt"} <span className="text-cyan-300">{startTime}</span></p><p className="mt-1 text-xs text-white/60">Alle Termine werden der aktuellen Saison zugeordnet.</p></div>
      <Note>PRO bietet mehr Flexibilität bei Trainingstagen. Die automatische Rücksetzung beim Wechsel zu Free ist noch ein offener Entwicklungsauftrag.</Note>
    </> : null}
    {step === "rsvp" ? <>
      <Heading eyebrow="04 · Alle Rückmeldungen im Blick" title="Wer ist dabei?">Statt Nachrichten-Chaos seht ihr frühzeitig, wer kommt. Die Frist bestimmt, wie lange Spieler ihre Rückmeldung ändern können.</Heading>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-[22px] bg-emerald-50 p-4"><div className="text-2xl font-black text-emerald-800">12</div><div className="text-xs font-bold text-emerald-800">Zusagen</div></div><div className="rounded-[22px] bg-rose-50 p-4"><div className="text-2xl font-black text-rose-800">3</div><div className="text-xs font-bold text-rose-800">Absagen</div></div></div>
      <label className="block text-sm font-black text-slate-800">Rückmeldefrist vor Beginn<select value={rsvp} onChange={e=>setRsvp(e.target.value)} className={fieldClass}><option value="30">30 Minuten · Free-Standard</option><option value="60">60 Minuten · PRO</option><option value="120">2 Stunden · PRO</option><option value="1440">24 Stunden · PRO</option></select></label>
      <Note>Free: 30 Minuten fest. Mit PRO könnt ihr die Frist ändern und einen Absagegrund verlangen. Nach PRO-Ende gilt wieder die feste Free-Frist – automatische Rücksetzung noch in Vorbereitung.</Note>
    </> : null}
    {step === "teams" ? <>
      <Heading eyebrow="05 · Das Herzstück von strikr" title="Zwei Teams. Ein faires Spiel.">Der Teamgenerator verteilt die anwesenden Spieler automatisch. Mit Stärken und Kategorien berücksichtigt er mehr als nur die Anzahl.</Heading>
      <div className="grid grid-cols-2 gap-3">{[["TEAM CYAN","Alex 5 · Sam 3 · Kim 2","10","#0891b2"],["TEAM NAVY","Jo 4 · Robin 4 · Pat 2","10","#1e293b"]].map(([name,players,score,hex])=><div key={name} className="rounded-[22px] border border-slate-200 bg-white p-4 shadow-sm"><span className="block h-1.5 w-12 rounded-full" style={{background:hex}}/><p className="mt-3 text-xs font-black tracking-widest text-slate-700">{name}</p><p className="mt-3 text-xs leading-6 text-slate-600">{players}</p><div className="mt-4 text-2xl font-black text-slate-950">{score}<span className="ml-1 text-[10px] font-medium text-slate-500">Punkte</span></div></div>)}</div>
      <div className="flex items-center justify-center gap-2 text-sm font-black text-emerald-700"><ShieldCheck className="h-5 w-5"/> Gleiche Teamstärke</div>
      <Option selected={balance} onClick={()=>setBalance(true)} title="Mit Spielstärken ausgleichen" description="Stärken fließen in die automatische Einteilung ein."/><Option selected={!balance} onClick={()=>setBalance(false)} title="Nur gleich große Teams" description="Schnell und unkompliziert, ohne Stärkegewichtung."/>
    </> : null}
    {step === "categories" ? <>
      <Heading eyebrow="06 · Spieler passend verteilen" title="Welche Rollen gibt es bei euch?">Zum Beispiel Torhüter und Feldspieler: Mit Kategorien bekommt jedes Team eine sinnvollere Mischung.</Heading>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-[22px] border border-cyan-200 bg-cyan-50 p-4"><Goal className="h-6 w-6 text-cyan-700"/><div className="mt-3 font-black text-slate-950">Torhüter</div><div className="mt-1 text-xs text-slate-600">Auf beide Teams verteilen</div></div><div className="rounded-[22px] border border-violet-200 bg-violet-50 p-4"><Users className="h-6 w-6 text-violet-700"/><div className="mt-3 font-black text-slate-950">Feldspieler</div><div className="mt-1 text-xs text-slate-600">Ausgewogen ergänzen</div></div></div>
      <Option selected={categories} onClick={()=>setCategories(true)} title="Kategorien verwenden" description="Empfohlen, wenn Spieler unterschiedliche Positionen oder Rollen haben."/><Option selected={!categories} onClick={()=>setCategories(false)} title="Ohne Kategorien starten" description="Du kannst Kategorien später jederzeit einrichten."/>
      <Note>Im Free-Plan sind bis zu zwei aktive Kategorien möglich. Weitere Kategorien gibt es mit PRO.</Note>
    </> : null}
    {step === "games" ? <>
      <Heading eyebrow="07 · Euer Spiel, eure Regeln" title="Wie wollt ihr spielen?">Ein normales Trainingsspiel ist der Standard. Turniere mit mehreren Teams sind eine PRO-Funktion.</Heading>
      <Option selected={mode==="match"} onClick={()=>setMode("match")} title="Einzelnes Spiel · Standard" description="Zwei Teams, ein Ergebnis – perfekt für die wöchentliche Runde."/>
      <Option selected={mode==="tournament"} onClick={()=>setMode("tournament")} title="Turniermodus · PRO" description="Drei oder vier Teams spielen in einem kleinen Turnier gegeneinander."/>
      <div className="rounded-[22px] border border-slate-200 bg-white p-4"><label className="flex items-center justify-between gap-3"><span><span className="block text-sm font-black text-slate-950">Spieluhr nutzen?</span><span className="mt-1 block text-xs text-slate-600">Ohne Uhr könnt ihr Spiele einfach manuell abschließen.</span></span><input type="checkbox" checked={timer} onChange={e=>setTimer(e.target.checked)} className="h-5 w-5 accent-cyan-600"/></label>{timer?<label className="mt-4 block text-sm font-black text-slate-800">Dauer (Minuten)<input type="number" min="1" max="300" value={duration} onChange={e=>setDuration(Number(e.target.value))} className={fieldClass}/></label>:null}</div>
      <Note>Die Auswahl wird hier nur demonstriert. Das Speichern des Spielmodus als globalen Vereinsstandard wird im echten Setup noch ergänzt.</Note>
    </> : null}
    {step === "pro" ? <>
      <Heading eyebrow="08 · Bereit für euren Anpfiff" title="Startet mit allen Möglichkeiten">Neue Vereine erhalten zum Start 28 Tage PRO zum Ausprobieren. Danach entscheidet ihr, ob ihr PRO behalten oder Free nutzen möchtet.</Heading>
      <div className="relative overflow-hidden rounded-[26px] bg-[#071522] p-6 text-white"><div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-violet-600/30 blur-3xl"/><div className="relative"><Crown className="h-8 w-8 text-violet-300"/><div className="mt-3 text-[10px] font-black uppercase tracking-widest text-cyan-300">Euer Startvorteil</div><div className="mt-2 text-3xl font-black">28 Tage PRO</div><p className="mt-2 text-sm leading-6 text-white/70">Flexible Fristen, mehr Kategorien, Turniermodus und zusätzliche Möglichkeiten für eure Gruppe.</p></div></div>
      <div className="space-y-3">{["Automatische Jahressaison und feste Frist bleiben in Free","Individuelle Saisonzeiträume und flexible Fristen benötigen PRO","Mehr Spielmodi und erweiterte Teamoptionen mit PRO","Eure bestehenden Ergebnisse und Statistiken sollen erhalten bleiben"].map(s=><div key={s} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><Check className="mt-1 h-4 w-4 shrink-0 text-cyan-700"/>{s}</div>)}</div>
      <Note>Dies ist eine Vorschau. Die tatsächlichen 28 Tage und das genaue Ablaufdatum ergeben sich aus dem jeweiligen Vereinsabo. Die technischen Downgrade-Rücksetzungen stehen noch im Backlog.</Note>
    </> : null}
    {step !== "club" ? <div className="border-t border-slate-100 pt-5">
      {completed?<div role="status" className="mb-3 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"><Check className="h-5 w-5"/> Im Test durchlaufen</div>:null}
      <button type="button" disabled={step==="training"&&!selectedDays.length} onClick={onComplete} className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-[#071522] px-5 py-4 text-left text-white shadow-[0_12px_32px_rgba(2,6,23,.18)] transition hover:bg-[#10283d] disabled:cursor-not-allowed disabled:opacity-40">
        <span><span className="block text-[10px] font-black uppercase tracking-[.14em] text-cyan-300">{finalStep?"Fast geschafft":"Nächster Schritt"}</span><span className="mt-0.5 block text-base font-black">{finalStep?"Simulation abschließen":"Speichern und weiter"}</span></span><ArrowRight className="h-5 w-5 transition group-hover:translate-x-1"/>
      </button>
      <p className="mt-3 text-center text-xs text-slate-500">Power-User-Vorschau · Alle Eingaben bleiben lokal und werden nicht gespeichert.</p>
    </div> : null}
  </div>;
}
