import Link from "next/link";

export default function AccountDeleteInfoPage() {
  return (
    <main className="min-h-screen bg-neutral-100 text-slate-950">
      <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
        >
          ← Zurück
        </Link>

        <div className="mt-5 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Datenschutzoptionen
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            strikr Konto löschen
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Dein strikr Konto kann direkt innerhalb der App dauerhaft gelöscht
            werden. Die Löschung ist endgültig und kann nicht rückgängig gemacht
            werden.
          </p>

          <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="font-extrabold text-slate-950">
              So löschst du dein Konto
            </h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
              <li>Bei strikr anmelden.</li>
              <li>Das Profil öffnen.</li>
              <li>Zum Bereich „Konto dauerhaft löschen“ scrollen.</li>
              <li>Zur Bestätigung exakt „KONTO LÖSCHEN“ eingeben.</li>
              <li>Checkbox bestätigen und die endgültige Löschung ausführen.</li>
            </ol>

            <Link
              href="/profile"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
            >
              Zum Profil
            </Link>
          </div>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950">
            <h2 className="font-extrabold">Hinweis für Club-Admins</h2>
            <p className="mt-2">
              Bist du der einzige Admin eines Clubs, musst du vor der
              Kontolöschung entweder einen anderen Admin bestimmen oder den Club
              im Adminbereich dauerhaft löschen. Dadurch wird verhindert, dass
              ein Club ohne verantwortlichen Admin zurückbleibt.
            </p>
          </div>

          <section className="mt-7">
            <h2 className="font-extrabold text-slate-950">
              Was bei der Kontolöschung passiert
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
              <li>Das Login- und Authentifizierungskonto wird gelöscht.</li>
              <li>Club-Mitgliedschaften und persönliche Benachrichtigungen werden entfernt.</li>
              <li>
                Verknüpfte Spielerprofile werden anonymisiert und deaktiviert,
                damit bereits abgeschlossene Ergebnisse und Tabellen innerhalb
                eines Clubs nachvollziehbar bleiben.
              </li>
              <li>Der Vorgang kann nicht rückgängig gemacht werden.</li>
            </ul>
          </section>

          <section className="mt-7">
            <h2 className="font-extrabold text-slate-950">
              Club und Clubdaten löschen
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Club-Administratoren können unter
              <span className="font-semibold text-slate-950">
                {" "}Admin → Club → Club dauerhaft löschen
              </span>{" "}
              einen Club einschließlich Sessions, Spielern, Ergebnissen, Teams,
              MVP-Daten, Fotos und Clubdateien entfernen.
            </p>
          </section>

          <section className="mt-7 rounded-2xl border border-slate-200 p-5">
            <h2 className="font-extrabold text-slate-950">
              Kein Zugriff mehr auf dein Konto?
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Schreibe von der für strikr verwendeten E-Mail-Adresse an{" "}
              <a
                href="mailto:mb1607@gmx.de?subject=strikr%20Kontol%C3%B6schung"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                mb1607@gmx.de
              </a>
              . Zur Vermeidung unberechtigter Löschungen kann eine Prüfung der
              Kontoinhaberschaft erforderlich sein.
            </p>
          </section>

          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-sm">
            <Link
              href="/support"
              className="font-semibold text-slate-950 underline underline-offset-4"
            >
              Support
            </Link>
            <Link
              href="/datenschutz"
              className="font-semibold text-slate-950 underline underline-offset-4"
            >
              Datenschutz
            </Link>
            <Link
              href="/impressum"
              className="font-semibold text-slate-950 underline underline-offset-4"
            >
              Impressum
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
