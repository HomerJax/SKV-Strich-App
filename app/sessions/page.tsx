import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import PageHero from "@/components/PageHero";

type SessionsPageProps = {
  searchParams?: Promise<{
    success?: string;
  }>;
};

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type SessionRow = {
  id: number;
  date: string;
  notes: string | null;
  season_id: number | null;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  primary_color: string | null;
};

function fmtDateDE(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDateWithinSeason(dateIso: string, season: Season) {
  if (!season.start_date || !season.end_date) return false;
  return dateIso >= season.start_date && dateIso <= season.end_date;
}

function getCurrentSeason(seasons: Season[]) {
  const today = getTodayIsoDate();
  const current = seasons.find((season) => isDateWithinSeason(today, season));
  if (current) return current;
  return seasons[0] ?? null;
}

function sortAscByDate(a: SessionRow, b: SessionRow) {
  return a.date.localeCompare(b.date);
}

function sortDescByDate(a: SessionRow, b: SessionRow) {
  return b.date.localeCompare(a.date);
}

function SessionCard({ session }: { session: SessionRow }) {
  return (
    <Link
      href={`/sessions/${session.id}`}
      className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
    >
      <div className="text-xl font-bold tracking-tight text-slate-950">
        {fmtDateDE(session.date)}
      </div>
      {session.notes ? (
        <div className="mt-1 text-sm text-slate-500">{session.notes}</div>
      ) : (
        <div className="mt-1 text-sm text-slate-400">Keine Notiz hinterlegt</div>
      )}
    </Link>
  );
}

export default async function SessionsPage({
  searchParams,
}: SessionsPageProps) {
  const { clubId } = await requireClub();
  const supabase = await createClient();
  const resolvedSearchParams = await searchParams;
  const successMessage = resolvedSearchParams?.success ?? "";

  const [
    { data: clubData },
    { data: seasonsData, error: seasonsError },
    { data: sessionsData, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, date, notes, season_id")
      .eq("club_id", clubId)
      .order("date", { ascending: false }),
  ]);

  if (seasonsError || sessionsError) {
    throw new Error(
      seasonsError?.message ??
        sessionsError?.message ??
        "Daten konnten nicht geladen werden."
    );
  }

  const club = (clubData ?? null) as ClubRow | null;
  const seasons = (seasonsData as Season[] | null) ?? [];
  const sessions = (sessionsData as SessionRow[] | null) ?? [];
  const totalSessions = sessions.length;

  const todayIso = getTodayIsoDate();
  const currentSeason = getCurrentSeason(seasons);
  const currentSeasonId = currentSeason?.id ?? null;

  const currentSeasonSessions = sessions
    .filter((session) => session.season_id === currentSeasonId)
    .slice();

  const withoutSeason = sessions
    .filter((session) => session.season_id == null)
    .slice()
    .sort(sortDescByDate);

  const futureCurrentSeasonSessions = currentSeasonSessions
    .filter((session) => session.date >= todayIso)
    .slice()
    .sort(sortAscByDate);

  const pastCurrentSeasonSessions = currentSeasonSessions
    .filter((session) => session.date < todayIso)
    .slice()
    .sort(sortDescByDate);

  const nextSession =
    futureCurrentSeasonSessions.length > 0 ? futureCurrentSeasonSessions[0] : null;

  const moreUpcomingSessions =
    futureCurrentSeasonSessions.length > 1
      ? futureCurrentSeasonSessions.slice(1)
      : [];

  const archivedSeasons = seasons.filter(
    (season) => currentSeasonId !== null && season.id !== currentSeasonId
  );

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zur Startseite
          </Link>
        </div>

        <PageHero
          eyebrow="Trainings"
          title="Trainingsübersicht"
          description="Termine, Teams und Ergebnisse an einem Ort."
          primaryColorKey={club?.primary_color}
          action={
            <Link
              href="/sessions/new"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90"
            >
              + Neues Training
            </Link>
          }
        />

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {totalSessions > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
            {totalSessions} {totalSessions === 1 ? "Training" : "Trainings"} gespeichert.
            {currentSeason ? (
              <span className="ml-2 text-slate-400">
                · Aktive Saison: {currentSeason.name}
              </span>
            ) : null}
          </div>
        ) : null}

        {totalSessions === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="max-w-lg">
              <div className="text-sm font-semibold text-slate-500">Noch leer</div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Ihr habt noch kein Training erstellt.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Lege jetzt eure erste Session an. Danach kannst du Anwesenheiten
                pflegen, Teams generieren, Ergebnisse speichern und die Tabelle
                direkt in strikr nutzen.
              </p>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Link
                  href="/sessions/new"
                  className="rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Erstes Training erstellen
                </Link>

                <Link
                  href="/"
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-700"
                >
                  Zur Startseite
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {currentSeason ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-1 text-sm font-semibold text-slate-500">
                  Aktuelle Saison
                </div>
                <div className="text-lg font-bold tracking-tight text-slate-950">
                  {currentSeason.name}
                </div>
                {currentSeason.start_date && currentSeason.end_date ? (
                  <div className="mt-1 text-sm text-slate-500">
                    {fmtDateDE(currentSeason.start_date)} –{" "}
                    {fmtDateDE(currentSeason.end_date)}
                  </div>
                ) : null}
              </div>
            ) : null}

            {nextSession ? (
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-500">
                      Als Nächstes
                    </div>
                    <div className="text-lg font-bold tracking-tight text-slate-950">
                      Nächste Einheit
                    </div>
                  </div>
                </div>

                <SessionCard session={nextSession} />
              </div>
            ) : (
              <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="text-sm font-semibold text-slate-500">
                  Als Nächstes
                </div>
                <div className="mt-1 text-lg font-bold tracking-tight text-slate-950">
                  Keine kommende Einheit
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  In der aktuellen Saison ist gerade keine weitere Trainingseinheit
                  geplant.
                </p>
              </div>
            )}

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-slate-900">
                  Kommende Einheiten
                </div>
                <div className="text-xs text-slate-500">
                  {futureCurrentSeasonSessions.length}{" "}
                  {futureCurrentSeasonSessions.length === 1
                    ? "Einheit"
                    : "Einheiten"}
                </div>
              </div>

              {moreUpcomingSessions.length > 0 ? (
                <div className="space-y-3">
                  {moreUpcomingSessions.map((session) => (
                    <SessionCard key={session.id} session={session} />
                  ))}
                </div>
              ) : nextSession ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Aktuell gibt es keine weiteren kommenden Einheiten außer der
                  nächsten oben.
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  Es gibt aktuell keine kommenden Einheiten in der laufenden
                  Saison.
                </div>
              )}
            </div>

            <details className="group rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer list-none">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      Vergangene Einheiten
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Nur aus der aktuellen Saison
                    </div>
                  </div>

                  <div className="rounded-full border border-black/10 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500 transition group-open:rotate-180">
                    ⌄
                  </div>
                </div>
              </summary>

              <div className="mt-4 border-t border-slate-100 pt-4">
                {pastCurrentSeasonSessions.length > 0 ? (
                  <div className="space-y-3">
                    {pastCurrentSeasonSessions.map((session) => (
                      <SessionCard key={session.id} session={session} />
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                    In der aktuellen Saison gibt es noch keine vergangenen
                    Einheiten.
                  </div>
                )}
              </div>
            </details>

            {withoutSeason.length > 0 ? (
              <details className="group rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <summary className="cursor-pointer list-none">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-amber-900">
                        Ohne Saison
                      </div>
                      <div className="mt-1 text-xs text-amber-800/80">
                        Diese Trainings konnten keinem Saisonzeitraum zugeordnet
                        werden.
                      </div>
                    </div>

                    <div className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-semibold text-amber-700 transition group-open:rotate-180">
                      ⌄
                    </div>
                  </div>
                </summary>

                <div className="mt-4 border-t border-amber-200/60 pt-4">
                  <div className="space-y-3">
                    {withoutSeason.map((session) => (
                      <Link
                        key={session.id}
                        href={`/sessions/${session.id}`}
                        className="block rounded-2xl border border-amber-200 bg-white px-4 py-4 shadow-sm transition hover:bg-amber-100"
                      >
                        <div className="text-xl font-bold tracking-tight text-slate-950">
                          {fmtDateDE(session.date)}
                        </div>
                        {session.notes ? (
                          <div className="mt-1 text-sm text-slate-500">
                            {session.notes}
                          </div>
                        ) : (
                          <div className="mt-1 text-sm text-slate-400">
                            Keine Notiz hinterlegt
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              </details>
            ) : null}

            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Saison-Archiv
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    Vergangene, abgeschlossene Saisons separat ansehen.
                  </div>
                </div>

                <Link
                  href="/sessions/archive"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Archiv öffnen
                  {archivedSeasons.length > 0 ? ` (${archivedSeasons.length})` : ""}
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}