import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireClub } from "@/lib/auth/guards";
import PageHero from "@/components/PageHero";

type PageProps = {
  params: Promise<{
    seasonId: string;
  }>;
};

type Season = {
  id: number;
  club_id: string;
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

export default async function ArchivedSeasonDetailPage({ params }: PageProps) {
  const { clubId } = await requireClub();
  const { seasonId } = await params;
  const parsedSeasonId = Number(seasonId);

  if (!Number.isFinite(parsedSeasonId)) {
    notFound();
  }

  const supabase = await createClient();

  const [
    { data: clubData },
    { data: seasonData, error: seasonError },
    { data: sessionsData, error: sessionsError },
  ] = await Promise.all([
    supabase
      .from("clubs")
      .select("id, display_name, primary_color")
      .eq("id", clubId)
      .maybeSingle<ClubRow>(),
    supabase
      .from("seasons")
      .select("id, club_id, name, start_date, end_date")
      .eq("id", parsedSeasonId)
      .eq("club_id", clubId)
      .maybeSingle<Season>(),
    supabase
      .from("sessions")
      .select("id, date, notes, season_id")
      .eq("club_id", clubId)
      .eq("season_id", parsedSeasonId)
      .order("date", { ascending: false }),
  ]);

  if (seasonError || sessionsError) {
    throw new Error(
      seasonError?.message ??
        sessionsError?.message ??
        "Archiv-Saisondaten konnten nicht geladen werden."
    );
  }

  const club = (clubData ?? null) as ClubRow | null;
  const season = (seasonData ?? null) as Season | null;
  const sessions = (sessionsData ?? []) as SessionRow[];

  if (!season) {
    notFound();
  }

  const todayIso = getTodayIsoDate();
  const isArchived = season.end_date ? season.end_date < todayIso : false;

  if (!isArchived) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/sessions/archive"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Archiv
          </Link>

          <Link
            href="/sessions"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            Aktuelle Trainings
          </Link>
        </div>

        <PageHero
          eyebrow="Archiv"
          title={season.name}
          description={`Archivierte Einheiten dieser Saison · ${fmtDateRangeDE(
            season.start_date,
            season.end_date
          )}`}
          primaryColorKey={club?.primary_color}
          action={
            <div className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm">
              {sessions.length} {sessions.length === 1 ? "Einheit" : "Einheiten"}
            </div>
          }
        />

        {sessions.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="max-w-xl">
              <div className="text-sm font-semibold text-slate-500">Leer</div>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                In dieser Saison wurden keine Einheiten gefunden.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Die Saison existiert bereits, enthält aber aktuell keine
                archivierten Trainings.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-slate-900">
                Einheiten dieser Saison
              </div>
              <div className="text-xs text-slate-500">
                Neueste vergangene zuerst
              </div>
            </div>

            <div className="space-y-3">
              {sessions.map((session) => (
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
        )}
      </section>
    </main>
  );
}