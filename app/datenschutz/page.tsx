import Link from "next/link";

export default function DatenschutzPage() {
  return (
    <main className="min-h-screen bg-neutral-100 text-slate-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          ← Zurück
        </Link>

        <div className="mt-5 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Datenschutz
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Datenschutzerklärung
          </h1>

          <div className="mt-6 space-y-6 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="font-extrabold text-slate-950">
                Verantwortlicher
              </h2>
              <p className="mt-2">
                Marcus Bofinger
                <br />
                E-Mail:{" "}
                <a
                  href="mailto:mb1607@gmx.de"
                  className="font-semibold text-slate-950 underline underline-offset-4"
                >
                  mb1607@gmx.de
                </a>
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                Zweck der Verarbeitung
              </h2>
              <p className="mt-2">
                strikr verarbeitet Daten, damit Teams Trainings organisieren,
                Anwesenheiten erfassen, Teams bilden, Ergebnisse dokumentieren,
                MVP-Abstimmungen durchführen und teambezogene Statistiken
                anzeigen können.
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                Verarbeitete Daten
              </h2>
              <p className="mt-2">
                Je nach Nutzung können insbesondere Namen, E-Mail-Adressen,
                Team- und Clubzuordnungen, Anwesenheiten, Spielerprofile,
                Sessiondaten, Ergebnisse, MVP-Stimmen und technische
                Nutzungsdaten verarbeitet werden.
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                Technische Dienstleister
              </h2>
              <p className="mt-2">
                Für Betrieb, Authentifizierung, Datenbank, Dateispeicherung und
                Hosting werden externe technische Dienstleister eingesetzt,
                insbesondere Supabase und Vercel.
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                Kontakt bei Datenschutzfragen
              </h2>
              <p className="mt-2">
                Bei Fragen zur Verarbeitung personenbezogener Daten kann eine
                Anfrage per E-Mail an{" "}
                <a
                  href="mailto:mb1607@gmx.de"
                  className="font-semibold text-slate-950 underline underline-offset-4"
                >
                  mb1607@gmx.de
                </a>{" "}
                gestellt werden.
              </p>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              Hinweis: Diese Datenschutzerklärung ist ein erster pragmatischer
              Platzhalter für die Test- und Vorbereitungsphase. Vor aktiver
              Bewerbung sollte sie rechtlich geprüft und vollständig auf die
              tatsächlichen Dienste, Speicherorte und Prozesse angepasst werden.
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
