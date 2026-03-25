import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";

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

function fmtDateDE(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function SessionsPage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const [
    { data: seasonsData, error: seasonsError },
    { data: sessionsData, error: sessionsError },
  ] = await Promise.all([
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
    <div className="space-y-4">
      <div>
        <Link href="/" className="text-xs text-slate-500 hover:text-slate-700">
          ← Zur Startseite
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Trainings</h1>
          <p className="text-xs text-slate-500">
            Termine, Teams &amp; Ergebnisse.
          </p>
        </div>

        <Link
          href="/sessions/new"
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm"
        >
          + Neues Training
        </Link>
      </div>

      {totalSessions > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
          {totalSessions} {totalSessions === 1 ? "Training" : "Trainings"}{" "}
          gespeichert.
        </div>
      )}

      {totalSessions === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
        <div className="space-y-3">
          {seasonListSorted.map((season) => {
            const list = seasonSessions.get(season.id) ?? [];
            if (list.length === 0) return null;

            return (
              <div
                key={season.id}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-700">
                    {season.name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {list.length} {list.length === 1 ? "Training" : "Trainings"}
                  </div>
                </div>

                <div className="space-y-2">
                  {list.map((session) => (
                    <Link
                      key={session.id}
                      href={`/sessions/${session.id}`}
                      className="block rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm hover:bg-slate-50"
                    >
                      <div className="font-semibold text-slate-900">
                        {fmtDateDE(session.date)}
                      </div>
                      {session.notes ? (
                        <div className="text-xs text-slate-500">
                          {session.notes}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400">
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
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 text-xs font-semibold text-amber-800">
                Ohne Saison
              </div>
              <div className="mb-3 text-[11px] text-amber-800/80">
                Diese Trainings konnten keinem Saisonzeitraum zugeordnet werden.
              </div>

              <div className="space-y-2">
                {withoutSeason.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block rounded-xl border border-amber-200 bg-white px-3 py-3 shadow-sm hover:bg-amber-100"
                  >
                    <div className="font-semibold text-slate-900">
                      {fmtDateDE(session.date)}
                    </div>
                    {session.notes ? (
                      <div className="text-xs text-slate-500">{session.notes}</div>
                    ) : (
                      <div className="text-xs text-slate-400">
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
    </div>
  );
}