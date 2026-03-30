"use client";

import Link from "next/link";
import { useState } from "react";

type PlayerSettingsCardProps = {
  useStrength: boolean;
  strengthDefault: number | null;
  useCategories: boolean;
  categoryCount: number;
  className?: string;
};

export default function PlayerSettingsCard({
  useStrength,
  strengthDefault,
  useCategories,
  categoryCount,
  className = "",
}: PlayerSettingsCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <section
      className={`rounded-[28px] border border-black/10 bg-white p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
          Spieler & Generator
        </div>
        <h2 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
          Grundlagen und Logik
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Hier siehst du die wichtigsten Einstellungen für Spieler, Kategorien,
          Stärke und den Teamgenerator.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Kategorien
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            {useCategories ? "Aktiv" : "Aus"}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {useCategories
              ? `${categoryCount} aktive Kategorie${
                  categoryCount === 1 ? "" : "n"
                }`
              : "Kategorien werden aktuell nicht genutzt"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Stärke
          </div>
          <div className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            {useStrength ? "Aktiv" : "Aus"}
          </div>
          <div className="mt-2 text-sm text-slate-600">
            {useStrength
              ? `Standardwert ${strengthDefault ?? 3}`
              : "Spielerstärke wird aktuell nicht genutzt"}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ziel
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-700">
            Der Generator sucht möglichst faire Teams mit ähnlicher Gesamtstärke
            und sinnvoll verteilter Position.
          </div>

          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            aria-expanded={open}
          >
            {open ? "Erklärung ausblenden" : "Generator verstehen"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Einstellungen
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/admin/club"
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Team-Einstellungen öffnen
            </Link>
          </div>
          <div className="mt-2 text-sm text-slate-600">
            Dort pflegst du die Generator-Grundlagen.
          </div>
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
                mathematischen Sinn zu bauen, sondern eine faire und
                praxistaugliche Aufteilung für den Trainingsalltag.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Welche Werte nutzt der Generator?
              </h3>

              <div className="mt-3 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    1. Kategorie
                  </div>
                  <p className="mt-2">
                    Spieler werden über ihre Kategorie eingeordnet.
                  </p>
                  <p className="mt-2">
                    Kategorien werden bewusst getrennt behandelt und bilden das
                    Grundniveau innerhalb des Generators.
                  </p>
                  <p className="mt-2 text-slate-600">
                    Beispielhaft könnten das AH und Ü32 sein.
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
                  <p className="mt-2 text-slate-600">
                    Beispiel: Ein Spieler in Kategorie 1 mit Stärke 5 ist nicht
                    automatisch höher eingestuft als ein Spieler in Kategorie 2
                    mit Stärke 1.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">3. Position</div>
                  <p className="mt-2">
                    Positionen wie Torwart, Hinten und Vorne werden genutzt, um
                    die Teams sauber zu verteilen.
                  </p>
                  <p className="mt-2">
                    Position ist dabei kein Bonus und kein Malus.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Wie wird intern gerechnet?
              </h3>

              <p className="mt-2">
                Strikr nutzt intern einen Generatorwert pro Spieler:
              </p>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4 font-semibold text-slate-900">
                Kategorie-Basis + Stärke
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-semibold text-slate-900">Beispiel</div>
                <p className="mt-2 text-slate-700">
                  Kategorie 1 + Stärke 5
                  <br />
                  Kategorie 2 + Stärke 1
                </p>
                <p className="mt-2">
                  Kategorien liegen bewusst auf unterschiedlichen Niveaus. Die
                  Stärke wird deshalb immer innerhalb der jeweiligen Kategorie
                  gelesen und nicht global über alle Kategorien hinweg.
                </p>
                <p className="mt-2 text-slate-600">
                  Beispielhaft könnte Kategorie 1 für AH und Kategorie 2 für Ü32
                  stehen.
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
                    Schritt 1: Nur anwesende Spieler
                  </div>
                  <p className="mt-2">
                    Der Generator berücksichtigt nur Spieler, die in der Session
                    als anwesend markiert sind.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 2: Teamgrößen festlegen
                  </div>
                  <p className="mt-2">
                    Die Spieler werden möglichst gleichmäßig auf zwei Teams
                    verteilt.
                  </p>
                  <p className="mt-2 text-slate-700">
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
                    Falls Torhüter vorhanden sind, werden diese zuerst verteilt.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 4: Feldspieler werden gemischt
                  </div>
                  <p className="mt-2">
                    Die restlichen Spieler werden mehrfach neu verteilt.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">
                    Schritt 5: 400 Varianten prüfen
                  </div>
                  <p className="mt-2">
                    Der Generator testet 400 Varianten und nimmt die beste
                    gefundene Kombination.
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
                    Kategorie 1 · Stärke 3 · Hinten
                    <br />
                    Kategorie 1 · Stärke 3 · Hinten
                    <br />
                    Kategorie 2 · Stärke 2 · Hinten
                    <br />
                    Kategorie 2 · Stärke 4 · Vorne
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="font-semibold text-slate-900">Team 2</div>
                  <div className="mt-2 text-sm text-slate-700">
                    Kategorie 1 · Stärke 1 · Hinten
                    <br />
                    Kategorie 1 · Stärke 2 · Hinten
                    <br />
                    Kategorie 2 · Stärke 5 · Hinten
                    <br />
                    Kategorie 2 · Stärke 5 · Vorne
                  </div>
                </div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="font-semibold text-slate-900">Bewertung</div>
                <p className="mt-2">
                  Ziel ist nicht, dass beide Teams identisch wirken, sondern
                  dass ihre Gesamtstärke und die Positionsverteilung möglichst
                  nah beieinander liegen.
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                Was der Generator bewusst nicht macht
              </h3>

              <ul className="mt-3 space-y-1 pl-5 text-slate-700">
                <li>• persönliche Tagesform</li>
                <li>• Motivation</li>
                <li>• Verletzungen</li>
                <li>• Sympathien oder Wunschpärchen</li>
                <li>• eingespielte Kombinationen</li>
              </ul>

              <p className="mt-3">
                Er arbeitet nur mit Kategorie, Stärke, Position und Anwesenheit.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}