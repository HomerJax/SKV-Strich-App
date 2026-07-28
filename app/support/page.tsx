import Link from "next/link";

export default function SupportPage() {
  const supportMail =
    "mailto:mb1607@gmx.de?subject=strikr%20Supportanfrage";

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
            Hilfe & Kontakt
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            strikr Support
          </h1>

          <p className="mt-4 text-sm leading-7 text-slate-600 sm:text-base">
            Du hast ein Problem mit deinem Konto, einem Club, einer Session oder
            einer Funktion in strikr? Schreib eine E-Mail mit einer kurzen
            Beschreibung. Screenshots helfen bei technischen Problemen.
          </p>

          <a
            href={supportMail}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            Support per E-Mail kontaktieren
          </a>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-extrabold text-slate-950">
                Technische Probleme
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Bitte nenne Gerät, Betriebssystem, betroffene Seite und die
                Schritte, nach denen der Fehler auftritt.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h2 className="font-extrabold text-slate-950">
                Konto & Datenschutz
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Für Auskunft, Berichtigung oder Löschfragen kannst du dieselbe
                Support-Adresse verwenden.
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-7 text-blue-950">
            <h2 className="font-extrabold">Konto dauerhaft löschen</h2>
            <p className="mt-2">
              Angemeldete Nutzer können ihr Konto direkt unter
              <span className="font-semibold"> Profil → Konto dauerhaft löschen</span>
              {" "}entfernen. Eine öffentliche Schritt-für-Schritt-Anleitung
              findest du auf der Löschseite.
            </p>
            <Link
              href="/account-loeschen"
              className="mt-3 inline-flex font-bold underline underline-offset-4"
            >
              Anleitung zur Kontolöschung
            </Link>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-5 text-sm text-slate-600">
            <p>
              Support-Kontakt: Marcus Bofinger ·{" "}
              <a
                href="mailto:mb1607@gmx.de"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                mb1607@gmx.de
              </a>
            </p>

            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
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
        </div>
      </section>
    </main>
  );
}
