import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

type Membership = {
  club_id: string;
  role: "admin" | "member";
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
  const activeClubIdFromCookie = cookieStore.get("active_club_id")?.value ?? null;

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/sessions");
  }

  const { data: membershipsData, error: membershipError } = await supabase
    .from("club_memberships")
    .select("club_id, role")
    .eq("user_id", user.id);

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  const memberships = (membershipsData ?? []) as Membership[];

  if (memberships.length === 0) {
    redirect("/club-setup");
  }

  const validClubIds = new Set(memberships.map((m) => m.club_id));

  const clubId =
    memberships.length === 1
      ? memberships[0].club_id
      : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
        ? activeClubIdFromCookie
        : null;

  if (!clubId) {
    redirect("/select-club");
  }

  let seasons: Season[] | null = null;
  let sessions: SessionRow[] | null = null;
  let seasonsError: { message: string } | null = null;
  let sessionsError: { message: string } | null = null;

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

  const totalSessions = (sessions ?? []).length;

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

      {(seasonsError || sessionsError) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler: {seasonsError?.message ?? sessionsError?.message}
        </div>
      )}

      {!seasonsError && !sessionsError && totalSessions === 0 && (
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
      )}
    </div>
  );
}