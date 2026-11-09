"use client";

import { useState } from "react";
import { ArrowRight, Check, ClipboardCheck, RotateCcw, Users } from "lucide-react";
import ClubSetupClubStep from "@/components/club-setup/ClubSetupClubStep";

type Props = { name: string; onDone: () => void };
type SetupStep = "club" | "team" | "categories" | "training" | "done";
const ORDER: SetupStep[] = ["club", "team", "categories", "training", "done"];
const LABELS: Record<SetupStep, string> = {
  club: "Team", team: "Fairness", categories: "Gruppen", training: "Training", done: "Fertig",
};

export default function AdminSetupPreview({ name, onDone }: Props) {
  const [step, setStep] = useState<SetupStep>("club");
  const [club, setClub] = useState(name || "Mein neues Team");
  const [strength, setStrength] = useState(true);
  const [groups, setGroups] = useState(false);
  const [categories, setCategories] = useState(false);
  const [example, setExample] = useState<"team" | "categories" | null>(null);
  const [recurring, setRecurring] = useState(true);
  const [season, setSeason] = useState(false);
  const [sport, setSport] = useState("football");
  const [color, setColor] = useState("black");
  const index = ORDER.indexOf(step);

  function moveNext() { setStep(ORDER[Math.min(index + 1, ORDER.length - 1)]); }
  function movePrevious() { setStep(ORDER[Math.max(index - 1, 0)]); }

  return (
    <div className="space-y-3 bg-[#f5f7fb] p-2 sm:p-5">
      <div className="rounded-2xl bg-[#070b12] px-4 py-4 text-white">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black tracking-[.16em] text-cyan-300">STRIKR <span className="text-white/40">/ EINRICHTUNG</span></span>
          <span className="text-xs font-bold text-white/70">Schritt {index + 1} von {ORDER.length}</span>
        </div>
        <div className="mt-3 flex gap-1.5" aria-label={`Schritt ${index + 1} von ${ORDER.length}`}>
          {ORDER.map((key, i) => <div key={key} className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-cyan-300" : "bg-white/20"}`} />)}
        </div>
        <p className="mt-2 text-xs text-white/60">{LABELS[step]} · Alles lässt sich später ändern.</p>
      </div>

      <div className="rounded-[22px] border border-slate-200 bg-white p-4 sm:p-5">
        {step === "club" ? (
          <>
            <div className="mb-3 text-xs text-slate-500">
              Testmodus · Keine Daten werden gespeichert.
            </div>
            <h3 className="mb-4 text-xl font-black text-slate-950">Verein einrichten</h3>
            <ClubSetupClubStep
              variant="onboarding"
              redirectTo="/club-setup?created=1&step=team"
              initialDisplayName={club}
              initialPrimaryColor={color}
              initialSportType={sport}
              initialLogoUrl={null}
              useNicknames={false}
              qaPreview={{ onComplete: (value) => {
                setClub(value.name);
                setSport(value.sportType);
                setColor(value.primaryColor);
                moveNext();
              }}}
            />
          </>
        ) : null}

        {step === "team" ? (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-950">Faire Teams – ganz einfach</h3>
            <p className="text-sm leading-6 text-slate-600">strikr teilt eure anwesenden Spieler in möglichst ausgeglichene Teams ein. Du entscheidest, welche Informationen dabei helfen sollen.</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" checked={strength} onChange={e => setStrength(e.target.checked)} className="mt-1 h-5 w-5 accent-cyan-600"/>
              <span><strong className="block text-sm text-slate-950">Spielstärke berücksichtigen</strong><span className="text-xs text-slate-600">Du kannst Spielern später eine Stärke von 1–5 geben. strikr verteilt stärkere und schwächere Spieler möglichst fair.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" checked={groups} onChange={e => setGroups(e.target.checked)} className="mt-1 h-5 w-5 accent-cyan-600"/>
              <span><strong className="block text-sm text-slate-950">Spielergruppen ausgleichen (optional)</strong><span className="text-xs text-slate-600">Beispiel: Torhüter oder besonders erfahrene Spieler sollen nicht alle im selben Team landen.</span></span>
            </label>
            <button type="button" onClick={() => setExample(example === "team" ? null : "team")} className="text-sm font-bold text-cyan-700 underline underline-offset-4">{example === "team" ? "Beispiel schließen" : "Beispiel-Einteilung ansehen"}</button>
            {example === "team" && <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-cyan-50 p-3"><strong>Team Cyan</strong><p className="mt-2">Alex · Stärke 5</p><p>Sam · Stärke 3</p><p>Kim · Stärke 2</p><p className="mt-2 font-bold">Summe: 10</p></div>
              <div className="rounded-xl bg-slate-100 p-3"><strong>Team Navy</strong><p className="mt-2">Jo · Stärke 4</p><p>Robin · Stärke 4</p><p>Pat · Stärke 2</p><p className="mt-2 font-bold">Summe: 10</p></div>
              <p className="col-span-2 text-xs text-slate-500">Nur ein Beispiel – die echte Einteilung berücksichtigt weitere Faktoren.</p>
            </div>}
          </div>
        ) : null}

        {step === "categories" ? (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-950">Spielt ihr in mehreren Gruppen?</h3>
            <p className="text-sm leading-6 text-slate-600">Kategorien helfen, Spieler zu unterscheiden – etwa AH und Ü32. Wenn ihr nur eine Gruppe habt, brauchst du das zunächst nicht.</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-slate-900">
              <input type="checkbox" checked={categories} onChange={e => setCategories(e.target.checked)} className="h-5 w-5 accent-cyan-600"/>
              Kategorien verwenden
            </label>
            <button type="button" onClick={() => setExample(example === "categories" ? null : "categories")} className="text-sm font-bold text-cyan-700 underline underline-offset-4">{example === "categories" ? "Beispiel schließen" : "Beispiel AH / Ü32 ansehen"}</button>
            {example === "categories" && <div className="grid grid-cols-2 gap-2 text-sm"><div className="rounded-xl bg-cyan-50 p-3"><strong>AH</strong><p className="mt-1 text-xs">Alex, Sam, Kim</p></div><div className="rounded-xl bg-slate-100 p-3"><strong>Ü32</strong><p className="mt-1 text-xs">Jo, Robin, Pat</p></div><p className="col-span-2 text-xs text-slate-500">So kannst du Spielergruppen gezielt verwalten. Namen und Zuordnung lassen sich später ändern.</p></div>}
          </div>
        ) : null}

        {step === "training" ? (
          <div className="space-y-4">
            <h3 className="text-xl font-black text-slate-950">Bereit für euer erstes Training?</h3>
            <p className="text-sm leading-6 text-slate-600">Du kannst direkt loslegen oder die Planung später in strikr erledigen. Hier wird noch nichts gespeichert.</p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" checked={recurring} onChange={e => setRecurring(e.target.checked)} className="mt-1 h-5 w-5 accent-cyan-600"/>
              <span><strong className="block text-sm">Wiederkehrende Trainingsserie</strong><span className="text-xs text-slate-600">Zum Beispiel jeden Donnerstag um 20 Uhr – statt jede Woche einen Termin anzulegen.</span></span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input type="checkbox" checked={season} onChange={e => setSeason(e.target.checked)} className="mt-1 h-5 w-5 accent-cyan-600"/>
              <span><strong className="block text-sm">Saison anlegen (optional)</strong><span className="text-xs text-slate-600">Zum Beispiel Saison 2026/27 – für Ergebnisse und Statistiken innerhalb eines Zeitraums.</span></span>
            </label>
            <p className="text-xs text-slate-500">Beide Einstellungen kannst du später hinzufügen oder ändern.</p>
          </div>
        ) : null}

        {step === "done" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700"><ClipboardCheck className="h-6 w-6" /><span className="text-xs font-black uppercase tracking-[.12em]">QA-Setup abgeschlossen</span></div>
            <h3 className="text-2xl font-black text-slate-950">{club} ist als Testzustand vorbereitet.</h3>
            <p className="text-sm leading-6 text-slate-600">In der echten App folgen Einladung und erstes Training. Hier bleiben alle Werte lokal im Simulator.</p>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              Spielerstärken: <strong>{strength ? "Aktiv" : "Inaktiv"}</strong> · Spielergruppen: <strong>{groups ? "Aktiv" : "Inaktiv"}</strong> · Kategorien: <strong>{categories ? "Aktiv" : "Inaktiv"}</strong> · Trainingsserie: <strong>{recurring ? "Ja" : "Nein"}</strong> · Saison: <strong>{season ? "Ja" : "Nein"}</strong>
            </div>
            <button type="button" onClick={onDone} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white">
              <Users className="h-4 w-4"/> Ersten Vereinseinstieg ansehen <ArrowRight className="h-4 w-4"/>
            </button>
          </div>
        ) : null}

        {step !== "club" && step !== "done" ? <div className="mt-7 flex justify-between gap-3 border-t border-slate-100 pt-5">
          <button type="button" onClick={movePrevious} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">Zurück</button>
          <button type="button" onClick={moveNext} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">Weiter <ArrowRight className="h-4 w-4"/></button>
        </div> : null}
      </div>
      <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
        <RotateCcw className="mt-0.5 h-4 w-4 shrink-0"/>
        Nur der erste Club-Setup-Schritt nutzt bereits die echte Produktkomponente. Team-/Kategorienansichten sind bis zum vollständigen Staging-Test bewusst als vereinfachte Vorschau gekennzeichnet.
      </div>
    </div>
  );
}
