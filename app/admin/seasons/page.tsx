"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type Season = {
  id: number;
  name: string;
  start_date: string | null;
  club_id: string;
};

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

export default function SeasonsAdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [clubId, setClubId] = useState<string | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resolveAuthenticatedUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      return session.user;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return user;
    }

    for (let attempt = 0; attempt < 6; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 250));

      const {
        data: { session: retrySession },
      } = await supabase.auth.getSession();

      if (retrySession?.user) {
        return retrySession.user;
      }

      const {
        data: { user: retryUser },
      } = await supabase.auth.getUser();

      if (retryUser) {
        return retryUser;
      }
    }

    return null;
  }

  async function loadSeasonsForClub(currentClubId: string) {
    const { data, error } = await supabase
      .from("seasons")
      .select("id, name, start_date, club_id")
      .eq("club_id", currentClubId)
      .order("start_date", { ascending: false });

    if (error) {
      setError(error.message);
      return;
    }

    setSeasons((data ?? []) as Season[]);
  }

  useEffect(() => {
    let isMounted = true;

    async function initPage() {
      setPageLoading(true);
      setError(null);

      const user = await resolveAuthenticatedUser();

      if (!isMounted) return;

      if (!user) {
        router.replace("/login");
        router.refresh();
        return;
      }

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", user.id);

      if (!isMounted) return;

      if (membershipsError) {
        setError(membershipsError.message);
        setPageLoading(false);
        return;
      }

      const memberships = (membershipsData ?? []) as MembershipRow[];

      if (memberships.length === 0) {
        router.replace("/waiting-for-invite");
        router.refresh();
        return;
      }

      const activeClubIdFromCookie = readCookie("active_club_id");
      const validClubIds = new Set(
        memberships.map((membership) => membership.club_id)
      );

      const activeClubId =
        memberships.length === 1
          ? memberships[0].club_id
          : activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)
            ? activeClubIdFromCookie
            : null;

      if (!activeClubId) {
        router.replace("/select-club");
        router.refresh();
        return;
      }

      if (memberships.length === 1) {
        writeCookie("active_club_id", activeClubId);
      }

      const activeMembership =
        memberships.find((membership) => membership.club_id === activeClubId) ??
        null;

      if (!activeMembership || activeMembership.role !== "admin") {
        router.replace("/admin");
        router.refresh();
        return;
      }

      setClubId(activeClubId);
      await loadSeasonsForClub(activeClubId);

      if (isMounted) {
        setPageLoading(false);
      }
    }

    initPage();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  async function addSeason(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);

    if (!clubId) {
      setError("Kein aktiver Club gefunden.");
      return;
    }

    if (!name.trim()) {
      setError("Name darf nicht leer sein.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.from("seasons").insert({
        club_id: clubId,
        name: name.trim(),
        start_date: startDate || null,
      });

      if (error) throw error;

      setName("");
      setStartDate("");
      setMsg("Saison angelegt.");
      await loadSeasonsForClub(clubId);
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Anlegen.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSeason(id: number) {
    if (!clubId) {
      setError("Kein aktiver Club gefunden.");
      return;
    }

    if (!confirm("Saison wirklich löschen?")) return;

    setError(null);
    setMsg(null);

    try {
      setLoading(true);

      const { error } = await supabase
        .from("seasons")
        .delete()
        .eq("id", id)
        .eq("club_id", clubId);

      if (error) throw error;

      setMsg("Saison gelöscht.");
      await loadSeasonsForClub(clubId);
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Löschen.");
    } finally {
      setLoading(false);
    }
  }

  if (pageLoading) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto w-full max-w-4xl px-4 py-6">
          <div className="mb-4 flex items-center">
            <Link
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
            >
              ← Zurück zum Adminbereich
            </Link>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-5 text-sm text-slate-600 shadow-sm">
            Saisons werden geladen...
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto w-full max-w-4xl px-4 py-6">
        <div className="mb-4 flex items-center">
          <Link
            href="/admin"
            className="inline-flex items-center justify-center rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-900/20"
          >
            ← Zurück zum Adminbereich
          </Link>
        </div>

        <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950">
            Saisons verwalten
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Lege Saisons für den aktuell aktiven Club an und verwalte bestehende
            Einträge.
          </p>

          <form
            onSubmit={addSeason}
            className="mt-6 space-y-3 rounded-2xl border border-black/10 bg-neutral-50 p-4"
          >
            <div className="text-sm font-semibold text-slate-800">
              Neue Saison
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <input
                className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                placeholder="z. B. Saison 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="date"
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Speichere..." : "Anlegen"}
              </button>
            </div>

            {msg ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {msg}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            ) : null}
          </form>

          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Bestehende Saisons
            </div>

            {seasons.length === 0 ? (
              <div className="text-sm text-slate-500">
                Noch keine Saisons angelegt.
              </div>
            ) : (
              <ul className="space-y-2">
                {seasons.map((season) => (
                  <li
                    key={season.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3"
                  >
                    <div>
                      <div className="font-medium text-slate-900">
                        {season.name}
                      </div>
                      {season.start_date ? (
                        <div className="text-xs text-slate-500">
                          Start:{" "}
                          {new Date(season.start_date).toLocaleDateString(
                            "de-DE"
                          )}
                        </div>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteSeason(season.id)}
                      className="text-sm font-medium text-red-600"
                    >
                      Löschen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}