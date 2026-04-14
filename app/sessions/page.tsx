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

  const seasonSessions = new Map<number, SessionRow[]>();
  const withoutSeason: SessionRow[] = [];

  sessions.forEach((row) => {
    if (!row.season_id) {
      withoutSeason.push(row);
    } else {
      const arr = seasonSessions.get(row.season_id) ?? [];
      arr.push(row);
      seasonSessions.set(row.season_id, arr);
    }
  });

  const seasonListSorted = seasons.slice();

  for (const [sid, arr] of seasonSessions.entries()) {
    arr.sort((a, b) => (a.date < b.date ? 1 : -1));
    seasonSessions.set(sid, arr);
  }

  withoutSeason.sort((a, b) => (a.date < b.date ? 1 : -1));

  const totalSessions = sessions.length;

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

        {totalSessions > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
            {totalSessions} {totalSessions === 1 ? "Training" : "Trainings"} gespeichert.
          </div>
        )}

        {totalSessions === 0 && (
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
        )}

        {totalSessions > 0 && (
          <div className="space-y-4">
            {seasonListSorted.map((season) => {
              const list = seasonSessions.get(season.id) ?? [];
              if (list.length === 0) return null;

              return (
                <div
                  key={season.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold text-slate-900">
                      {season.name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {list.length} {list.length === 1 ? "Training" : "Trainings"}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {list.map((session) => (
                      <Link
                        key={session.id}
                        href={`/sessions/${session.id}`}
                        className="block rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition hover:bg-slate-50"
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
              );
            })}

            {withoutSeason.length > 0 && (
              <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="mb-1 text-sm font-semibold text-amber-900">
                  Ohne Saison
                </div>
                <div className="mb-3 text-xs text-amber-800/80">
                  Diese Trainings konnten keinem Saisonzeitraum zugeordnet werden.
                </div>

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
            )}
          </div>
        )}
      </section>
    </main>
  );
}