"use client";

import { useState } from "react";
import { ArrowRight, Check, Circle, ClipboardCheck, RotateCcw, Users } from "lucide-react";
import ClubSetupClubStep from "@/components/club-setup/ClubSetupClubStep";

type Props = { name: string; onDone: () => void };
type SetupStep = "club" | "team" | "categories" | "done";
const ORDER: SetupStep[] = ["club", "team", "categories", "done"];
const LABELS: Record<SetupStep, string> = {
  club: "Verein", team: "Team-Balance", categories: "Kategorien", done: "Fertig",
};

export default function AdminSetupPreview({ name, onDone }: Props) {
  const [step, setStep] = useState<SetupStep>("club");
  const [club, setClub] = useState(name || "Mein neues Team");
  const [strength, setStrength] = useState(true);
  const [groups, setGroups] = useState(false);
  const [categories, setCategories] = useState(true);
  const [sport, setSport] = useState("football");
  const [color, setColor] = useState("black");
  const index = ORDER.indexOf(step);

  function moveNext() { setStep(ORDER[Math.min(index + 1, ORDER.length - 1)]); }
  function movePrevious() { setStep(ORDER[Math.max(index - 1, 0)]); }

  return (
    <div className="space-y-5 bg-[#f5f7fb] p-3 sm:p-6">
      <div className="relative overflow-hidden rounded-[28px] bg-[#070b12] p-5 text-white sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-300">strikr setup · QA</div>
            <h2 className="mt-2 text-xl font-black sm:text-2xl">{club}</h2>
          </div>
          <div className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">{index + 1}/{ORDER.length}</div>
        </div>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {ORDER.map((key, stepIndex) => (
            <div key={key} className="min-w-0">
              <div className={`h-1.5 rounded-full ${stepIndex <= index ? "bg-cyan-300" : "bg-white/20"}`}/>
              <span className="mt-2 flex items-center gap-1 truncate text-[10px] font-bold text-white/70">
                {stepIndex < index ? <Check className="h-3 w-3 shrink-0"/> : <Circle className="h-2.5 w-2.5 shrink-0"/>}
                {LABELS[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-6">
        {step === "club" ? (
          <>
            <div className="mb-4 rounded-xl border border-cyan-200 bg-cyan-50 p-3 text-xs font-semibold text-cyan-900">
              Echte Club-Einstellungen aus strikr – Speichern in dieser QA-Vorschau deaktiviert.
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
            <div className="text-xs font-black uppercase tracking-[.14em] text-violet-700">QA-Ablaufmodell · Einstellungen werden nicht gespeichert</div>
            <h3 className="text-2xl font-black text-slate-950">Faire Teams vorbereiten</h3>
            <p className="text-sm leading-6 text-slate-600">Hier prüfst du, ob ein neuer Vereinsleiter die Optionen versteht. Das ist noch keine echte Interaktion mit den produktiven Teamgenerator-Einstellungen.</p>
            {[
              {label: "Spielerstärken verwenden", value: strength, change: setStrength, description: "Spielstärken berücksichtigen, damit die Teams möglichst ausgeglichen sind"},
              {label: "Balanced Groups verwenden", value: groups, change: setGroups, description: "Bestimmte Spielergruppen möglichst gleichmäßig verteilen"},
            ].map(item => (
              <label key={item.label} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input type="checkbox" checked={item.value} onChange={e => item.change(e.target.checked)} className="mt-1 h-5 w-5 accent-slate-950"/>
                <span className="min-w-0"><strong className="block text-sm text-slate-950">{item.label}</strong><span className="mt-1 block text-xs leading-5 text-slate-600">{item.description}</span></span>
              </label>
            ))}
          </div>
        ) : null}

        {step === "categories" ? (
          <div className="space-y-4">
            <div className="text-xs font-black uppercase tracking-[.14em] text-violet-700">QA-Ablaufmodell · Keine Datenbankänderungen</div>
            <h3 className="text-2xl font-black text-slate-950">Kategorien verwalten</h3>
            <p className="text-sm leading-6 text-slate-600">Das ist eine vereinfachte Vorschau des Schritts. Die tatsächliche Kategorien-Einstellung wird erst bei einem isolierten Rollentest geprüft.</p>
            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold">
              <input type="checkbox" checked={categories} onChange={e => setCategories(e.target.checked)} className="h-5 w-5 accent-slate-950"/>
              Kategorien für meine Mannschaft aktivieren
            </label>
            {categories ? <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm font-black text-cyan-900">Kategorie 1</div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm font-black text-slate-950">Kategorie 2</div>
            </div> : null}
          </div>
        ) : null}

        {step === "done" ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-emerald-700"><ClipboardCheck className="h-6 w-6" /><span className="text-xs font-black uppercase tracking-[.12em]">QA-Setup abgeschlossen</span></div>
            <h3 className="text-2xl font-black text-slate-950">{club} ist als Testzustand vorbereitet.</h3>
            <p className="text-sm leading-6 text-slate-600">In der echten App folgen Einladung und erstes Training. Hier bleiben alle Werte lokal im Simulator.</p>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
              Spielerstärken: <strong>{strength ? "Aktiv" : "Inaktiv"}</strong> · Balanced Groups: <strong>{groups ? "Aktiv" : "Inaktiv"}</strong> · Kategorien: <strong>{categories ? "Aktiv" : "Inaktiv"}</strong>
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
