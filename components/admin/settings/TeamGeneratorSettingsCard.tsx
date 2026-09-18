type TeamGeneratorSettingsCardProps = {
  useStrength: boolean;
  useCategories: boolean;
  redirectTo?: string;
  submitLabel?: string;
  saved?: boolean;
  error?: string;
  variant?: "default" | "onboarding";
};

function getErrorMessage(error?: string) {
  switch (error) {
    case "nothing_to_save":
      return "Es wurden keine Änderungen erkannt.";
    case "unauthorized":
      return "Du hast keine Berechtigung für diese Einstellung.";
    case "save_failed":
      return "Die Einstellungen konnten nicht gespeichert werden.";
    default:
      return error || "";
  }
}

export default function TeamGeneratorSettingsCard({
  useStrength,
  useCategories,
  redirectTo = "/admin/settings",
  submitLabel = "Einstellungen speichern",
  saved = false,
  error = "",
  variant = "default",
}: TeamGeneratorSettingsCardProps) {
  const errorMessage = getErrorMessage(error);

  return (
    <div className="space-y-5">
      {saved ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Einstellungen gespeichert.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {variant === "onboarding" ? (
        <div className="rounded-[24px] border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-violet-50 p-4 sm:p-5">
          <div className="text-[10px] font-black uppercase tracking-[.18em] text-cyan-700">
            ✨ Das macht strikr automatisch
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
              <div className="text-sm font-black text-slate-950">Gleiche Teamgröße</div>
              <div className="mt-1 text-xs font-medium leading-5 text-slate-500">Bei ungerader Zahl maximal ein Spieler Unterschied.</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
              <div className="text-sm font-black text-slate-950">Torhüter verteilen</div>
              <div className="mt-1 text-xs font-medium leading-5 text-slate-500">Keeper werden mit hoher Priorität aufgeteilt.</div>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 ring-1 ring-slate-200/70">
              <div className="text-sm font-black text-slate-950">Balance optimieren</div>
              <div className="mt-1 text-xs font-medium leading-5 text-slate-500">Stärke, Gruppen und Positionen sorgen für den Feinschliff.</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-500">Kurz erklärt</div>
          <p className="text-sm leading-6 text-slate-700">
            Der Teamgenerator sucht aus den anwesenden Spielern eine möglichst faire Aufteilung. Teamgröße und Torhüter werden zuerst abgesichert. Danach optimiert strikr Gesamtstärke, Balance-Gruppen sowie Kategorie- und Positionsmix und verbessert die beste Variante anschließend noch durch direkte Spieler-Tausche.
          </p>

          <details className="group mt-4 rounded-2xl border border-black/10 bg-white">
            <summary className="list-none cursor-pointer px-4 py-3 [&::-webkit-details-marker]:hidden">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-900">Ausführliche Erklärung für Admins</div>
                <div className="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition group-open:rotate-180">⌄</div>
              </div>
            </summary>

            <div className="border-t border-black/10 px-4 py-4">
              <div className="space-y-3 text-sm leading-6 text-slate-600">
                <p><span className="font-semibold text-slate-900">Was passiert?</span>{" "}Wenn du in einer Session auf „Teams generieren“ gehst, prüft strikr je nach Teilnehmerzahl mehrere tausend vollständige Aufteilungen. Die beste gefundene Variante wird danach zusätzlich durch direkte Spieler-Tausche weiter verbessert.</p>
                <p><span className="font-semibold text-slate-900">Kategorien & Stärke:</span>{" "}Kategorien können sportliche Niveaus abbilden; die individuelle Stärke 1–5 dient danach zur Feinabstimmung.</p>
                <p><span className="font-semibold text-slate-900">Torhüter & Positionen:</span>{" "}Torhüter werden gesondert verteilt, Feldspieler anschließend möglichst ausgewogen nach Positionen.</p>
                <p><span className="font-semibold text-slate-900">Feinschliff:</span>{" "}Nach der besten kompletten Aufteilung testet strikr direkte Spieler-Tausche und übernimmt sie nur, wenn die Gesamtbalance besser wird.</p>
              </div>
            </div>
          </details>
        </div>
      )}

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input type="hidden" name="settings_scope" value="team_generator" />

        <div className={variant === "onboarding" ? "space-y-3" : "rounded-[20px] border border-black/10 bg-neutral-50 p-4"}>
          <div className={variant === "onboarding" ? "text-xs font-black uppercase tracking-[.14em] text-slate-500" : "mb-3 text-sm font-semibold text-slate-500"}>
            Was soll für die Balance zählen?
          </div>
          <div className="space-y-3">
            <label className={variant === "onboarding" ? "flex cursor-pointer items-start gap-4 rounded-[22px] border border-violet-100 bg-violet-50/60 px-4 py-4 transition hover:border-violet-200" : "flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"}>
              <input type="checkbox" name="use_strength" value="1" defaultChecked={useStrength} className="mt-1 h-5 w-5 rounded border-neutral-300 accent-slate-950" />
              <div>
                <div className="flex items-center gap-2 text-sm font-black text-slate-950">
                  Individuelle Stärke
                  {variant === "onboarding" ? <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[9px] font-black text-white">EMPFOHLEN</span> : null}
                </div>
                <div className="mt-1 text-sm leading-6 text-slate-600">Spieler bekommen eine Stärke von 1–5. Damit kann strikr zwei Teams deutlich feiner ausgleichen.</div>
              </div>
            </label>

            <label className={variant === "onboarding" ? "flex cursor-pointer items-start gap-4 rounded-[22px] border border-cyan-100 bg-cyan-50/60 px-4 py-4 transition hover:border-cyan-200" : "flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3"}>
              <input type="checkbox" name="use_categories" value="1" defaultChecked={useCategories} className="mt-1 h-5 w-5 rounded border-neutral-300 accent-slate-950" />
              <div>
                <div className="text-sm font-black text-slate-950">Spielergruppen / Kategorien</div>
                <div className="mt-1 text-sm leading-6 text-slate-600">Sinnvoll, wenn ihr z. B. AH und Ü32 oder klar unterschiedliche Leistungsgruppen gemeinsam verwaltet.</div>
              </div>
            </label>
          </div>
        </div>

        <button type="submit" className={variant === "onboarding" ? "flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(15,23,42,.14)] transition hover:-translate-y-0.5 hover:bg-slate-900" : "inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"}>
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
