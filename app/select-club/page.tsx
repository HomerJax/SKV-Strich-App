"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type MembershipRow = {
  club_id: string;
  role: "admin" | "member";
};

type ClubRow = {
  id: string;
  display_name: string | null;
  logo_path: string | null;
};

type ClubOption = {
  id: string;
  display_name: string;
  logo_url: string | null;
  role: "admin" | "member";
};

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Path=/; Max-Age=31536000; SameSite=Lax`;
}

export default function SelectClubPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [clubOptions, setClubOptions] = useState<ClubOption[]>([]);
  const [submittingClubId, setSubmittingClubId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadClubs() {
      setIsLoading(true);
      setErrorMessage(null);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        router.replace("/login?next=/select-club");
        return;
      }

      const { data: membershipData, error: membershipError } = await supabase
        .from("club_memberships")
        .select("club_id, role")
        .eq("user_id", session.user.id);

      if (!isMounted) {
        return;
      }

      if (membershipError) {
        setErrorMessage("Deine Teams konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const memberships = (membershipData ?? []) as MembershipRow[];

      if (memberships.length === 0) {
        router.replace("/club-setup");
        return;
      }

      if (memberships.length === 1) {
        writeCookie("active_club_id", memberships[0].club_id);
        router.replace("/");
        return;
      }

      const clubIds = memberships.map((membership) => membership.club_id);

      const { data: clubsData, error: clubsError } = await supabase
        .from("clubs")
        .select("id, display_name, logo_path")
        .in("id", clubIds);

      if (!isMounted) {
        return;
      }

      if (clubsError) {
        setErrorMessage("Die Teamdaten konnten nicht geladen werden.");
        setIsLoading(false);
        return;
      }

      const clubs = (clubsData ?? []) as ClubRow[];
      const clubsById = new Map<string, ClubRow>();
      clubs.forEach((club) => clubsById.set(club.id, club));

      const options: ClubOption[] = await Promise.all(
        memberships.map(async (membership) => {
          const club = clubsById.get(membership.club_id);
          let logoUrl: string | null = null;

          if (club?.logo_path) {
            const { data } = await supabase.storage
              .from("club-logos")
              .createSignedUrl(club.logo_path, 60 * 60);

            logoUrl = data?.signedUrl ?? null;
          }

          return {
            id: membership.club_id,
            display_name: club?.display_name?.trim() || "Dein Team",
            logo_url: logoUrl,
            role: membership.role,
          };
        })
      );

      if (!isMounted) {
        return;
      }

      setClubOptions(options);
      setIsLoading(false);
    }

    loadClubs();

    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleSelectClub(clubId: string) {
    setSubmittingClubId(clubId);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        router.replace("/login?next=/select-club");
        return;
      }

      const response = await fetch("/api/select-club", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          club_id: clubId,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            ok?: boolean;
            error?: string;
            club_id?: string;
            redirect_to?: string;
          }
        | null;

      if (!response.ok || !payload?.ok) {
        setErrorMessage("Das Team konnte nicht ausgewählt werden.");
        setSubmittingClubId(null);
        return;
      }

      writeCookie("active_club_id", payload.club_id || clubId);
      router.replace(payload?.redirect_to || "/");
      router.refresh();
    } catch {
      setErrorMessage("Das Team konnte nicht ausgewählt werden.");
      setSubmittingClubId(null);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-neutral-100">
        <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-4 py-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md rounded-[24px] border border-black/10 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-neutral-600">Teams werden geladen...</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-100">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="rounded-[24px] border border-slate-800/10 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.75)]">
          <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-5 py-6 text-center">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-white/10 ring-1 ring-white/15">
              <Image
                src="/icon-dark.png"
                alt="strikr Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Wähle dein Team.
            </h1>

            <p className="text-xs leading-5 text-white/75 sm:text-sm">
              Du bist mehreren Clubs zugeordnet. Wähle aus, mit welchem Team du
              jetzt arbeiten möchtest.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="mx-auto w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <section className="mx-auto w-full max-w-3xl">
          <div className="grid gap-3 sm:grid-cols-2">
            {clubOptions.map((club) => (
              <div
                key={club.id}
                className="rounded-[24px] border border-black/10 bg-white p-5 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white p-2 shadow-sm ring-1 ring-black/5">
                    {club.logo_url ? (
                      <Image
                        src={club.logo_url}
                        alt={`${club.display_name} Logo`}
                        width={64}
                        height={64}
                        className="h-full w-full object-contain"
                        unoptimized
                      />
                    ) : (
                      <div className="h-full w-full rounded-xl bg-slate-100" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-lg font-bold tracking-tight text-slate-950">
                      {club.display_name}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      Rolle: {club.role === "admin" ? "Admin" : "Mitglied"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectClub(club.id)}
                  disabled={submittingClubId === club.id}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingClubId === club.id
                    ? "Wird geöffnet..."
                    : "Mit diesem Team öffnen"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}