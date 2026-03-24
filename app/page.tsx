"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
};

function readCookie(name: string) {
  if (typeof document === "undefined") {
    return null;
  }

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

export default function HomePage() {
  const router = useRouter();
  const hasRedirectedRef = useRef(false);
  const supabase = useMemo(() => createClient(), []);

  const [isLoading, setIsLoading] = useState(true);
  const [clubName, setClubName] = useState("Dein Team");
  const [clubLogoUrl, setClubLogoUrl] = useState<string | null>(null);
  const [hasMultipleClubs, setHasMultipleClubs] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const feedbackHref = useMemo(
    () => "mailto:mb1607@gmx.de?subject=strikr%20Feedback",
    []
  );

  useEffect(() => {
    let isMounted = true;

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

      await new Promise((resolve) => window.setTimeout(resolve, 350));

      const {
        data: { session: retrySession },
      } = await supabase.auth.getSession();

      if (retrySession?.user) {
        return retrySession.user;
      }

      const {
        data: { user: retryUser },
      } = await supabase.auth.getUser();

      return retryUser ?? null;
    }

    async function loadHome() {
      setIsLoading(true);
      setErrorMessage(null);

      const user = await resolveAuthenticatedUser();

      if (!isMounted) {
        return;
      }

      if (!user) {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace("/login");
          router.refresh();
        }
        return;
      }

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", user.id);

      if (!isMounted) {
        return;
      }

      if (membershipsError) {
        setErrorMessage("Deine Teams konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const memberships = (membershipsData ?? []) as MembershipRow[];

      if (memberships.length === 0) {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace("/waiting-for-invite");
          router.refresh();
        }
        return;
      }

      const multipleClubs = memberships.length > 1;
      setHasMultipleClubs(multipleClubs);

      const validClubIds = new Set(
        memberships
          .map((membership) => membership.club_id)
          .filter((value): value is string => Boolean(value))
      );

      const activeClubIdFromCookie = readCookie("active_club_id");

      let activeClubId: string | null = null;

      if (activeClubIdFromCookie && validClubIds.has(activeClubIdFromCookie)) {
        activeClubId = activeClubIdFromCookie;
      } else if (memberships.length === 1) {
        activeClubId = memberships[0].club_id;
        writeCookie("active_club_id", activeClubId);
      } else {
        if (!hasRedirectedRef.current) {
          hasRedirectedRef.current = true;
          router.replace("/select-club");
          router.refresh();
        }
        return;
      }

      const { data: clubData, error: clubError } = await supabase
        .from("clubs")
        .select("id, display_name, logo_path")
        .eq("id", activeClubId)
        .maybeSingle();

      if (!isMounted) {
        return;
      }

      if (clubError) {
        setErrorMessage("Dein aktives Team konnte nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const club = (clubData ?? null) as ClubRow | null;
      setClubName(club?.display_name?.trim() || "Dein Team");

      if (club?.logo_path) {
        const { data: signedLogo, error: logoError } = await supabase.storage
          .from("club-logos")
          .createSignedUrl(club.logo_path, 60 * 60);

        if (isMounted && !logoError) {
          setClubLogoUrl(signedLogo?.signedUrl ?? null);
        }
      } else {
        setClubLogoUrl(null);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadHome();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!hasRedirectedRef.current) {
        loadHome();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-100 pb-24">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-[24px] border border-black/10 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-neutral-600">Startseite wird geladen...</p>
          </div>
        </section>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-neutral-100 pb-24">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
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
    <main className="min-h-screen bg-neutral-100 pb-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-6 text-center">
            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-3 py-2">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-sm">
                {clubLogoUrl ? (
                  <Image
                    src={clubLogoUrl}
                    alt={`${clubName} Logo`}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    unoptimized
                  />
                ) : (
                  <Image
                    src="/icon-dark.png"
                    alt="strikr Logo"
                    width={40}
                    height={40}
                    className="h-full w-full object-contain"
                    priority
                  />
                )}
              </div>

              <span className="max-w-[200px] truncate text-sm font-semibold text-white sm:max-w-none sm:text-base">
                {clubName}
              </span>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Image
                src="/icon-dark.png"
                alt="strikr Logo"
                width={24}
                height={24}
                className="h-6 w-6 object-contain invert"
                priority
              />
            </div>

            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Teamtage einfacher organisieren.
            </h1>

            <p className="text-xs leading-5 text-white/75 sm:text-sm">
              Planung, Teams und Ergebnisse — alles an einem Ort.
            </p>
          </div>
        </div>

        <section className="mx-auto flex w-full max-w-2xl flex-col gap-3 pt-2">
          <div className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-slate-500">
                  Start
                </div>

                <h2 className="mt-1 text-2xl font-extrabold text-slate-950">
                  Starte mit einer Trainingssession
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Erstelle eine neue Session oder springe direkt in eure
                  Trainings und Tabellen.
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-100">
                <Image
                  src="/icon-dark.png"
                  alt="strikr Logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 object-contain"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/sessions/new"
                className="rounded-xl bg-slate-950 px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Trainingssession starten
              </Link>

              <Link
                href="/sessions"
                className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
              >
                Sessions ansehen
              </Link>

              <Link
                href="/standings"
                className="rounded-xl border px-4 py-2.5 text-center text-sm font-semibold"
              >
                Tabelle ansehen
              </Link>
            </div>

            {hasMultipleClubs ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <Link
                  href="/select-club"
                  className="text-sm font-semibold text-slate-700 underline underline-offset-4"
                >
                  Team wechseln
                </Link>
              </div>
            ) : null}
          </div>

          <a
            href={feedbackHref}
            className="rounded-[24px] border border-black/10 bg-white p-5 text-sm shadow"
          >
            Feedback oder Probleme? → Mail senden
          </a>
        </section>
      </section>
    </main>
  );
}