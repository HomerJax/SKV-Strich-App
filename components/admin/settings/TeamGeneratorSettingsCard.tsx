type TeamGeneratorSettingsCardProps = {
  useStrength: boolean;
  useCategories: boolean;
  redirectTo?: string;
  submitLabel?: string;
  saved?: boolean;
  error?: string;
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

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
                <div className="text-sm font-bold">Priorität der Team-Balance</div>
                <ol className="mt-2 space-y-1 pl-5">
                  <li>1. Teamgrößen möglichst gleich</li>
                  <li>2. Torhüter möglichst gleich verteilen</li>
                  <li>3. Gesamtstärke beider Teams angleichen</li>
                  <li>4. Balance-Gruppen möglichst aufteilen</li>
                  <li>5. Kategorie- und Positionsmix ausgleichen</li>
                  <li>6. Positionen insgesamt möglichst sauber verteilen</li>
                </ol>
              </div>

              <p><span className="font-semibold text-slate-900">Kategorien:</span>{" "}Wenn Kategorien sportlich unterschiedliche Niveaus darstellen, kann eine aktive Kategorie ausdrücklich als <strong>stärkere Kategorie</strong> markiert werden. Alle anderen aktiven Kategorien werden für die Stärke auf demselben normalen Grundniveau behandelt. Die Reihenfolge der Kategorien spielt keine Rolle.</p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="text-sm font-bold">So bewertet strikr Kategorien und Stärke</div>
                <p className="mt-2">Die markierte stärkere Kategorie bekommt einen festen Kategoriebonus. Dazu kommt – wenn aktiviert – die individuelle Stärke 1–5.</p>
                <p className="mt-2">Dadurch liegt ein Spieler aus der stärkeren Kategorie mit Stärke 1 knapp über einem Spieler der normalen Kategorie mit Stärke 5. Die individuelle Stärke bleibt trotzdem wichtig für die Feinabstimmung.</p>
                <p className="mt-2">Wenn eure Kategorien keine sportliche Stärke ausdrücken, schaltet Kategorien für den Generator aus und arbeitet nur mit individueller Stärke.</p>
              </div>

              <p><span className="font-semibold text-slate-900">Stärke:</span>{" "}Wenn Stärke aktiv ist, gleicht strikr die hinterlegten Werte 1–5 aus. Spieler ohne Einzelwert verwenden den eingestellten Club-Standardwert.</p>

              <p><span className="font-semibold text-slate-900">Torhüter & Positionen:</span>{" "}Torhüter werden gesondert und mit hoher Priorität verteilt. Bei den Feldspielern achtet strikr anschließend auf einen möglichst ausgeglichenen Mix aus Hinten und Vorne.</p>

              <p><span className="font-semibold text-slate-900">Balance-Gruppen:</span>{" "}Sie sind eine weiche Zusatzregel für Sonderprofile, die möglichst auf beide Teams verteilt werden sollen. Eine Balance-Gruppe ist kein zusätzlicher Stärkewert und darf eine deutlich bessere Gesamtbalance nicht überstimmen.</p>

              <p><span className="font-semibold text-slate-900">Feinschliff:</span>{" "}Nach der besten kompletten Aufteilung testet strikr direkte Spieler-Tausche zwischen Team A und Team B. Ein Tausch wird nur übernommen, wenn die Gesamtbewertung dadurch besser wird.</p>

              <p><span className="font-semibold text-slate-900">Teamgrößen:</span>{" "}Bei ungerader Spielerzahl unterscheiden sich die Teams maximal um einen Spieler, zum Beispiel 5 gegen 4.</p>
            </div>
          </div>
        </details>
      </div>

      <form method="post" action="/api/admin/settings" className="space-y-4">
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input type="hidden" name="settings_scope" value="team_generator" />

        <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-500">Aktive Regeln</div>
          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <input type="checkbox" name="use_categories" value="1" defaultChecked={useCategories} className="mt-1 h-4 w-4 rounded border-neutral-300" />
              <div>
                <div className="text-sm font-semibold text-slate-950">Kategorien nutzen</div>
                <div className="text-sm text-slate-600">Berücksichtigt die markierte stärkere Kategorie als Grundniveau und nutzt Kategorien zusätzlich für eine ausgewogene Verteilung.</div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <input type="checkbox" name="use_strength" value="1" defaultChecked={useStrength} className="mt-1 h-4 w-4 rounded border-neutral-300" />
              <div>
                <div className="text-sm font-semibold text-slate-950">Stärke nutzen</div>
                <div className="text-sm text-slate-600">Gleicht die Teams zusätzlich anhand der hinterlegten Spielstärken aus.</div>
              </div>
            </label>
          </div>
        </div>

        <button type="submit" className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
          {submitLabel}
        </button>
      </form>
    </div>
  );
}
