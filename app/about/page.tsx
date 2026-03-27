import Link from "next/link";

type ReleaseItem = {
  version: string;
  title: string;
  dateLabel: string;
  items: string[];
};

const RELEASES: ReleaseItem[] = [
  {
    version: "v0.2",
    title: "Pilot-Readiness",
    dateLabel: "Aktueller Stand",
    items: [
      "Profilbereich über Klick auf den Namen im Header erreichbar",
      "Passwort kann direkt im Profil geändert werden",
      "Club-Branding mit Logo und Hauptfarbe im Adminbereich",
      "Version wird im Header angezeigt",
      "Ergebnis-Share als echtes Bild",
      "Siegerfoto in Sessions integriert",
      "Startseite, Hero und Navigation stärker auf Clubfarbe ausgerichtet",
      "Adminbereich optisch aufgeräumt",
    ],
  },
  {
    version: "v0.1",
    title: "Grundsystem",
    dateLabel: "Erste stabile Basis",
    items: [
      "Login, Logout und Session-Handling",
      "Mitglieder und Rollen",
      "Trainings / Sessions",
      "Anwesenheiten",
      "Team-Erstellung manuell und per Auto-Balancing",
      "Ergebnisse speichern und löschen",
      "Tabellen / Standings",
      "Multi-Club-Struktur",
    ],
  },
];

export default function AboutPage() {
  const feedbackHref = "mailto:mb1607@gmx.de?subject=strikr%20Feedback";

  return (
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zur Startseite
          </Link>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Über Strikr
          </div>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Strikr
          </h1>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Strikr ist als praxisnahes Tool für Trainingsorganisation entstanden:
            Anwesenheiten festhalten, faire Teams bilden, Ergebnisse speichern,
            Siegerfotos ergänzen und Entwicklungen im Team sichtbar machen.
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Der Fokus liegt auf einer schnellen, klaren Nutzung direkt im
            Vereinsalltag — ohne unnötige Komplexität.
          </p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Status
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            Pilotphase
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Die App befindet sich aktuell in der Pilotphase. Ziel ist ein
            stabiles, nützliches System für Vereine, das Schritt für Schritt
            erweitert wird — erst sauber im Alltag, dann persönlicher und
            datenstärker für Spieler und Teams.
          </p>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Versionen
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            Änderungsverlauf
          </h2>

          <div className="mt-5 flex flex-col gap-4">
            {RELEASES.map((release) => (
              <div
                key={release.version}
                className="rounded-[24px] border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-500">
                      {release.dateLabel}
                    </div>
                    <h3 className="mt-1 text-xl font-bold text-slate-950">
                      {release.version} · {release.title}
                    </h3>
                  </div>

                  <div className="inline-flex w-fit rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                    {release.version}
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  {release.items.map((item) => (
                    <div
                      key={item}
                      className="rounded-xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Feedback
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            Rückmeldung geben
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Feedback, Ideen und Probleme helfen direkt dabei, Strikr sinnvoll
            weiterzuentwickeln.
          </p>

          <div className="mt-5">
            <a
              href={feedbackHref}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Feedback per Mail senden
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}