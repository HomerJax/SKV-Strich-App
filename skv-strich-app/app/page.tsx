import Link from "next/link";

export default function HomePage() {
  return (
    <div className="space-y-6">
      {/* Begrüßung / Saison-Info */}
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          Willkommen beim SKV ⚽
        </h1>
        <p className="mb-3 text-sm text-slate-600">
          Organisiere eure Trainings, lass faire Aufstellungen generieren und
          behalte Strichliste &amp; Trainingsbeteiligung im Blick.
        </p>

        <div className="flex flex-wrap gap-3 text-xs text-slate-600">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            Aktuelle Saison: 2026
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <span className="font-semibold">Tipp:</span> Auf dem Handy über den
            Browser als „Zum Startbildschirm hinzufügen“ speichern.
          </div>
        </div>
      </section>

      {/* Hauptnavigation als Karten */}
      <section className="grid gap-4 sm:grid-cols-2">
        {/* Spieler */}
        <Link
          href="/players"
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md sm:p-5"
        >
          <div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Spieler verwalten
            </h2>
            <p className="text-sm text-slate-600">
              Spieler anlegen, Altersgruppe (AH / Ü32) und Position
              (vorne/hinten/Torwart) pflegen.
            </p>
          </div>
          <div className="mt-3 text-xs font-medium text-emerald-600 group-hover:text-emerald-700">
            Zur Spielerübersicht →
          </div>
        </Link>

        {/* Trainings / Spieltage */}
        <Link
          href="/sessions"
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md sm:p-5"
        >
          <div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Trainings &amp; Spieltage
            </h2>
            <p className="text-sm text-slate-600">
              Termine anlegen, Anwesenheit markieren, Teams generieren und
              Ergebnisse mit Toren eintragen.
            </p>
          </div>
          <div className="mt-3 text-xs font-medium text-emerald-600 group-hover:text-emerald-700">
            Zu den Terminen →
          </div>
        </Link>

        {/* Standings aktuelle Saison */}
        <Link
          href="/standings?season=2026"
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-md sm:p-5"
        >
          <div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Standings Saison 2026
            </h2>
            <p className="text-sm text-slate-600">
              Strichliste mit Teilnahmen, Siegen und Punkten. Saison kann oben
              auf der Standings-Seite gewechselt werden.
            </p>
          </div>
          <div className="mt-3 text-xs font-medium text-emerald-600 group-hover:text-emerald-700">
            Tabelle ansehen →
          </div>
        </Link>

        {/* Ewige Tabelle */}
        <Link
          href="/standings?season=all"
          className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-400 hover:shadow-md sm:p-5"
        >
          <div>
            <h2 className="mb-1 text-lg font-semibold text-slate-900">
              Ewige Tabelle
            </h2>
            <p className="text-sm text-slate-600">
              Alle Saisons zusammen: wer hat insgesamt die meisten Striche und
              Einsätze?
            </p>
          </div>
          <div className="mt-3 text-xs font-medium text-amber-600 group-hover:text-amber-700">
            Ewige Tabelle öffnen →
          </div>
        </Link>
      </section>
    </div>
  );
}
