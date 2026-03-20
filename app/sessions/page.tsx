import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type Membership = {
  user_id: string;
  club_id: string;
  role: string;
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

function fmtDateDE(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function SessionsPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: membershipData, error: membershipError } = await supabase.rpc(
    "get_my_membership"
  );

  const membership = (membershipData?.[0] as Membership | undefined) ?? null;
  const clubId = membership?.club_id ?? null;

  let seasons: Season[] | null = null;
  let sessions: SessionRow[] | null = null;
  let seasonsError: { message: string } | null = null;
  let sessionsError: { message: string } | null = null;

  if (clubId) {
    const { data: seasonsData, error: sErr } = await supabase
      .from("seasons")
      .select("id, name, start_date, end_date")
      .eq("club_id", clubId)
      .order("start_date", { ascending: false });

    const { data: sessionsData, error } = await supabase
      .from("sessions")
      .select("id, date, notes, season_id")
      .eq("club_id", clubId)
      .order("date", { ascending: false });

    seasons = (seasonsData as Season[] | null) ?? null;
    sessions = (sessionsData as SessionRow[] | null) ?? null;
    seasonsError = sErr;
    sessionsError = error;
  }

  const seasonMap = new Map<number, Season>();
  (seasons ?? []).forEach((s) => seasonMap.set(s.id, s));

  const seasonSessions = new Map<number, SessionRow[]>();
  const withoutSeason: SessionRow[] = [];

  (sessions ?? []).forEach((row) => {
    if (!row.season_id) {
      withoutSeason.push(row);
    } else {
      const arr = seasonSessions.get(row.season_id) ?? [];
      arr.push(row);
      seasonSessions.set(row.season_id, arr);
    }
  });

  const seasonListSorted = (seasons ?? []).slice();

  for (const [sid, arr] of seasonSessions.entries()) {
    arr.sort((a, b) => (a.date < b.date ? 1 : -1));
    seasonSessions.set(sid, arr);
  }

  withoutSeason.sort((a, b) => (a.date < b.date ? 1 : -1));

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
          <p className="text-xs text-slate-500">Termine, Teams & Ergebnisse.</p>
        </div>

        <Link
          href="/sessions/new"
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm"
        >
          + Neues Training
        </Link>
      </div>

      {membershipError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler beim Laden der Membership: {membershipError.message}
        </div>
      )}

      {!membershipError && !clubId && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          Kein Club für den aktuellen User gefunden.
        </div>
      )}

      {(seasonsError || sessionsError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler: {seasonsError?.message ?? sessionsError?.message}
        </div>
      )}

      <div className="space-y-3">
        {seasonListSorted.map((season) => {
          const list = seasonSessions.get(season.id) ?? [];
          if (list.length === 0) return null;

          return (
            <div
              key={season.id}
              className="rounded-xl border border-slate-200 bg-white p-3"
            >
              <div className="mb-2 text-xs font-semibold text-slate-700">
                {season.name}
              </div>

              <div className="space-y-2">
                {list.map((s) => (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="block rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm hover:bg-slate-50"
                  >
                    <div className="font-semibold text-slate-900">
                      {fmtDateDE(s.date)}
                    </div>
                    {s.notes && (
                      <div className="text-xs text-slate-500">{s.notes}</div>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {withoutSeason.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="mb-2 text-xs font-semibold text-amber-800">
              Ohne Saison
            </div>
            <div className="space-y-2">
              {withoutSeason.map((s) => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block rounded-xl border border-amber-200 bg-white px-3 py-3 shadow-sm hover:bg-amber-100"
                >
                  <div className="font-semibold text-slate-900">
                    {fmtDateDE(s.date)}
                  </div>
                  {s.notes && (
                    <div className="text-xs text-slate-500">{s.notes}</div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}