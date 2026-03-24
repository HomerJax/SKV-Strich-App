"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

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

function readCookie(name: string) {
  if (typeof document === "undefined") return null;

  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];

  return value ? decodeURIComponent(value) : null;
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function SessionsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [clubId, setClubId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadPage() {
      setIsLoading(true);
      setErrorMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user ?? null;

      if (!user) {
        router.replace("/login");
        router.refresh();
        return;
      }

      const { data: membershipsData, error: membershipError } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", user.id);

      if (!isMounted) return;

      if (membershipError) {
        setErrorMessage(membershipError.message);
        setIsLoading(false);
        return;
      }

      const memberships = (membershipsData ?? []) as Membership[];

      if (memberships.length === 0) {
        router.replace("/waiting-for-invite");
        router.refresh();
        return;
      }

      const activeClubIdFromCookie = readCookie("active_club_id");
      const validClubIds = new Set(memberships.map((membership) => membership.club_id));

      const resolvedClubId =
        memberships.length === 1
          ? memberships[0].club_id
          : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
            ? activeClubIdFromCookie
            : null;

      if (!resolvedClubId) {
        router.replace("/select-club");
        router.refresh();
        return;
      }

      if (memberships.length === 1) {
        writeCookie("active_club_id", resolvedClubId);
      }

      const [{ data: seasonsData, error: seasonsError }, { data: sessionsData, error: sessionsError }] =
        await Promise.all([
          supabase
            .from("seasons")
            .select("id, name, start_date, end_date")
            .eq("club_id", resolvedClubId)
            .order("start_date", { ascending: false }),
          supabase
            .from("sessions")
            .select("id, date, notes, season_id")
            .eq("club_id", resolvedClubId)
            .order("date", { ascending: false }),
        ]);

      if (!isMounted) return;

      if (seasonsError || sessionsError) {
        setErrorMessage(seasonsError?.message ?? sessionsError?.message ?? "Daten konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      setClubId(resolvedClubId);
      setSeasons((seasonsData as Season[] | null) ?? []);
      setSessions((sessionsData as SessionRow[] | null) ?? []);
      setIsLoading(false);
    }

    loadPage();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
        Lade Trainings…
      </div>
    );
  }

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
          <p className="text-xs text-slate-500">Termine, Teams &amp; Ergebnisse.</p>
        </div>

        <Link
          href="/sessions/new"
          className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-sm"
        >
          + Neues Training
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          Fehler: {errorMessage}
        </div>
      )}

      {!errorMessage && totalSessions === 0 && (
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

      {!errorMessage && totalSessions > 0 && (
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
                  {list.map((session) => (
                    <Link
                      key={session.id}
                      href={`/sessions/${session.id}`}
                      className="block rounded-xl border border-slate-200 bg-white px-3 py-3 shadow-sm hover:bg-slate-50"
                    >
                      <div className="font-semibold text-slate-900">
                        {fmtDateDE(session.date)}
                      </div>
                      {session.notes && (
                        <div className="text-xs text-slate-500">{session.notes}</div>
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
                {withoutSeason.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="block rounded-xl border border-amber-200 bg-white px-3 py-3 shadow-sm hover:bg-amber-100"
                  >
                    <div className="font-semibold text-slate-900">
                      {fmtDateDE(session.date)}
                    </div>
                    {session.notes && (
                      <div className="text-xs text-slate-500">{session.notes}</div>
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