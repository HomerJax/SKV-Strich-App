"use client";

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
  return (
    <div className="space-y-3">
      <p className="text-sm leading-6 text-slate-600">strikr verteilt eure anwesenden Spieler möglichst gleichmäßig auf die Teams. Du entscheidest, was dabei berücksichtigt wird.</p>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
        <input type="checkbox" name="use_strength" value="1" checked={useStrength} onChange={event => onStrengthChange?.(event.target.checked)} readOnly={!onStrengthChange} className="mt-1 h-5 w-5 accent-slate-950" />
        <span><strong className="block text-sm text-slate-950">Spielstärken berücksichtigen · Empfohlen</strong><span className="text-xs leading-5 text-slate-600">Du kannst jedem Spieler später eine Stärke geben. So landen starke Spieler möglichst nicht alle in einem Team.</span></span>
      </label>
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50/60 p-4">
        <input type="checkbox" name="use_categories" value="1" checked={useCategories} onChange={event => onCategoriesChange?.(event.target.checked)} readOnly={!onCategoriesChange} className="mt-1 h-5 w-5 accent-slate-950" />
        <span><strong className="block text-sm text-slate-950">Kategorien verwenden</strong><span className="text-xs leading-5 text-slate-600">Optional: etwa AH und Ü32 oder erfahrene und neue Spieler. Kategorien können die Einteilung beeinflussen.</span></span>
      </label>
      <OnboardingExamples kind="teams" />
      <p className="text-xs text-slate-500">Diese Einstellungen kannst du später ändern.</p>
    </div>
  );
}
