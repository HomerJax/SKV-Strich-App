"use client";

import { useState } from "react";

type PlayerSettingsCardProps = {
  className?: string;
};


export default function PlayerSettingsCard({
  className = "",
}: PlayerSettingsCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
            Einstellungen
          </div>
          <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
            Kader & Teamgenerator
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Erst verstehen, wie strikr faire Teams bildet – danach pflegst du
            Spieler, Kategorien, Positionen, Stärken und Balance-Gruppen.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          aria-expanded={open}
        >
          {open ? "Erklärung ausblenden" : "Generator verstehen"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Wichtige Grundlagen
          </div>

          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• Kategorien wie AH und Ü32 werden bewusst getrennt behandelt.</li>
            <li>• Stärke wird innerhalb der Kategorie von 1 bis 5 vergeben.</li>
            <li>• Position dient der fairen Verteilung, nicht als Bonuswert.</li>
            <li>• Balance-Gruppen helfen bei Sonderfällen wie Torhütern oder festen Profilen.</li>
            <li>• Grundlage sind nur anwesende Spieler der Session.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ziel des Generators
          </div>

          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>• möglichst ähnliche Gesamtstärke beider Teams</li>
            <li>• möglichst saubere Verteilung von Torwart / Hinten / Vorne</li>
            <li>• faire und praxistaugliche Aufstellung für das Training</li>
            <li>• gute Basis, aber keine Nicht-Bruddel-Garantie</li>
          </ul>
        </div>
      </div>

      {open ? (
        <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
          <div className="space-y-5 text-sm leading-6 text-slate-700">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Wie funktioniert der Teamgenerator in Strikr?
              </h3>
              <p className="mt-2">
                Der Teamgenerator in Strikr erstellt Teams nicht zufällig,
                sondern nach einer festen und nachvollziehbaren Logik.
              </p>
              <p className="mt-2">
                Ziel ist, zwei Teams zu bilden, die ähnlich stark und ähnlich
                verteilt sind, damit für alle ein möglichst faires Training
                entsteht.
              </p>
              <p className="mt-2">
                Wichtig: Strikr versucht nicht, perfekte Teams im
                mathematischen Sinn zu bauen, sondern eine sehr faire und
                praxistaugliche Aufteilung für den Trainingsalltag.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Welche Werte nutzt der Generator?
              </h3>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">1. Kategorie</div>
                  <p className="mt-2">
                    Spieler werden über ihre Kategorie eingeordnet.
                  </p>
                  <p className="mt-2 text-slate-700">
                    Aktuell gilt:
                    <br />
                    AH
                    <br />
                    Ü32
                  </p>
                  <p className="mt-2">
                    Diese Kategorien werden nicht gleich behandelt, sondern klar
                    getrennt.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">2. Stärke</div>
                  <p className="mt-2">
                    Jeder Spieler bekommt innerhalb seiner Kategorie eine Stärke
                    von 1 bis 5.
                  </p>
                  <p className="mt-2">
                    Die Stärke wird innerhalb der Kategorie bewertet.
                  </p>
                  <p className="mt-2">
                    Das bedeutet: Ein AH 5er ist nicht automatisch stärker als
                    ein Ü32 1er. Die Kategorie bildet das Grundniveau, die
                    Stärke die Einordnung innerhalb dieser Kategorie.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">3. Position</div>
                  <p className="mt-2">
                    Die Position wird ebenfalls berücksichtigt:
                  </p>
                  <p className="mt-2 text-slate-700">
                    Torwart
                    <br />
                    Hinten
                    <br />
                    Vorne
                  </p>
                  <p className="mt-2">
                    Position ist kein Bonus und kein Malus. Ein Vorderer ist
                    also nicht automatisch mehr wert als ein Hinterer. Die
                    Position dient nur dazu, die Teams sauber zu verteilen.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    4. Balance-Gruppen
                  </div>
                  <p className="mt-2">
                    Balance-Gruppen sind Sondermarker für den Generator. Sie
                    helfen, bestimmte Spielerprofile fair zu verteilen – zum
                    Beispiel Torhüter, sehr starke Spieler oder Spieler, die
                    nicht zufällig alle im selben Team landen sollen.
                  </p>
                  <p className="mt-2">
                    Sie erklären also direkt, warum Spieler im Kader zusätzlich
                    markiert werden können.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Wie wird die Spielstärke intern berechnet?
              </h3>

              <p className="mt-2">
                Strikr nutzt intern einen Generatorwert pro Spieler. Dieser
                setzt sich zusammen aus:
              </p>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 font-semibold text-slate-900">
                Kategorie-Basis + Stärke
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    AH
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    AH 1 = 1
                    <br />
                    AH 2 = 2
                    <br />
                    AH 3 = 3
                    <br />
                    AH 4 = 4
                    <br />
                    AH 5 = 5
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Ü32
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    Ü32 1 = 6
                    <br />
                    Ü32 2 = 7
                    <br />
                    Ü32 3 = 8
                    <br />
                    Ü32 4 = 9
                    <br />
                    Ü32 5 = 10
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-semibold text-slate-900">Beispiel</div>
                <p className="mt-2 text-slate-700">
                  AH 5 = 5
                  <br />
                  Ü32 1 = 6
                </p>
                <p className="mt-2">
                  Das heißt: Ein Ü32 1er wird im Generator höher eingeordnet als
                  ein AH 5er. Das ist Absicht, weil AH und Ü32 nicht auf
                  derselben Leistungsskala bewertet werden.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Wie läuft die Generierung ab?
              </h3>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 1: Nur anwesende Spieler zählen
                  </div>
                  <p className="mt-2">
                    Der Generator arbeitet nur mit Spielern, die für die Session
                    als anwesend gespeichert wurden.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 2: Teamgrößen werden festgelegt
                  </div>
                  <p className="mt-2">
                    Die Spieler werden möglichst gleichmäßig auf zwei Teams
                    verteilt.
                  </p>
                  <p className="mt-2 text-slate-700">
                    Beispiel:
                    <br />
                    8 Spieler → 4 gegen 4
                    <br />
                    9 Spieler → 5 gegen 4
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 3: Torhüter zuerst
                  </div>
                  <p className="mt-2">
                    Falls Torhüter vorhanden sind, werden diese zuerst verteilt,
                    weil sie großen Einfluss auf die Fairness eines Spiels haben.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 4: Feldspieler werden gemischt
                  </div>
                  <p className="mt-2">
                    Die restlichen Spieler werden mehrfach neu gemischt und auf
                    beide Teams verteilt.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 5: 400 Varianten werden geprüft
                  </div>
                  <p className="mt-2">
                    Der Generator probiert 400 verschiedene Durchläufe aus.
                  </p>
                  <p className="mt-2">
                    In jedem Durchlauf wird geprüft:
                  </p>
                  <ul className="mt-2 space-y-1 pl-5 text-slate-700">
                    <li>• wie nah die Teamstärken beieinander liegen</li>
                    <li>• wie gut die Positionen verteilt sind</li>
                  </ul>
                  <p className="mt-2">
                    Am Ende wird die beste gefundene Variante übernommen.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Beispiel für eine faire Aufteilung
              </h3>

              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">Team 1</div>
                  <div className="mt-2 text-sm text-slate-700">
                    AH 3 Hinten → 3
                    <br />
                    AH 3 Hinten → 3
                    <br />
                    Ü32 2 Hinten → 7
                    <br />
                    Ü32 4 Vorne → 9
                  </div>
                  <div className="mt-3 font-semibold text-slate-900">
                    Gesamtwert Team 1 = 22
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">Team 2</div>
                  <div className="mt-2 text-sm text-slate-700">
                    AH 1 Hinten → 1
                    <br />
                    AH 2 Hinten → 2
                    <br />
                    Ü32 5 Hinten → 10
                    <br />
                    Ü32 5 Vorne → 10
                  </div>
                  <div className="mt-3 font-semibold text-slate-900">
                    Gesamtwert Team 2 = 23
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-semibold text-slate-900">Bewertung</div>
                <p className="mt-2 text-slate-700">
                  Team 1 = 22
                  <br />
                  Team 2 = 23
                  <br />
                  Differenz = 1
                </p>
                <p className="mt-3">
                  Zusätzlich ist die Positionsverteilung sauber:
                </p>
                <ul className="mt-2 space-y-1 pl-5 text-slate-700">
                  <li>• beide Teams haben 3 hinten</li>
                  <li>• beide Teams haben 1 vorne</li>
                  <li>• beide Teams haben 2 AH und 2 Ü32</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Was der Generator bewusst nicht macht
              </h3>

              <ul className="mt-3 space-y-1 pl-5 text-slate-700">
                <li>• persönliche Tagesform</li>
                <li>• Motivation</li>
                <li>• Verletzungen oder körperliche Einschränkungen</li>
                <li>• besondere Spielweise einzelner Spieler</li>
                <li>• Sympathien oder eingespielte Kombinationen</li>
              </ul>

              <p className="mt-3">
                Er arbeitet nur mit den im System gepflegten Grundlagen:
                Kategorie, Stärke, Position und Anwesenheit.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">
                Sehr kurze Version für Admins
              </div>
              <p className="mt-2">
                Strikr berechnet für jeden Spieler einen internen Wert aus
                Kategorie und Stärke. AH und Ü32 werden dabei bewusst getrennt
                bewertet. Anschließend prüft der Generator viele mögliche
                Teamverteilungen und sucht die Variante, bei der Gesamtstärke
                und Positionsverteilung möglichst fair ausgeglichen sind.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}