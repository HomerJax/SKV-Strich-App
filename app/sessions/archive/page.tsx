import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import PageHero from "@/components/PageHero";

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

type SessionCountRow = {
  season_id: number | null;
};

type ClubRow = {
  id: string;
  display_name: string | null;
  primary_color: string | null;
};

function fmtDateRangeDE(startIso: string | null, endIso: string | null) {
  if (!startIso || !endIso) return "Kein Zeitraum hinterlegt";

  const start = new Date(startIso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const end = new Date(endIso).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `${start} – ${end}`;
}

function getTodayIsoDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isSeasonArchived(season: Season, todayIso: string) {
  if (!season.end_date) return false;
  return season.end_date < todayIso;
}

export default async function SessionsArchivePage() {
  const { clubId } = await requireClub();
  const supabase = await createClient();

  const [{ data: clubData }, { data: seasonsData, error: seasonsError }, { data: sessionRowsData, error: sessionRowsError }] =
    await Promise.all([
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
        .select("season_id")
        .eq("club_id", clubId),
    ]);

  if (seasonsError || sessionRowsError) {
    throw new Error(
      seasonsError?.message ??
        sessionRowsError?.message ??
        "Archivdaten konnten nicht geladen werden."
    );
  }

  const club = (clubData ?? null) as ClubRow | null;
  const seasons = (seasonsData ?? []) as Season[];
  const sessionRows = (sessionRowsData ?? []) as SessionCountRow[];

  const todayIso = getTodayIsoDate();

  const archivedSeasons = seasons.filter((season) =>
    isSeasonArchived(season, todayIso)
  );

  const sessionCountBySeasonId = new Map<number, number>();

  for (const row of sessionRows) {
    if (!row.season_id) continue;
    sessionCountBySeasonId.set(
      row.season_id,
      (sessionCountBySeasonId.get(row.season_id) ?? 0) + 1
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link
            href="/sessions"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zu den Trainings
          </Link>
        </div>

        <PageHero
          eyebrow="Archiv"
          title="Vergangene Saisons"
          description="Hier findest du abgeschlossene Saisons mit ihren archivierten Trainingseinheiten."
          primaryColorKey={club?.primary_color}
          action={
            <Link
              href="/sessions"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-white/90"
            >
              Aktuelle Trainingsansicht
            </Link>
          }
        />

        {archivedSeasons.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="max-w-xl">
              <div className="text-sm font-semibold text-slate-500">Noch leer</div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Es gibt aktuell noch keine archivierte Saison.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Sobald eine Saison abgeschlossen ist, erscheint sie hier im Archiv.
                In der normalen Trainingsübersicht bleibt der Fokus auf der
                aktuellen Saison.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {archivedSeasons.map((season) => {
              const sessionCount = sessionCountBySeasonId.get(season.id) ?? 0;

              return (
                <Link
                  key={season.id}
                  href={`/sessions/archive/${season.id}`}
                  className="block rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-500">
                        Saisonarchiv
                      </div>
                      <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                        {season.name}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600">
                        {fmtDateRangeDE(season.start_date, season.end_date)}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                        {sessionCount} {sessionCount === 1 ? "Einheit" : "Einheiten"}
                      </div>
                      <div className="text-sm font-semibold text-slate-900">
                        Saison öffnen →
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}