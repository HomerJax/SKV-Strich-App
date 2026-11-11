"use client";

import { useState } from "react";
import { Check, LockKeyhole, ShieldCheck, Sparkles, Users } from "lucide-react";
import OnboardingExamples from "@/components/club-setup/OnboardingExamples";

type Props = {
  useStrength: boolean;
  useCategories: boolean;
  onStrengthChange?: (value: boolean) => void;
  onCategoriesChange?: (value: boolean) => void;
};

export default function TeamGeneratorOnboardingFields({
  useStrength, useCategories, onStrengthChange, onCategoriesChange,
}: Props) {
  const [localStrength, setLocalStrength] = useState(useStrength);
  const [localCategories, setLocalCategories] = useState(useCategories);
  const strength = onStrengthChange ? useStrength : localStrength;
  const categories = onCategoriesChange ? useCategories : localCategories;
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[26px] bg-[#0b1220] px-5 py-6 text-white sm:px-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-violet-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em] text-cyan-300"><Sparkles className="h-4 w-4" /> Das Herzstück von strikr</div>
          <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Faire Teams. Mehr Spielspaß.</h2>
          <p className="mt-2 max-w-lg text-sm leading-6 text-white/65">Keine Diskussionen bei der Einteilung: strikr hilft dir, ausgeglichene Teams zusammenzustellen.</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            {[0, 1].map((team) => (
              <div key={team} className="w-[43%] max-w-[190px] rounded-2xl border border-white/15 bg-white/[.07] p-3">
                <div className="mb-3 flex items-center justify-between text-[11px] font-bold"><span>TEAM {team === 0 ? "A" : "B"}</span><Users className="h-4 w-4 text-white/60" /></div>
                <div className="flex justify-center gap-1.5">{[0, 1, 2, 3].map((player) => <div key={player} className={`flex h-8 w-8 items-center justify-center rounded-full border border-white/15 ${team === 0 ? "bg-cyan-400/20 text-cyan-200" : "bg-violet-400/20 text-violet-200"}`}><Users className="h-3.5 w-3.5" /></div>)}</div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full w-[88%] rounded-full ${team === 0 ? "bg-cyan-300" : "bg-violet-300"}`} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[11px] font-medium text-white/50">Beispielhafte, ausgeglichene Teamverteilung</p>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-black tracking-tight text-slate-950">Was soll strikr berücksichtigen?</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">Wähle aus, was für eure Gruppe wichtig ist. Du kannst alles später ändern.</p>
      </div>

      <label className={`group flex cursor-pointer items-start gap-3 rounded-[22px] border-2 p-4 transition sm:p-5 ${strength ? "border-violet-400 bg-violet-50/70 shadow-[0_8px_30px_rgba(139,92,246,.08)]" : "border-slate-200 bg-white hover:border-violet-200"}`}>
        <input type="checkbox" name="use_strength" value="1" checked={strength} onChange={event => { setLocalStrength(event.target.checked); onStrengthChange?.(event.target.checked); }} className="sr-only" />
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><ShieldCheck className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><strong className="text-sm font-black text-slate-950">Spielstärken berücksichtigen</strong><span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-800">EMPFOHLEN</span></div>
          <p className="mt-1 text-xs leading-5 text-slate-600">Verteile starke und weniger starke Spieler möglichst gleichmäßig auf die Teams.</p>
          <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-slate-500"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Spielstärken sehen nur Administratoren – keine Trainingsleiter oder Spieler.</p>
        </div>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${strength ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white"}`}>{strength ? <Check className="h-4 w-4" /> : null}</span>
      </label>

      <label className={`group flex cursor-pointer items-start gap-3 rounded-[22px] border-2 p-4 transition sm:p-5 ${categories ? "border-cyan-400 bg-cyan-50/70 shadow-[0_8px_30px_rgba(6,182,212,.08)]" : "border-slate-200 bg-white hover:border-cyan-200"}`}>
        <input type="checkbox" name="use_categories" value="1" checked={categories} onChange={event => { setLocalCategories(event.target.checked); onCategoriesChange?.(event.target.checked); }} className="sr-only" />
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-800"><Users className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <strong className="block text-sm font-black text-slate-950">Kategorien verwenden</strong>
          <p className="mt-1 text-xs leading-5 text-slate-600">Zum Beispiel AH und Ü32 oder erfahrene und neue Spieler. Kategorien können die Einteilung beeinflussen.</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">Detaillierte Erklärungen und weitere Einstellungen findest du im Admin-Bereich.</p>
        </div>
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${categories ? "border-cyan-600 bg-cyan-600 text-white" : "border-slate-300 bg-white"}`}>{categories ? <Check className="h-4 w-4" /> : null}</span>
      </label>
      <OnboardingExamples kind="teams" />
      <p className="text-center text-xs text-slate-500">Alles eingerichtet? Weiter geht’s mit dem nächsten Schritt.</p>
    </div>
  );
}
