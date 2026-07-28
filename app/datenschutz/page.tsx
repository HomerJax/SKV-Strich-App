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

        <div className="mt-5 rounded-[28px] border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            Datenschutz
          </div>

          <h1 className="mt-3 text-3xl font-black tracking-tight">
            Datenschutzerklärung
          </h1>

          <p className="mt-3 text-sm text-slate-500">Stand: 28. Juli 2026</p>

          <div className="mt-7 space-y-7 text-sm leading-7 text-slate-700">
            <section>
              <h2 className="font-extrabold text-slate-950">
                1. Verantwortlicher
              </h2>
              <p className="mt-2">
                Marcus Bofinger
                <br />
                Flachter Straße 9
                <br />
                71277 Rutesheim
                <br />
                Deutschland
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
                2. Geltungsbereich
              </h2>
              <p className="mt-2">
                Diese Datenschutzerklärung gilt für die Website strikr.team,
                die strikr Web-App und die mobilen strikr Apps. strikr hilft
                Fußballteams dabei, Trainings zu organisieren, Anwesenheiten zu
                verwalten, Teams zu bilden, Ergebnisse zu dokumentieren und
                Statistiken sowie MVP-Abstimmungen auszuwerten.
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                3. Welche Daten verarbeitet werden
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  <span className="font-semibold text-slate-950">
                    Konto- und Profildaten:
                  </span>{" "}
                  E-Mail-Adresse, Benutzer-ID, Name, Passwortinformationen in
                  verschlüsselter Form sowie Club- und Rollen-Zuordnungen.
                </p>
                <p>
                  <span className="font-semibold text-slate-950">
                    Spieler- und Trainingsdaten:
                  </span>{" "}
                  Namen oder Spitznamen, Position, Stärke, Kategorie,
                  Anwesenheiten, Sessions, Teamzuordnungen, Ergebnisse, Siege,
                  Teilnahmen, Statistiken, MVP-Stimmen, Badges und Awards.
                </p>
                <p>
                  <span className="font-semibold text-slate-950">
                    Hochgeladene Inhalte:
                  </span>{" "}
                  Clublogos, Siegerfotos und daraus erzeugte Share Cards.
                </p>
                <p>
                  <span className="font-semibold text-slate-950">
                    Technische Daten:
                  </span>{" "}
                  IP-Adresse, Zeitpunkt und Art des Zugriffs, aufgerufene
                  Seiten, Browser-, Geräte- und Betriebssysteminformationen,
                  Fehler- und Sicherheitsprotokolle sowie bei aktivierten
                  Push-Benachrichtigungen Geräte- und Registrierungstoken.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                4. Zwecke und Rechtsgrundlagen
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  Die Verarbeitung erfolgt zur Bereitstellung der App und ihrer
                  Funktionen, zur Verwaltung von Konten und Clubs, zur
                  Durchführung des Trainings-Workflows, zur Kommunikation mit
                  Nutzern sowie zur Sicherung und Stabilisierung des Dienstes.
                </p>
                <p>
                  Soweit die Verarbeitung zur Nutzung von strikr erforderlich
                  ist, erfolgt sie auf Grundlage von Art. 6 Abs. 1 Buchst. b
                  DSGVO. Sicherheits-, Missbrauchs- und technische
                  Betriebsdaten werden auf Grundlage berechtigter Interessen
                  gemäß Art. 6 Abs. 1 Buchst. f DSGVO verarbeitet. Soweit eine
                  Einwilligung erforderlich ist, insbesondere bei optionalen
                  Geräteberechtigungen, gilt Art. 6 Abs. 1 Buchst. a DSGVO.
                </p>
              </div>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                5. Daten anderer Spieler
              </h2>
              <p className="mt-2">
                Club-Administratoren können Spielerprofile für Mitglieder ihres
                Teams anlegen. Sie dürfen dabei nur Daten eingeben und Bilder
                hochladen, die sie rechtmäßig verwenden dürfen. Die Daten sind
                grundsätzlich nur für Mitglieder des jeweiligen Clubs sichtbar.
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                6. Technische Dienstleister
              </h2>
              <div className="mt-2 space-y-4">
                <div>
                  <h3 className="font-bold text-slate-950">Supabase</h3>
                  <p>
                    Supabase wird für Authentifizierung, Datenbank und
                    Dateispeicherung eingesetzt. Dabei werden Konto-, Club-,
                    Spieler-, Trainings- und hochgeladene Inhaltsdaten im
                    Auftrag von strikr verarbeitet.
                  </p>
                  <a
                    href="https://supabase.com/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-950 underline underline-offset-4"
                  >
                    Datenschutzhinweise von Supabase
                  </a>
                </div>

                <div>
                  <h3 className="font-bold text-slate-950">Vercel</h3>
                  <p>
                    Vercel wird für Hosting, Bereitstellung und technische
                    Protokollierung eingesetzt. Zusätzlich wird Vercel Web
                    Analytics verwendet. Dabei werden nach Angaben von Vercel
                    anonymisierte Nutzungsdaten ohne Cookies ausgewertet.
                  </p>
                  <a
                    href="https://vercel.com/legal/privacy-notice"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-950 underline underline-offset-4"
                  >
                    Datenschutzhinweise von Vercel
                  </a>
                </div>

                <div>
                  <h3 className="font-bold text-slate-950">
                    Firebase Cloud Messaging
                  </h3>
                  <p>
                    Soweit Push-Benachrichtigungen auf einem unterstützten Gerät
                    aktiviert werden, wird Firebase Cloud Messaging von Google
                    zur Zustellung eingesetzt. Dabei können insbesondere ein
                    Geräte- oder Registrierungstoken sowie technische
                    Zustellinformationen verarbeitet werden. Push kann in den
                    Systemeinstellungen des Geräts deaktiviert werden.
                  </p>
                  <a
                    href="https://firebase.google.com/support/privacy"
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-slate-950 underline underline-offset-4"
                  >
                    Datenschutzinformationen zu Firebase
                  </a>
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                7. Übermittlung in Drittländer
              </h2>
              <p className="mt-2">
                Bei der Nutzung internationaler Dienstleister kann eine
                Verarbeitung außerhalb der Europäischen Union oder des
                Europäischen Wirtschaftsraums nicht vollständig ausgeschlossen
                werden. In diesem Fall erfolgt die Übermittlung auf Grundlage
                der jeweils anwendbaren gesetzlichen Voraussetzungen und der
                von den Dienstleistern angebotenen Datenschutzgarantien.
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                8. Speicherdauer und Löschung
              </h2>
              <div className="mt-2 space-y-3">
                <p>
                  Daten werden gespeichert, solange das jeweilige Konto oder der
                  Club besteht und sie für den Betrieb von strikr benötigt
                  werden. Technische Protokolle werden nur so lange aufbewahrt,
                  wie dies für Sicherheit, Fehleranalyse und Betrieb notwendig
                  ist.
                </p>
                <p>
                  Nutzer können ihr Konto direkt in der App unter
                  <span className="font-semibold text-slate-950">
                    {" "}Profil → Konto dauerhaft löschen
                  </span>{" "}
                  löschen. Dabei werden das Authentifizierungskonto,
                  Benachrichtigungen und direkte Kontoverknüpfungen entfernt.
                  Spielerprofile werden anonymisiert, damit bereits vorhandene
                  Club- und Ergebnisverläufe nicht verfälscht werden.
                </p>
                <p>
                  Club-Administratoren können einen Club einschließlich seiner
                  Sessions, Spieler, Ergebnisse, Teams, MVP-Daten, Fotos und
                  Clubdateien im Adminbereich dauerhaft löschen.
                </p>
                <Link
                  href="/account-loeschen"
                  className="inline-flex font-semibold text-slate-950 underline underline-offset-4"
                >
                  Anleitung zur Konto- und Datenlöschung
                </Link>
              </div>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                9. Rechte betroffener Personen
              </h2>
              <p className="mt-2">
                Betroffene Personen haben im Rahmen der gesetzlichen
                Voraussetzungen insbesondere das Recht auf Auskunft,
                Berichtigung, Löschung, Einschränkung der Verarbeitung,
                Datenübertragbarkeit und Widerspruch. Eine erteilte Einwilligung
                kann jederzeit für die Zukunft widerrufen werden.
              </p>
              <p className="mt-2">
                Anfragen können an{" "}
                <a
                  href="mailto:mb1607@gmx.de"
                  className="font-semibold text-slate-950 underline underline-offset-4"
                >
                  mb1607@gmx.de
                </a>{" "}
                gesendet werden.
              </p>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                10. Beschwerderecht
              </h2>
              <p className="mt-2">
                Es besteht das Recht, sich bei einer Datenschutzaufsichtsbehörde
                zu beschweren. Zuständig ist insbesondere der Landesbeauftragte
                für den Datenschutz und die Informationsfreiheit
                Baden-Württemberg.
              </p>
              <a
                href="https://www.baden-wuerttemberg.datenschutz.de/"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                Datenschutzaufsicht Baden-Württemberg
              </a>
            </section>

            <section>
              <h2 className="font-extrabold text-slate-950">
                11. Änderungen dieser Datenschutzerklärung
              </h2>
              <p className="mt-2">
                Diese Datenschutzerklärung wird angepasst, wenn sich Funktionen,
                eingesetzte Dienste oder rechtliche Anforderungen ändern. Es
                gilt die jeweils auf strikr.team veröffentlichte Fassung.
              </p>
            </section>

            <div className="flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5">
              <Link
                href="/support"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                Support
              </Link>
              <Link
                href="/account-loeschen"
                className="font-semibold text-slate-950 underline underline-offset-4"
              >
                Konto löschen
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
