"use client";

import TeamGeneratorOnboardingFields from "@/components/club-setup/TeamGeneratorOnboardingFields";
import OnboardingExamples from "@/components/club-setup/OnboardingExamples";

import { useState } from "react";
import { ArrowRight, Check, ClipboardCheck, Users, RotateCcw } from "lucide-react";
import ClubSetupClubStep from "@/components/club-setup/ClubSetupClubStep";

type Props = { name: string; categorySetup: React.ReactNode; onDone: () => void };
type SetupStep = "club" | "team" | "categories" | "done";
const ORDER: SetupStep[] = ["club", "team", "categories", "done"];
const LABELS: Record<SetupStep, string> = {
  club: "Team", team: "Fairness", categories: "Gruppen", done: "Fertig",
};

export default function AdminSetupPreview({ name, categorySetup, onDone }: Props) {
  const [step, setStep] = useState<SetupStep>("club");
  const [club, setClub] = useState(name || "Mein neues Team");
  const [strength, setStrength] = useState(true);
  const [categories, setCategories] = useState(false);
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
            <h3 className="text-xl font-black text-slate-950">Faire Teams einrichten</h3>
            <TeamGeneratorOnboardingFields
              useStrength={strength}
              useCategories={categories}
              onStrengthChange={setStrength}
              onCategoriesChange={setCategories}
            />
          </div>
        ) : null}

        {step === "categories" ? (
          <div onSubmitCapture={(event) => { event.preventDefault(); event.stopPropagation(); }} className="space-y-3">
            <p className="text-xs font-bold text-amber-700">Simulation: Eingaben werden nicht gespeichert.</p>
            {categorySetup}
          </div>
        ) : null}

        {step === "done" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700"><ClipboardCheck className="h-6 w-6" /><span className="text-xs font-black uppercase tracking-[.12em]">QA-Setup abgeschlossen</span></div>
            <h3 className="text-2xl font-black text-slate-950">{club} ist als Testzustand vorbereitet.</h3>
            <p className="text-sm leading-6 text-slate-600">In der echten App folgen Einladung und erstes Training. Hier bleiben alle Werte lokal im Simulator.</p>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              Spielerstärken: <strong>{strength ? "Aktiv" : "Inaktiv"}</strong> · Kategorien: <strong>{categories ? "Aktiv" : "Inaktiv"}</strong>
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
        Die Kategorie-Einstellungen werden direkt aus dem echten Onboarding gerendert. Formulare werden im Simulationsmodus vor der Serveraktion abgefangen; Änderungen bleiben nicht gespeichert.
      </div>
    </div>
  );
}
