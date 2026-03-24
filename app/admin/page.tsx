"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
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

export default function AdminPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clubName, setClubName] = useState("Dein Club");
  const [roleLabel, setRoleLabel] = useState("Mitglied");

  useEffect(() => {
    let isMounted = true;

    async function loadAdmin() {
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

      const { data: membershipData, error: membershipError } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", user.id);

      if (!isMounted) return;

      if (membershipError) {
        setErrorMessage("Deine Club-Mitgliedschaften konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const memberships = (membershipData ?? []) as MembershipRow[];

      if (memberships.length === 0) {
        router.replace("/waiting-for-invite");
        router.refresh();
        return;
      }

      const activeClubIdFromCookie = readCookie("active_club_id");
      const validClubIds = new Set(
        memberships.map((membership) => membership.club_id).filter(Boolean)
      );

      let activeClubId: string | null = null;

      if (activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)) {
        activeClubId = activeClubIdFromCookie;
      } else if (memberships.length === 1) {
        activeClubId = memberships[0].club_id;
        writeCookie("active_club_id", activeClubId);
      } else {
        router.replace("/select-club");
        router.refresh();
        return;
      }

      const activeMembership =
        memberships.find((membership) => membership.club_id === activeClubId) ??
        null;

      if (!activeMembership) {
        router.replace("/select-club");
        router.refresh();
        return;
      }

      if (activeMembership.role !== "admin") {
        router.replace("/");
        router.refresh();
        return;
      }

      setRoleLabel(activeMembership.role === "admin" ? "Admin" : "Mitglied");

      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("id, display_name")
        .eq("id", activeClubId)
        .maybeSingle();

      if (!isMounted) return;

      if (clubError) {
        setErrorMessage("Der aktive Club konnte nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const club = (clubData ?? null) as ClubRow | null;
      setClubName(club?.display_name?.trim() || "Dein Club");
      setIsLoading(false);
    }

    loadAdmin();

    return () => {
      isMounted = false;
    };
  }, [router, supabase]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-[24px] border border-black/10 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-neutral-600">Adminbereich wird geladen...</p>
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-[24px] border border-red-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Erneut laden
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[28px] border border-slate-800/10 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                Adminbereich
              </div>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                {clubName}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Verwalte Mitglieder, Einladungen, Spieler, Einstellungen und
                Club-Branding für deinen aktuell aktiven Club.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
              <div className="text-sm font-medium">Rolle im aktiven Club:</div>
              <div className="mt-1 text-2xl font-bold">{roleLabel}</div>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <Link
            href="/admin/invites"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">
              Einladungen
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Erzeuge Einladungslinks, kopiere sie oder teile sie direkt per
              WhatsApp, E-Mail oder über die Teilen-Funktion deines Geräts.
            </p>
          </Link>

          <Link
            href="/admin/players"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">Spieler</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Spieler verwalten, Rollen prüfen und Gastspieler sinnvoll im
              Teamkontext pflegen.
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">
              Einstellungen
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Saisonlogik, Kategorien, Positionslabels und Teamgenerator-Optionen
              für diesen Club anpassen.
            </p>
          </Link>

          <Link
            href="/admin/club"
            className="rounded-[24px] border border-slate-800/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-sm font-semibold text-slate-900">
              Club &amp; Branding
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Clubname, Logo und visuelle Darstellung des aktuell aktiven Clubs
              verwalten.
            </p>
          </Link>
        </div>
      </section>
    </main>
  );
}