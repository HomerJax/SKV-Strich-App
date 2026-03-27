import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireFounder } from "@/lib/auth/founder";

type SessionRow = {
  id: string | number;
  club_id: string;
  title?: string | null;
  created_at: string;
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

export default async function FounderSessionsPage({
  searchParams,
}: PageProps) {
  await requireFounder();
  const resolvedSearchParams = await searchParams;

  const range = resolvedSearchParams?.range === "7d" ? "7d" : "all";

  const supabase = await createClient();
  const sevenDaysAgoIso = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  let sessionsQuery = supabase
    .from("sessions")
    .select("id, club_id, title, created_at")
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
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="px-3 py-3 font-medium">Titel</th>
                    <th className="px-3 py-3 font-medium">Club</th>
                    <th className="px-3 py-3 font-medium">Erstellt am</th>
                    <th className="px-3 py-3 font-medium">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={String(session.id)} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-950">
                        {session.title?.trim() || "Training"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {clubNameById.get(session.club_id) ?? "Unbekannter Club"}
                      </td>
                      <td className="px-3 py-3 text-slate-700">
                        {formatDateTime(session.created_at)}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {String(session.id)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}