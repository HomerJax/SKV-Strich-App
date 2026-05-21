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
    case "invalid_season_start_day":
      return "Der Saison-Starttag ist ungültig.";
    case "invalid_season_start_month":
      return "Der Saison-Startmonat ist ungültig.";
    case "invalid_season_end_day":
      return "Der Saison-Endtag ist ungültig.";
    case "invalid_season_end_month":
      return "Der Saison-Endmonat ist ungültig.";
    case "invalid_season_year_mode":
      return "Die Saison-Jahreslogik ist ungültig.";
    case "invalid_awards_started_at":
      return "Das Startdatum für Awards ist ungültig.";
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
        <div className="mb-2 text-sm font-semibold text-slate-500">
          Kurz erklärt
        </div>

        <p className="text-sm leading-6 text-slate-700">
          Der Teamgenerator teilt anwesende Spieler automatisch in möglichst
          faire Teams auf. Optional können Kategorien und Stärke berücksichtigt
          werden.
        </p>

        <details className="group mt-4 rounded-2xl border border-black/10 bg-white">
          <summary className="list-none cursor-pointer px-4 py-3 [&::-webkit-details-marker]:hidden">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                Ausführliche Erklärung für Admins
              </div>
              <div className="rounded-full border border-black/10 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-500 transition group-open:rotate-180">
                ⌄
              </div>
            </div>
          </summary>

          <div className="border-t border-black/10 px-4 py-4">
            <div className="space-y-3 text-sm leading-6 text-slate-600">
              <p>
                <span className="font-semibold text-slate-900">
                  Was passiert?
                </span>{" "}
                Wenn du in einer Session auf „Teams generieren“ gehst, versucht
                STRIKR zwei möglichst faire Teams zu bauen.
              </p>

              <p>
                <span className="font-semibold text-slate-900">
                  Kategorien erklärt:
                </span>{" "}
                Kategorien sind Gruppen wie zum Beispiel <strong>AH</strong>{" "}
                oder <strong>Ü32</strong>. strikr ist aktuell auf maximal zwei
                aktive Kategorien für die Team-Balance ausgelegt.
              </p>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
                <div className="text-sm font-bold">
                  Wichtig für faire Teams
                </div>
                <p className="mt-2">
                  Die stärkere Kategorie wird beim Generieren deutlich höher
                  bewertet als die normale Kategorie. Die individuelle Stärke
                  1–5 dient danach zur Feinabstimmung innerhalb der Kategorie.
                </p>
                <p className="mt-2">
                  Beispiel: Ein Spieler aus der stärkeren Kategorie mit Stärke
                  1 wird höher bewertet als ein Spieler aus der normalen
                  Kategorie mit Stärke 5.
                </p>
                <p className="mt-2">
                  Zusätzlich achtet strikr darauf, dass Positionen innerhalb der
                  Kategorien möglichst gleichmäßig verteilt werden. So soll
                  vermieden werden, dass ein Team alle stärkeren vorderen
                  Spieler bekommt.
                </p>
              </div>

              <p>
                <span className="font-semibold text-slate-900">
                  Stärke erklärt:
                </span>{" "}
                Wenn Stärke aktiv ist, schaut STRIKR zusätzlich auf die
                hinterlegte Spielstärke der Spieler, damit nicht versehentlich
                alle stärkeren Spieler in einem Team landen.
              </p>

              <p>
                <span className="font-semibold text-slate-900">
                  Was passiert, wenn beides aus ist?
                </span>{" "}
                Dann werden die Teams ohne Kategorie- und Stärkebalance
                verteilt. Die Aufteilung ist dann deutlich zufälliger.
              </p>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 text-sm font-semibold text-slate-900">
                  Konkretes Beispiel
                </div>
                <p>
                  Du hast <strong>10 Spieler</strong> anwesend:
                </p>
                <ul className="mt-2 space-y-1 pl-5">
                  <li>4 Spieler in der Kategorie AH</li>
                  <li>6 Spieler in der Kategorie Ü32</li>
                </ul>
                <p className="mt-3">
                  Wenn Kategorien aktiv sind, verteilt STRIKR diese Spieler so,
                  dass beide Teams eine ähnliche Anzahl an AH- und
                  Ü32-Spielern haben.
                </p>
                <p className="mt-2">
                  Wenn zusätzlich Stärke aktiv ist, achtet STRIKR außerdem
                  darauf, dass die geschätzte Gesamtstärke beider Teams ähnlich
                  bleibt.
                </p>
                <p className="mt-2 font-medium text-slate-900">
                  Ziel: faire Teams ohne Diskussion.
                </p>
              </div>

              <p>
                Zusätzlich wird in der Session auch auf eine sinnvolle
                Positionsverteilung geachtet.
              </p>
            </div>
          </div>
        </details>
      </div>

      <form
        method="post"
        action="/api/admin/settings"
        className="space-y-4"
      >
        <input type="hidden" name="redirect_to" value={redirectTo} />

        <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
          <div className="mb-3 text-sm font-semibold text-slate-500">
            Aktive Regeln
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <input
                type="checkbox"
                name="use_categories"
                value="1"
                defaultChecked={useCategories}
                className="mt-1 h-4 w-4 rounded border-neutral-300"
              />
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Kategorien nutzen
                </div>
                <div className="text-sm text-slate-600">
                  Verteilt Kategorien wie AH oder Ü32 möglichst gleichmäßig auf
                  beide Teams.
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <input
                type="checkbox"
                name="use_strength"
                value="1"
                defaultChecked={useStrength}
                className="mt-1 h-4 w-4 rounded border-neutral-300"
              />
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Stärke nutzen
                </div>
                <div className="text-sm text-slate-600">
                  Gleicht die Teams zusätzlich anhand der hinterlegten
                  Spielstärken aus.
                </div>
              </div>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {submitLabel}
        </button>
      </form>
    </div>
  );
}