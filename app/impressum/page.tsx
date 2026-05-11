import Link from "next/link";

export default function ImpressumPage() {
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
            Rechtliches
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Impressum
          </h1>

          <div className="mt-6 space-y-6 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="font-extrabold text-slate-950">
                Angaben gemäß § 5 TMG
              </h2>
              <p className="mt-2">
                Marcus Bofinger
                <br />
                Deutschland
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">Kontakt</h2>
              <p className="mt-2">
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
                Verantwortlich für den Inhalt
              </h2>
              <p className="mt-2">Marcus Bofinger</p>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              Hinweis: Diese Seite ist aktuell als erste vertrauensbildende
              Kontakt- und Anbieterkennzeichnung angelegt. Die finalen
              rechtlichen Angaben sollten vor aktiver Bewerbung noch vollständig
              geprüft und ergänzt werden.
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
