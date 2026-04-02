import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/auth/founder";

type SessionRow = {
  id: number;
  club_id: string;
  date: string | null;
  notes: string | null;
  created_at: string;
  winner_photo_path: string | null;
  season_id: number | null;
};

type ClubRow = {
  id: string;
  display_name: string | null;
};

type PageProps = {
  searchParams?: Promise<{
    range?: string;
  }>;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleString("de-DE");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "–";
  return new Date(value).toLocaleDateString("de-DE");
}

export default async function FounderSessionsPage({
  searchParams,
}: PageProps) {
  await requireFounder();
  const resolvedSearchParams = await searchParams;

  const range = resolvedSearchParams?.range === "7d" ? "7d" : "all";

  const supabase = await createClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoIso = sevenDaysAgo.toISOString();

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, club_id, date, notes, created_at, winner_photo_path, season_id")
    .order("created_at", { ascending: false });

  if (range === "7d") {
    sessionsQuery = sessionsQuery.gte("created_at", sevenDaysAgoIso);
  }

  const [sessionsResult, clubsResult] = await Promise.all([
    sessionsQuery,
    supabase.from("clubs").select("id, display_name"),
  ]);

  const sessions = sessionsResult.error
    ? []
    : ((sessionsResult.data ?? []) as SessionRow[]);

  const clubs = clubsResult.error ? [] : ((clubsResult.data ?? []) as ClubRow[]);

  const clubNameById = new Map(
    clubs.map((club) => [
      club.id,
      club.display_name?.trim() || "Unbenannter Club",
    ])
  );

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Link
            href="/founder"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Founder Dashboard
          </Link>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <CalendarDays className="h-6 w-6" strokeWidth={2.1} />
            </div>

            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Founder / Sessions
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Trainings
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Alle bisher angelegten Trainings im System.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/founder/sessions"
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              range === "all"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Alle
          </Link>

          <Link
            href="/founder/sessions?range=7d"
            className={`rounded-xl px-4 py-2 text-sm font-semibold ${
              range === "7d"
                ? "bg-slate-950 text-white"
                : "border border-slate-300 bg-white text-slate-700"
            }`}
          >
            Letzte 7 Tage
          </Link>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          {sessions.length === 0 ? (
            <div className="text-sm text-slate-600">
              Keine Trainings gefunden.
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <div
                  key={String(session.id)}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        Training am {formatDate(session.date)}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Club:{" "}
                        {clubNameById.get(session.club_id) ?? "Unbekannter Club"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Season ID: {session.season_id ?? "–"}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                      Session #{session.id}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Session-Datum
                      </div>
                      <div className="mt-1 text-sm text-slate-950">
                        {formatDate(session.date)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Erstellt am
                      </div>
                      <div className="mt-1 text-sm text-slate-950">
                        {formatDateTime(session.created_at)}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-3 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Siegerfoto
                      </div>
                      <div className="mt-1 text-sm text-slate-950">
                        {session.winner_photo_path ? "Ja" : "Nein"}
                      </div>
                    </div>
                  </div>

                  {session.notes?.trim() ? (
                    <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3">
                      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        Notizen
                      </div>
                      <div className="mt-1 text-sm text-slate-950">
                        {session.notes.trim()}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}