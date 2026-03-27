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
      "Startseite und Navigation an Clubfarben angepasst",
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

        {/* STORY */}
        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Die Idee
          </div>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Wie alles angefangen hat
          </h1>

          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
            <p>
              Angefangen hat alles ganz simpel: In der SAH wollten wir unser
              Training ein bisschen spannender machen. Also haben wir angefangen,
              für Siege kleine „Striche“ zu zählen – ganz klassisch auf Papier.
            </p>

            <p>
              Papier wurde schnell unübersichtlich. Also kam Excel. Tabellen,
              Auswertungen, erste Ranglisten… aber auch ziemlich mühsam.
            </p>

            <p>
              Irgendwann war klar: Das muss einfacher gehen. Und so entstand das
              erste kleine Webtool.
            </p>

            <p>
              Gleichzeitig kennen wahrscheinlich viele das gleiche Problem:
              Teams werden „irgendwie“ gewählt. Durchzählen, Bauchgefühl… und am
              Ende ist es oft einfach nicht fair.
            </p>

            <p>
              Genau das wollten wir besser machen.
            </p>

            <p>
              Also haben wir angefangen, einen Team-Generator zu bauen. Mit
              Faktoren wie Alter, Position, Stärke, Fitness – alles Dinge, die im
              Training eine Rolle spielen.
            </p>

            <p>
              Die große Frage dabei:
              <span className="font-semibold text-slate-950">
                {" "}
                Was ist eigentlich ein faires Team?
              </span>
            </p>

            <p>
              Die Antwort ist nicht perfekt – aber deutlich besser als vorher.
              Und genau darum geht’s.
            </p>

            <p>
              Aus einer Idee auf einer Weihnachtsfeier ist so Schritt für Schritt
              ein kompletter Trainings-Workflow entstanden.
            </p>

            <p className="font-medium text-slate-800">
              Und ja – wir sind eine AH-Truppe. Aber wir wollen trotzdem kicken.
              Und zwar richtig. 😉
            </p>

            <p className="font-semibold text-slate-900">
              Fußball ist unser Leben.
            </p>
          </div>
        </div>

        {/* MEHRWERT */}
        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Warum Strikr?
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            Was bringt das im Training?
          </h2>

          <div className="mt-4 space-y-4 text-sm leading-7 text-slate-600 sm:text-base">
            <p>
              Das Feedback aus unserer Mannschaft ist ziemlich klar:
            </p>

            <ul className="list-disc pl-5 space-y-2">
              <li>Teams sind deutlich ausgeglichener</li>
              <li>Spiele sind enger und intensiver</li>
              <li>Jeder Spieler ist mehr gefordert</li>
              <li>Das Training macht einfach mehr Spaß</li>
            </ul>

            <p>
              Dazu kommen Statistiken, Tabellen, Saisonauswertungen und eine
              „ewige Tabelle“ – einfach weil es Spaß macht, sich zu messen.
            </p>

            <p>
              Klar: Die App löst nicht jedes Problem. Aber sie bringt Struktur,
              Fairness und ein bisschen extra Motivation ins Training.
            </p>
          </div>
        </div>

        {/* STATUS */}
        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Status
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            Pilotphase
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Strikr läuft aktuell in einer Pilotphase. Die App ist stabil und wird
            aktiv im Training genutzt. Weitere Features sind geplant – Schritt
            für Schritt, immer nah am echten Bedarf auf dem Platz.
          </p>

          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Perspektivisch ist auch eine Veröffentlichung als mobile App
            denkbar.
          </p>
        </div>

        {/* RELEASES */}
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

        {/* FEEDBACK */}
        <div className="rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-7">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            Feedback
          </div>

          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">
            Rückmeldung geben
          </h2>

          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            Feedback, Ideen oder Probleme helfen direkt dabei, Strikr besser zu
            machen.
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