type TeamGeneratorSettingsCardProps = {
  useStrength: boolean;
  useCategories: boolean;
};

export default function TeamGeneratorSettingsCard({
  useStrength,
  useCategories,
}: TeamGeneratorSettingsCardProps) {
  return (
    <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
      <details>
        <summary className="cursor-pointer list-none">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-500">
                Einstellungen
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
                Teamgenerator
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Regeln und Erklärung für den automatischen Teamgenerator.
              </p>
            </div>
            <span className="text-sm font-semibold text-slate-500">
              Öffnen
            </span>
          </div>
        </summary>

        <div className="mt-5 border-t border-black/10 pt-5">
          <div className="rounded-[20px] border border-black/10 bg-neutral-50 p-4">
            <div className="mb-3 text-sm font-semibold text-slate-500">
              Kurz erklärt
            </div>

            <p className="text-sm leading-6 text-slate-700">
              Der Teamgenerator teilt anwesende Spieler automatisch in möglichst
              faire Teams auf. Dabei kann STRIKR optional Kategorien und Stärke
              berücksichtigen.
            </p>

            <details className="mt-4 rounded-2xl border border-black/10 bg-white px-4 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-slate-950">
                Ausführliche Erklärung für Admins
              </summary>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  <span className="font-semibold text-slate-900">
                    Was passiert?
                  </span>{" "}
                  Wenn du in einer Session auf „Teams generieren“ gehst,
                  versucht STRIKR zwei möglichst faire Teams zu bauen.
                </p>

                <p>
                  <span className="font-semibold text-slate-900">
                    Kategorien erklärt:
                  </span>{" "}
                  Kategorien sind Gruppen wie zum Beispiel <strong>AH</strong>{" "}
                  oder <strong>Ü32</strong>. Wenn Kategorien aktiv sind,
                  verteilt der Generator diese Gruppen möglichst gleichmäßig auf
                  beide Teams.
                </p>

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
                  Positionsverteilung geachtet, damit die Teams nicht komplett
                  unausgeglichen wirken.
                </p>
              </div>
            </details>
          </div>

          <form
            method="post"
            action="/api/admin/settings"
            className="mt-5 space-y-4"
          >
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
                      Verteilt Kategorien wie AH oder Ü32 möglichst gleichmäßig
                      auf beide Teams.
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
              Einstellungen speichern
            </button>
          </form>
        </div>
      </details>
    </div>
  );
}